from flask import *
from urllib.parse import quote
import requests

from io import BytesIO
from zipfile import ZipFile
import base64

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


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/resources/<path:path>", methods=["GET"])
def get_resource(path):
    # Serve static files from back-end
    return send_from_directory("static", path)


@app.route("/templates/<path:template>", methods=["GET"])
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
        file_statuses((ok, id))

    succeeded_ids: list = [id for ok, id in file_statuses if ok]
    return (
        jsonify({"message": "Files uploaded successfully", "passed": succeeded_ids}),
        200,
    )


@app.route("/files/get", methods=["POST"])
def get_file():
    # Get a file matching given id
    keys = {"fileId"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    file_id: int = int(json_data["fileId"])
    file = working_db.get_file(file_id=file_id)

    if not file:
        return jsonify({"error": "No files found"}), 500

    return send_file(
        file,
        as_attachment=False,
        download_name=file.name,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@app.route("/files/get/all", methods=["POST"])
def get_all_files():
    # Get all files
    files = working_db.get_all_files()
    if not files:
        return jsonify({"error": "No files found"}), 500

    file_list = []
    for file in files:
        file_data = {
            "name": file.name,
            "content": base64.b64encode(file).decode(),  # Convert bytes to base64
        }
        file_list.append(file_data)

    return jsonify({"files": file_list})


@app.route("/files/get/all/compressed", methods=["POST"])
def get_all_files_zipped():
    # Get all files in a zip file
    files = working_db.get_all_files()
    if not files:
        return jsonify({"error": "No files found"}), 500

    # Construct a zip archive containing all files
    zip_data = BytesIO()
    with ZipFile(zip_data, "w") as zip_file:
        for index, file_blob in enumerate(files, start=1):
            zip_file.writestr(f"file_{index}.xlsx", file_blob)

    # Reset the file-like object's position to the beginning
    zip_data.seek(0)

    # Send the zip file to the client
    return send_file(
        zip_data,
        as_attachment=True,
        attachment_filename="files.zip",
        mimetype="application/zip",
    )


@app.route("/filters/add", methods=["POST"])
def add_filter():
    # Add a filter to the matching fileId
    keys = {"fileId"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        


if __name__ == "__main__":
    port = 5000
    app.run(port=port, debug=True)
