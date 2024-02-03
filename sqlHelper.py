from sqlite3 import Cursor, Connection, Error, connect
from enum import Enum
from typing import Optional, List, Tuple, List

import os
from werkzeug.datastructures import FileStorage


class Tables(Enum):
    File = "File"
    Filter = "Filter"
    FileFilter = "FileFilter"


class FileColumns(Enum):
    ID = "id"
    NAME = "name"
    EXT = "ext"
    BLOB = "blob"


class FilterColumns(Enum):
    ID = "id"
    METHOD = "method"
    INPUT = "input"
    ENABLED = "enabled"


class FileFilterColumns(Enum):
    FILE_ID = "file_id"
    FILTER_ID = "filter_id"
    SHEET = "sheet"
    COLUMN = "column"


class DB:
    def __init__(self, db_path: os.PathLike, auto_commit: bool = False):
        if auto_commit:
            isolation_level = None  # Auto-commit mode
        else:
            isolation_level = ""  # Default isolation level
        self.__conn: Connection = connect(db_path, isolation_level=isolation_level)
        self.init_tables()

    def conn(self) -> Connection:
        return self.__conn

    def cursor(self) -> Cursor:
        return self.conn().cursor()

    def init_tables(self):
        # Initialize tables
        c: Cursor = self.cursor()
        try:
            # Create File table
            c.execute(
                f"""CREATE TABLE IF NOT EXISTS {Tables.File.value}
                        ({FileColumns.ID.value} INTEGER PRIMARY KEY,
                        {FileColumns.NAME.value} TEXT,
                        {FileColumns.EXT.value} TEXT,
                        {FileColumns.BLOB.value} BLOB)"""
            )

            # Create Filter table
            c.execute(
                f"""CREATE TABLE IF NOT EXISTS {Tables.Filter.value}
                        ({FilterColumns.ID.value} INTEGER PRIMARY KEY,
                        {FilterColumns.METHOD.value} TEXT,
                        {FilterColumns.INPUT.value} TEXT,
                        {FilterColumns.ENABLED.value} INTEGER)"""
            )

            # Create Relationship table (Junction table)
            c.execute(
                f"""CREATE TABLE IF NOT EXISTS {Tables.FileFilter.value}
                        ({FileFilterColumns.FILE_ID.value} INTEGER,
                        {FileFilterColumns.FILTER_ID.value} INTEGER,
                        {FileFilterColumns.SHEET.value} INTEGER,
                        {FileFilterColumns.COLUMN.value} INTEGER,
                        FOREIGN KEY({FileFilterColumns.FILE_ID.value}) REFERENCES {Tables.File.value}({FileColumns.ID.value}),
                        FOREIGN KEY({FileFilterColumns.FILTER_ID.value}) REFERENCES {Tables.Filter.value}({FilterColumns.ID.value}),
                        UNIQUE({FileFilterColumns.FILE_ID.value}, {FileFilterColumns.FILTER_ID.value}))"""
            )

            self.__conn.commit()
        except Error as e:
            self.__conn.rollback()
            raise e

    def commit(self):
        self.__conn.commit()

    def rollback(self):
        self.conn().rollback()

    def close(self):
        self.__conn.close()

    def add_file(self, filename: str, file: FileStorage) -> Tuple[bool, str, int]:
        # Add the file_blob to database
        filename = os.path.basename(filename)
        name, ext = os.path.splitext(filename)
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""INSERT INTO {Tables.File.value} 
                ({FileColumns.NAME.value}, 
                {FileColumns.EXT.value}, 
                {FileColumns.BLOB.value})
                VALUES (?, ?, ?)""",
                (name, ext, file.read()),
            )

            file_id = c.lastrowid
            self.commit()
            return True, f"Added {name} successfully", file_id
        except Error as e:
            self.rollback()
            return False, f"Failed to add {name}: {e}", None

    def add_filter(
        self, method: str, input: str, enabled: bool
    ) -> Tuple[bool, str, int]:
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""INSERT INTO {Tables.Filter.value} 
                ({FilterColumns.METHOD.value}, 
                {FilterColumns.INPUT.value}, 
                {FilterColumns.ENABLED.value})
                VALUES (?, ?, ?)""",
                (method, input, enabled),
            )

            filter_id = c.lastrowid
            self.commit()
            return True, f"Added filter successfully", filter_id
        except Error as e:
            self.rollback()
            return False, f"Failed to add filter: {e}", None

    def file_filter_relationship(
        self, file_id: int, filter_id: int, sheet: int, column: int
    ) -> Tuple[bool, str]:
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""INSERT INTO {Tables.FileFilter.value} 
                ({FileFilterColumns.FILE_ID.value},
                {FileFilterColumns.FILTER_ID.value},
                {FileFilterColumns.SHEET.value},
                {FileFilterColumns.COLUMN.value})
                VALUES (?, ?, ?, ?)""",
                (file_id, filter_id, sheet, column),
            )
            self.commit()
            return True, f"Relationship created successfully"
        except Error as e:
            self.rollback()
            return False, f"Failed to create relationship: {e}"

    def get_file(self, file_id) -> Optional[FileStorage]:
        # Return file blob as FileStorage
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT 
                {FileColumns.BLOB.value}, 
                {FileColumns.NAME.value},
                {FileColumns.EXT.value} 
                FROM {Tables.File.value}
                WHERE {FileColumns.ID.value}=?""",
                (file_id,),
            )
            blob, name, ext = c.fetchone()
            return FileStorage(
                blob, filename=name + ext, content_type="application/octet-stream"
            )
        except Error as e:
            return None  # Failed to fetch file

    def get_file_name(self, file_id) -> Optional[tuple[str, str]]:
        # Return file name and ext
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT 
                {FileColumns.NAME.value},
                {FileColumns.EXT.value} 
                FROM {Tables.File.value}
                WHERE {FileColumns.ID.value}=?""",
                (file_id,),
            )
            name, ext = c.fetchone()
            return name, ext
        except Error as e:
            return None  # Failed to fetch file

    def get_all_files(self) -> Optional[List[dict]]:
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT 
                    {FileColumns.ID.value}, 
                    {FileColumns.NAME.value},
                    {FileColumns.EXT.value} 
                    FROM {Tables.File.value}"""
            )

            files: List[dict] = [
                {
                    "id": id,
                    "name": name,
                    "ext": ext,
                }
                for id, name, ext in c.fetchall()
            ]

            return files
        except Error as e:
            return None  # Failed to fetch files

    def get_all_file_ids(self) -> Optional[List[int]]:
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT 
                    {FileColumns.ID.value}
                    FROM {Tables.File.value}"""
            )
            rows = c.fetchall()
            files: List[int] = [id for id, *_ in rows]
            return files
        except Error as e:
            return None  # Failed to fetch files

    def get_filter(self, filter_id) -> Optional[dict]:
        # Return a json representing filter data
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT {FilterColumns.INPUT.value}, 
                {FilterColumns.METHOD.value}, 
                {FilterColumns.ENABLED.value}, 
                {FileFilterColumns.COLUMN.value}
                FROM {Tables.Filter.value}
                LEFT JOIN {Tables.FileFilter.value}
                ON {Tables.Filter.value}.{FilterColumns.ID.value} = {Tables.FileFilter.value}.{FileFilterColumns.FILTER_ID.value}
                WHERE {FilterColumns.ID.value}=?""",
                (filter_id,),
            )
            input, method, enabled, column = c.fetchone()
            data: dict = {
                "input": input,
                "method": method,
                "enabled": enabled == 1,  # Convert to bool
                "column": column,
            }
            return data
        except Exception as e:
            return None  # Filter not found

    def get_sheets_filters(self, file_id, sheet) -> Optional[List[dict]]:
        # Return a json representing a list of filter data's
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT {FilterColumns.INPUT.value}, 
                {FilterColumns.METHOD.value}, 
                {FilterColumns.ENABLED.value}, 
                {Tables.FileFilter.value}.{FileFilterColumns.COLUMN.value}
                FROM {Tables.Filter.value}
                LEFT JOIN {Tables.FileFilter.value}
                ON {Tables.Filter.value}.{FilterColumns.ID.value} = {Tables.FileFilter.value}.{FileFilterColumns.FILTER_ID.value}
                WHERE {Tables.FileFilter.value}.{FileFilterColumns.FILE_ID.value}=? AND {Tables.FileFilter.value}.{FileFilterColumns.SHEET.value}=?""",
                (
                    file_id,
                    sheet,
                ),
            )

            filters_data = []
            for input, method, enabled, column in c.fetchall():
                filters_data.append(
                    {
                        "input": input,
                        "method": method,
                        "enabled": enabled == 1,  # Convert to bool
                        "column": column,
                    }
                )
            return filters_data
        except Exception as e:
            return None  # Filters not found

    def update_filter(self, filter_id, method: str, input: str, enabled: bool) -> bool:
        # Update filter data matching id
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""UPDATE {Tables.FILTER.value}
                SET {FilterColumns.INPUT.value} = ?,
                    {FilterColumns.METHOD.value} = ?,
                    {FilterColumns.ENABLED.value} = ?
                WHERE {FilterColumns.ID.value} = ?""",
                (input, method, enabled, filter_id),
            )

            self.commit()
            if c.rowcount > 0:
                return True
            return False
        except Exception as e:
            self.rollback()
            return False  # Filter not found

    def delete_filter(self, filter_id) -> bool:
        # Delete filter record matching id
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""DELETE FROM {Tables.FILTER.value}
                WHERE {FilterColumns.ID.value} = ?""",
                (filter_id,),
            )

            self.commit()
            if c.rowcount > 0:
                return True
            return False
        except Exception as e:
            self.rollback()
            return False  # Filter not found

    def update_file(
        self, file_id, filename: str, file: FileStorage
    ) -> Tuple[bool, str, int]:
        # Update the file_blob in database at the given id
        filename = os.path.basename(filename)
        name, ext = os.path.splitext(filename)
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""UPDATE {Tables.File.value}
                SET {FileColumns.NAME.value} = ?,
                    {FileColumns.EXT.value} = ?,
                    {FileColumns.BLOB.value} = ?
                WHERE {FileColumns.ID.value} = ?""",
                (name, ext, file.read(), file_id),
            )

            self.commit()

            return c.rowcount > 0, f"Updated {name} successfully", file_id
        except Error as e:
            self.rollback()
            return False, f"Failed to update {name}: {e}", file_id

    def update_file_name(self, file_id, name, ext) -> Tuple[bool, str, int]:
        # Update the file name and ext in database at the given id
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""UPDATE {Tables.File.value}
                SET {FileColumns.NAME.value} = ?,
                    {FileColumns.EXT.value} = ?
                WHERE {FileColumns.ID.value} = ?""",
                (name, ext, file_id),
            )

            self.commit()

            return c.rowcount > 0, f"Updated {name} successfully", file_id
        except Error as e:
            self.rollback()
            return False, f"Failed to update {name}: {e}", file_id

    def delete_file(self, file_id) -> bool:
        # Delete file record matching id
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""DELETE FROM {Tables.File.value}
                WHERE {FileColumns.ID.value} = ?""",
                (file_id,),
            )

            self.commit()
            if c.rowcount > 0:
                return True
            return False
        except Exception as e:
            self.rollback()
            return False  # File not found


def init_db(parent: os.PathLike, db_name: str) -> os.PathLike:
    # Initialize DB and return path
    if parent and not os.path.exists(parent):
        os.mkdir(parent)

    db_path: str = os.path.join(parent, db_name) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(db_path):
        with open(db_path, "a"):
            pass

    tmp = DB(db_path)
    tmp.commit()
    tmp.close()

    return db_path
