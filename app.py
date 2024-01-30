from flask import *
from urllib.parse import quote
import requests

from io import BytesIO

import os
import shutil
import tempfile
import pandas as pd

from sqlHelper import *

app = Flask(__name__, static_folder="static", template_folder="templates")

APP_FOLDER: str = tempfile.mkdtemp()
app.config["APP_FOLDER"] = APP_FOLDER

working_db: DB = initDB(parent=app.config["APP_FOLDER"], dbName="files")
# Open directory TODO: Remove this after finishing
os.startfile(app.config["APP_FOLDER"])


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


@app.route("/files/upload", methods=["POST"])
def file_upload():
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

    return jsonify(msg), 200
