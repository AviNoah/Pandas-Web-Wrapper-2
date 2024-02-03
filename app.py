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
    return render_template("main/index.html")


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
    global ALLOWED_EXTENSIONS
    try:
        file_blobs: list = list(request.files.values())
        indices: list = request.form.getlist("index")
    except Exception as e:
        return jsonify({"error": "Failed to retrieve files from form"}), 500

    files = list(zip(file_blobs, indices))

    passed = [
        id for file, id in files if isAValidExt(file.filename, ALLOWED_EXTENSIONS)
    ]
    data = {"acceptedIndices": passed}
    return jsonify(data), 200


@app.route("/files/upload", methods=["POST"])
def upload_file():
    # Save files into database.
    try:
        files: list = list(request.files.values())
    except Exception as e:
        return jsonify({"error": "Failed to retrieve files from form"}), 500

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


@app.route("/files/update", methods=["POST"])
def update_file():
    # Update files at the given ids.
    try:
        file_blobs: list = list(request.files.values())
        indices: list = request.form.getlist("index")
    except Exception as e:
        return jsonify({"error": "Failed to retrieve files from form"}), 500

    files = zip(file_blobs, indices)
    file_statuses: list = list()
    for file, file_id in files:
        ok, msg, id = DB.update_file(file_id, file.name, file)
        print(msg)
        file_statuses((ok, id))

    succeeded_ids: list = [id for ok, id in file_statuses if ok]
    failed_ids: list = [id for ok, id in file_statuses if not ok]

    return (
        jsonify(
            {
                "message": "Files updated successfully",
                "passed": succeeded_ids,
                "failed": failed_ids,
            }
        ),
        200,
    )


@app.route("/files/delete", methods=["POST"])
def delete_file():
    # Delete the file at the given id
    keys = {"fileId"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    file_id: int = int(json_data["fileId"])
    ok = DB.delete_file(file_id)

    if ok:
        return jsonify({"message": "Successfully deleted file"}), 200

    return jsonify({"error": "Failed to delete file"}), 500


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
    keys = {"fileId", "sheet", "method", "input"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    file_id, sheet, method, input = (
        json_data["fileId"],
        json_data["sheet"],
        json_data["method"],
        json_data["input"],
    )

    filter_id = DB.add_filter(method, input)
    ok, msg = DB.file_filter_relationship(file_id, filter_id, sheet)
    if ok:
        return jsonify({"message": msg}), 200

    return jsonify({"error": msg}), 500


@app.route("/filters/get", methods=["POST"])
def get_filter():
    # Return the filter matching given id as a json
    keys = {"filterId"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    filter_id = json_data["filterId"]

    filter_json: str = DB.get_filter(filter_id)
    if not filter_json:
        return jsonify({"error": "Failed to fetch filter"}), 500

    return filter_json, 200


@app.route("/filters/get/for_sheet", methods=["POST"])
def get_filter_for_sheet():
    # Return all the filters of the given fileId and sheet
    keys = {"fileId", "sheet"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    file_id = json_data["fileId"]
    sheet = json_data["sheet"]

    filters_json: str = DB.get_sheets_filters(file_id, sheet)
    if not filters_json:
        return jsonify({"error": "Failed to fetch filter"}), 500

    return filters_json, 200


@app.route("/filters/update", methods=["POST"])
def update_filter():
    # Update a filter matching the given id.
    keys = {"filterId", "method", "input"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    filter_id, method, input = (
        json_data["filterId"],
        json_data["method"],
        json_data["input"],
    )

    ok = DB.update_filter(filter_id, method, input)
    if ok:
        return jsonify({"message": "Filter updated successfully"}), 200

    return jsonify({"error": "Filter failed to update"}), 200


@app.route("/filters/delete", methods=["POST"])
def delete_filter():
    # Delete a filter matching the given id.
    keys = {"filterId"}

    json_data = request.get_json()
    if not verifyKeys(json_data, keys):
        return jsonify({"error": "Missing one or more required keys"}), 400

    filter_id = json_data["filterId"]

    ok = DB.delete_filter(filter_id)
    if ok:
        return jsonify({"message": "Filter deleted successfully"}), 200

    return jsonify({"error": "Filter failed to delete"}), 200


if __name__ == "__main__":
    port = 5000
    app.run(port=port, debug=True)
