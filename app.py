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

UPLOAD_FOLDER: str = tempfile.mkdtemp()
readers = {
    ".csv": pd.read_csv,
    ".xlsx": pd.read_excel,
    ".ods": pd.read_excel,
}
ALLOWED_EXTENSIONS: set = set(readers.keys())

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


# Helper methods
def is_valid_ext(filename: str) -> bool:
    global ALLOWED_EXTENSIONS
    _, ext = os.path.splitext(os.path.basename(filename))  # discard name
    if not ext:
        return False  # No extension isn't valid.

    return ext in ALLOWED_EXTENSIONS
