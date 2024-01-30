import sqlite3
from sqlite3 import Cursor, Connection
import os

from enum import Enum


class tables(Enum):
    File: "File"
    Filter: "Filter"
    FileFilter: "FileFilter"


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
    def __init__(self, DB_Path: os.PathLike, auto_commit: bool = False):
        if auto_commit:
            isolation_level = None  # Auto-commit mode
        else:
            isolation_level = ""  # Default isolation level
        self.__conn: Connection = sqlite3.connect(
            DB_Path, isolation_level=isolation_level
        )
        self.initTables()

    def conn(self):
        return self.__conn

    def initTables(self):
        # Initialize tables
        c: Cursor = self.conn().cursor()

        # Create File table
        c.execute(
            f"""CREATE TABLE IF NOT EXISTS {tables.File.value}
                    ({FileColumns.ID.value} INTEGER PRIMARY KEY,
                    {FileColumns.NAME.value} TEXT,
                    {FileColumns.EXT.value} TEXT,
                    {FileColumns.BLOB.value} BLOB)"""
        )

        # Create Filter table
        c.execute(
            f"""CREATE TABLE IF NOT EXISTS {tables.Filter.value}
                    ({FilterColumns.ID.value} INTEGER PRIMARY KEY,
                    {FilterColumns.METHOD.value} TEXT,
                    {FilterColumns.INPUT.value} TEXT)"""
        )

        # Create Relationship table (Junction table)
        c.execute(
            f"""CREATE TABLE IF NOT EXISTS {tables.FileFilter.value}
                    ({FileFilterColumns.FILTER_ID.value} INTEGER,
                    {FileFilterColumns.FILE_ID.value} INTEGER,
                    FOREIGN KEY({FileFilterColumns.FILTER_ID.value}) REFERENCES {tables.Filter.value}({FilterColumns.ID.value}),
                    FOREIGN KEY({FileFilterColumns.FILE_ID.value}) REFERENCES {tables.File.value}({FileColumns.ID.value}),
                    UNIQUE({FileFilterColumns.FILTER_ID.value}, {FileFilterColumns.FILE_ID.value}))"""
        )

        self.__conn.commit()

    def commit(self):
        self.__conn.commit()

    def close(self):
        self.__conn.close()

    # CRUD operation helpers

    def addFile(self, filename, fileBlob) -> (bool, str, int):
        # Add the fileBlob to database
        filename = os.path.basename(filename)
        name, ext = os.path.splitext(filename)

        c: Cursor = self.conn().cursor()

        try:
            c.execute(
                f"""INSERT INTO File 
                ({FileColumns.NAME.value}, 
                {FileColumns.EXT.value}, 
                {FileColumns.BLOB.value})
                VALUES (?, ?, ?)""",
                (name, ext, fileBlob),
            )

            file_id = c.lastrowid

            return True, f"Added {name} successfully", file_id
        except sqlite3.Error as e:
            return False, f"Failed to add {name}: {e}", None

    def addFilter(self, method: str, input: str) -> (bool, str, int):
        c: Cursor = self.conn().cursor()

        try:
            c.execute(
                f"""INSERT INTO Filter 
                ({FilterColumns.METHOD.value}, 
                {FilterColumns.INPUT.value})
                VALUES (?, ?)""",
                (method, input),
            )

            filter_id = c.lastrowid

            return True, f"Added filter successfully", filter_id
        except sqlite3.Error as e:
            return False, f"Failed to add filter: {e}", None

    def fileFilterRelationship(self, fileID: int, filterID: int) -> (bool, str):
        c: Cursor = self.conn()

        try:
            c.execute(
                f"""INSERT INTO File 
                ({FileFilterColumns.FILE_ID.value},
                {FileFilterColumns.FILE_ID.value})
                VALUES (?, ?)""",
                (fileID, filterID),
            )

            return True, f"Relationship created successfully"
        except sqlite3.Error as e:
            return False, f"Failed to create relationship: {e}"


def initDB(parent: os.PathLike, dbName: str) -> DB:
    if not os.path.exists(parent):
        os.mkdir(parent)

    DB_path: str = os.path.join(parent, dbName) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(DB_path):
        with open(DB_path, "a"):
            pass

    return DB(DB_path)
