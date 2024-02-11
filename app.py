from flask import *

from io import BytesIO
from zipfile import ZipFile
from werkzeug.datastructures import FileStorage

import os

from sqlHelper import DB, init_db
from helperMethods import (
    isAValidExt,
    isAValidFileName,
    verifyKeys,
    readFile,
    sendDF,
    applyFilters,
)

app = Flask(__name__, static_folder="static", template_folder="templates")

APP_FOLDER: str = ""
db_path: os.PathLike = init_db(parent=APP_FOLDER, db_name="files")
db: DB = DB(db_path)  # Create a global DB instance.


class static_servers:
    # Serving methods
    @app.route("/", methods=["GET"])
    def index():
        return render_template("main/index.html")

    @app.route("/resources/<path:path>", methods=["GET"])
    def get_resource(path):
        # Serve static files from back-end
        return send_from_directory("static", path)

    @app.route("/scripts/<path:path>", methods=["GET"])
    def get_scripts(path):
        # Serve static files from back-end
        return send_from_directory("static/javascripts", path)

    @app.route("/styles/<path:path>", methods=["GET"])
    def get_styles(path):
        # Serve static files from back-end
        return send_from_directory("static/styles", path)

    @app.route("/images/<path:path>", methods=["GET"])
    def get_images(path):
        # Serve static files from back-end
        return send_from_directory("static/images", path)

    @app.route("/templates/<path:template>", methods=["GET"])
    def get_template(template):
        # Serve template files from back-end
        return render_template(template)


