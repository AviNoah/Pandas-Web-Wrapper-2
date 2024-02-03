# Helper methods

import os
import pandas as pd
from werkzeug.datastructures import FileStorage

from flask import jsonify, Response, send_file
from typing import Optional

from io import BytesIO

readers = {
    ".csv": pd.read_csv,
    ".xlsx": pd.read_excel,
    ".ods": pd.read_excel,
}
ALLOWED_EXTENSIONS: set = set(readers.keys())


def isAValidExt(filename: str) -> bool:
    global ALLOWED_EXTENSIONS
    _, ext = os.path.splitext(os.path.basename(filename))  # discard name
    if not ext:
        return False  # No extension isn't valid.

    return ext in ALLOWED_EXTENSIONS


def verifyKeys(json, key_set: set) -> bool:
    # Verifies if json contains every key from the given set
    return json and key_set.issubset(json.keys())


def readFile(file: FileStorage, ext: str = None) -> Optional[dict[pd.DataFrame]]:
    try:
        if not ext:
            ext = os.path.splitext(file.filename)[1]  # Try to find ext

        df: dict[pd.DataFrame] = readers[ext](file, sheet_name=None)
        return df
    except Exception as e:
        print(e)
        return None


def send_df(df: pd.DataFrame) -> Response:
    try:
        # Save the DataFrame to BytesIO using openpyxl as the engine
        output = BytesIO()
        df.to_excel(output, engine="openpyxl", index=False)
        output.seek(0)  # Move to beginning of file

        response = send_file(
            output,
            as_attachment=False,
            download_name="sheet.xlsx",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        return response
    except Exception as e:
        return jsonify({"error": e}), 500
