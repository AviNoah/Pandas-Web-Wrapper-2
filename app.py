from flask import *
from urllib.parse import quote
import requests

from io import BytesIO

import os
import shutil
import tempfile
import pandas as pd

from sqlHelper import DB, init_db
from helperMethods import isAValidExt, verifyKeys

app = Flask(__name__, static_folder="static", template_folder="templates")

APP_FOLDER: str = tempfile.mkdtemp()
app.config["APP_FOLDER"] = APP_FOLDER

working_db: DB = init_db(parent=app.config["APP_FOLDER"], db_name="files")
# Open directory TODO: Remove this after finishing
# os.startfile(app.config["APP_FOLDER"])


readers = {
    ".csv": pd.read_csv,
    ".xlsx": pd.read_excel,
    ".ods": pd.read_excel,
}
ALLOWED_EXTENSIONS: set = set(readers.keys())


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/resources/<path:path>")
def get_resource(path):
    # Serve static files from back-end
    return send_from_directory("static", path)


@app.route("/templates/<path:template>")
def get_template(template):
    # Serve template files from back-end
    return render_template(template)


@app.route("/files/validate", methods=["POST"])
def validate_files():
    try:
        file_blobs: list = list(request.files.values())
        indices: list = request.form.getlist("index")
    except Exception as e:
        return jsonify({"error": "Failed to retrieve files from form"}), 500

    files = zip(file_blobs, indices)

    passed = [id for file, id in files if isAValidExt(file.name)]
    data = {"acceptedIndices": passed}
    return jsonify(data), 200


@app.route("/files/upload", methods=["POST"])
def upload_file():
    # Save files into database.
    files: list = list(request.files.values())
    file_statuses: list = list()
    for file in files:
        ok, msg, id = DB.addFile(file.name, file)
        print(msg)
        file_statuses((ok, file.name))

    failed: list = [name for ok, name in file_statuses if not ok]
    succeeded: list = [name for ok, name in file_statuses if ok]

    msg = f"Files uploaded successfully: {''.join(succeeded)}\n"
    msg += f"Files that failed uploading: {''.join(failed)}\n"
    msg += f"Files that were dropped for being invalid: {''.join(dropped)}"

    return jsonify(msg), 200


@app.route("/files/get", methods=["POST"])
def get_file():
    # Get a file matching given id
    keys = {"fileId"}

    json_data = request.get_json()
    if verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    file_id: int = int(json_data["fileId"])
    file = working_db.get_file(file_id=file_id)
    return send_file(
        file,
        as_attachment=False,
        download_name=file.name,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


if __name__ == "__main__":
    port = 5000
    app.run(port=port, debug=True)