class file_management:
    # Methods to manage files
    @app.route("/files/validate", methods=["POST"])
    def validate_files():
        try:
            file_blobs: list = list(request.files.values())
            indices: list = request.form.getlist("index")
        except Exception as e:
            return jsonify({"error": "Failed to retrieve files from form"}), 500

        files = list(zip(file_blobs, indices))

        passed = [id for file, id in files if isAValidExt(file.filename)]
        data = {"acceptedIndices": passed}
        return jsonify(data), 200

    @app.route("/files/upload", methods=["POST"])
    def upload_file():
        global db
        # Save files into database.
        try:
            files: list = list(request.files.values())
        except Exception as e:
            return jsonify({"error": "Failed to retrieve files from form"}), 500

        file_statuses: list = list()
        for file in files:
            ok, msg, id = db.add_file(file.filename, file)
            print(msg)
            file_statuses.append((ok, id))

        succeeded_ids: list = [id for ok, id in file_statuses if ok]
        return (
            jsonify(
                {"message": "Files uploaded successfully", "passed": succeeded_ids}
            ),
            200,
        )

    @app.route("/files/update", methods=["POST"])
    def update_file():
        global db
        # Update files at the given ids.
        try:
            file_blobs: list = list(request.files.values())
            indices: list = request.form.getlist("index")
        except Exception as e:
            return jsonify({"error": "Failed to retrieve files from form"}), 500

        files = zip(file_blobs, indices)
        file_statuses: list = list()
        for file, file_id in files:
            ok, msg, id = db.update_file(file_id, file.filename, file)
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

    @app.route("/files/update/name/validate", methods=["POST"])
    def validate_file_name():
        # Update files at the given ids.
        keys = {"filename"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        filename = json_data["filename"]

        filename = os.path.basename(filename)

        if isAValidFileName(filename):
            return (
                jsonify({"message": "File name is valid", "name": filename}),
                200,
            )

        return jsonify({"error": "Invalid name"}), 500

    @app.route("/files/update/name", methods=["POST"])
    def update_file_name():
        global db
        # Update files at the given ids.
        keys = {"fileId", "name"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id, name = json_data["fileId"], json_data["name"]
        isOk, msg = db.update_file_name(file_id, name)

        if isOk:
            return jsonify({"message": msg}), 200

        return jsonify({"error": msg}), 500

    @app.route("/files/delete", methods=["POST"])
    def delete_file():
        global db
        # Delete the file at the given id
        keys = {"fileId"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id: int = int(json_data["fileId"])
        ok, msg = db.delete_file(file_id)

        if ok:
            return jsonify({"message": msg}), 200

        return jsonify({"error": msg}), 500


class file_fetching:
    # Methods to fetch file data
    @app.route("/files/get/download", methods=["POST"])
    def download_file():
        global db
        # Download a file matching given id
        keys = {"fileId"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id: int = int(json_data["fileId"])
        file: FileStorage = db.get_file(file_id=file_id)

        if not file:
            return jsonify({"error": "No files found"}), 500

        file = BytesIO(file.stream)  # Convert to BytesIO object
        file.seek(0)  # Point to start of file

        return send_file(
            file,
            as_attachment=True,
            download_name="excel_file",
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

    @app.route("/files/get/name", methods=["POST"])
    def get_file_name():
        global db
        # Get a file name matching given id
        keys = {"fileId"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id: int = int(json_data["fileId"])
        filename = db.get_file_name(file_id=file_id)

        if not filename:
            return jsonify({"error": "No files found"}), 500

        name, ext = filename
        return jsonify(
            {"message": "Fetched filename successfully", "name": name, "ext": ext}
        )

    @app.route("/files/get/sheet", methods=["POST"])
    def get_sheet():
        global db
        # Get a sheet matching given id and sheet
        keys = {"fileId", "sheet"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id: int = int(json_data["fileId"])
        sheet: int = int(json_data["sheet"])

        file: FileStorage = db.get_file(file_id)

        if not file:
            return jsonify({"error": "No files found"}), 500

        sheets: dict = readFile(file)

        if not sheets:
            return jsonify({"error": "No sheets found in file"}), 200  # File is empty

        sheets: list = list(sheets.values())
        df = sheets[sheet]

        filters: list = db.get_sheets_filters(file_id, sheet)
        if filters:
            df = applyFilters(df, filters)  # Only if not empty or None

        return sendDF(df)

    @app.route("/files/get/sheet_count", methods=["POST"])
    def get_sheet_count():
        global db
        # Get a sheet matching given id and sheet
        keys = {"fileId"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id: int = int(json_data["fileId"])
        file: FileStorage = db.get_file(file_id)

        if not file:
            return jsonify({"error": "No files found"}), 500

        sheets: dict = readFile(file)
        sheet_count: int = len(sheets)

        return jsonify({"sheets": sheet_count}), 200

    @app.route("/files/get/all", methods=["GET"])
    def get_all_files():
        global db
        # Get all files
        files: list = db.get_all_file_ids()

        if not files:
            return jsonify({"error": "No files found"}), 500

        return jsonify(files)

    @app.route("/files/get/all/compressed", methods=["GET"])
    def get_all_files_zipped():
        global db
        # Get all files in a zip file
        files = db.get_all_files()

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


class filter_management:
    # Filter management
    @app.route("/filters/add", methods=["POST"])
    def add_filter():
        global db
        # Add a filter to the matching fileId
        keys = {"fileId", "sheet", "column", "method", "input", "enabled"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id, sheet, column, method, input, enabled = (
            json_data["fileId"],
            json_data["sheet"],
            json_data["column"],
            json_data["method"],
            json_data["input"],
            json_data["enabled"],
        )

        isOk, msg, filter_id = db.add_filter(method, input, enabled)

        # Check if added successfully
        if not isOk:
            return jsonify({"error": msg}), 500

        isOk, msg = db.file_filter_relationship(file_id, filter_id, sheet, column)

        if isOk:
            return jsonify({"message": msg, "filterId": filter_id}), 200

        return jsonify({"error": msg}), 500

    @app.route("/filters/update", methods=["POST"])
    def update_filter():
        global db
        # Update a filter matching the given id.
        keys = {"filterId", "method", "input", "enabled"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        filter_id, method, input, enabled = (
            json_data["filterId"],
            json_data["method"],
            json_data["input"],
            json_data["enabled"],
        )
        isOk, msg = db.update_filter(filter_id, method, input, enabled)

        if isOk:
            return jsonify({"message": msg}), 200

        return jsonify({"error": msg}), 200

    @app.route("/filters/delete", methods=["POST"])
    def delete_filter():
        global db
        # Delete a filter matching the given id.
        keys = {"filterId"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        filter_id = json_data["filterId"]
        ok, msg = db.delete_filter(filter_id)

        if ok:
            return jsonify({"message": msg}), 200

        return jsonify({"error": msg}), 200


class filter_fetching:
    # Fetching filter data
    @app.route("/filters/get", methods=["POST"])
    def get_filter():
        global db
        # Return the filter matching given id as a json
        keys = {"filterId"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        filter_id = json_data["filterId"]
        filter_json: str = db.get_filter(filter_id)

        if not filter_json:
            return jsonify({"error": "Failed to fetch filter"}), 500

        return filter_json, 200

    @app.route("/filters/get/at", methods=["POST"])
    def get_filters_at():
        global db
        # Return all the filters of the given fileId and sheet
        keys = {"fileId", "sheet", "column"}

        json_data = request.get_json()
        if not verifyKeys(json_data, keys):
            return jsonify({"error": "Missing one or more required keys"}), 400

        file_id = json_data["fileId"]
        sheet = json_data["sheet"]
        column = json_data["column"]

        filters_json: str = db.get_filters_at(file_id, sheet, column)

        if filters_json is None:
            return jsonify({"error": "Failed to fetch filter"}), 500

        return filters_json, 200


if __name__ == "__main__":
    port = 5000
    app.run(port=port, debug=True)
