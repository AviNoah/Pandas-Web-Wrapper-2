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
readers = {
    ".csv": pd.read_csv,
    ".xlsx": pd.read_excel,
    ".ods": pd.read_excel,
}
ALLOWED_EXTENSIONS: set = set(readers.keys())

app.config["APP_FOLDER"] = APP_FOLDER

working_db: DB = initDB(parent=app.config["APP_FOLDER"], dbName="files")
# Open directory TODO: Remove this after finishing
os.startfile(app.config["APP_FOLDER"])


@app.route("/files/upload", methods=["POST"])
def file_upload():
    # Save files into database.
    files: list = list(request.files.values())

    for file in files:
        ...
