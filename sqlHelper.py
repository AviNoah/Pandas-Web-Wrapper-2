from sqlite3 import Cursor, Connection, Error, connect
from enum import Enum
from typing import Optional, List, Tuple

import os
import json


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


class FileFilterColumns(Enum):
    FILE_ID = "file_id"
    FILTER_ID = "filter_id"
    SHEET = "sheet"


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
                        {FilterColumns.INPUT.value} TEXT)"""
            )

            # Create Relationship table (Junction table)
            c.execute(
                f"""CREATE TABLE IF NOT EXISTS {Tables.FileFilter.value}
                        ({FileFilterColumns.FILE_ID.value} INTEGER,
                        {FileFilterColumns.FILTER_ID.value} INTEGER,
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

    def add_file(self, filename: str, file_blob: bytes) -> Tuple[bool, str, int]:
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
                (name, ext, file_blob),
            )

            file_id = c.lastrowid
            self.commit()
            return True, f"Added {name} successfully", file_id
        except Error as e:
            self.rollback()
            return False, f"Failed to add {name}: {e}", None

    def add_filter(self, method: str, input: str) -> Tuple[bool, str, int]:
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""INSERT INTO {Tables.Filter.value} 
                ({FilterColumns.METHOD.value}, 
                {FilterColumns.INPUT.value})
                VALUES (?, ?)""",
                (method, input),
            )

            filter_id = c.lastrowid
            self.commit()
            return True, f"Added filter successfully", filter_id
        except Error as e:
            self.rollback()
            return False, f"Failed to add filter: {e}", None

    def file_filter_relationship(
        self, file_id: int, filter_id: int, sheet: int
    ) -> Tuple[bool, str]:
        c: Cursor = self.cursor()
        try:
            c.execute(
                f"""INSERT INTO {Tables.FileFilter.value} 
                ({FileFilterColumns.FILE_ID.value},
                {FileFilterColumns.FILTER_ID.value},
                {FileFilterColumns.SHEET.value})
                VALUES (?, ?, ?)""",
                (file_id, filter_id, sheet),
            )
            self.commit()
            return True, f"Relationship created successfully"
        except Error as e:
            self.rollback()
            return False, f"Failed to create relationship: {e}"

    def get_file(self, file_id) -> Optional[bytes]:
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT {FileColumns.BLOB.value} FROM {Tables.File.value}
                     WHERE {FileColumns.ID}=?""",
                (file_id,),
            )
            blob = c.fetchone()[0]
            return blob
        except Error as e:
            return None  # Failed to fetch file

    def get_all_files(self) -> Optional[List[bytes]]:
        c: Cursor = self.cursor()

        try:
            c.execute(f"""SELECT {FileColumns.BLOB.value} FROM {Tables.File.value}""")
            blobs = [record[0] for record in c.fetchall()]
            return blobs
        except Error as e:
            return None  # Failed to fetch files

    def get_filter(self, filter_id) -> Optional[str]:
        # Return a json representing filter data
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT ({FilterColumns.INPUT.value}, {FilterColumns.METHOD.value})
                FROM {Tables.Filter.value}
                WHERE {FilterColumns.ID.value}=?""",
                (filter_id,),
            )
            input, method = c.fetchone()
            data: dict = {"input": input, "method": method}
            return json.dumps(data)
        except Exception as e:
            return None  # Filter not found

    def get_sheets_filters(self, file_id, sheet) -> Optional[str]:
        # Return a json representing a list of filter data's
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""SELECT {FilterColumns.INPUT.value}, {FilterColumns.METHOD.value}
                FROM {Tables.Filter.value}
                WHERE {FileFilterColumns.FILE_ID.value}=? AND {FileFilterColumns.SHEET.value}=?""",
                (file_id, sheet),
            )

            filters_data = []
            for input, method in c.fetchall():
                filters_data.append({"input": input, "method": method})
            return json.dumps(filters_data)
        except Exception as e:
            return None  # Filters not found

    def update_filter(self, filter_id, method: str, input: str) -> bool:
        # Update filter data matching id
        c: Cursor = self.cursor()

        try:
            c.execute(
                f"""UPDATE {Tables.FILTER.value}
                SET {FilterColumns.INPUT.value} = ?,
                    {FilterColumns.METHOD.value} = ?
                WHERE {FilterColumns.ID.value} = ?""",
                (input, method, filter_id),
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
        self, file_id, filename: str, file_blob: bytes
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
                (name, ext, file_blob, file_id),
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


def init_db(parent: os.PathLike, db_name: str) -> DB:
    if not os.path.exists(parent):
        os.mkdir(parent)

    db_path: str = os.path.join(parent, db_name) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(db_path):
        with open(db_path, "a"):
            pass

    return DB(db_path)
