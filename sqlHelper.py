import sqlite3
import os

from enum import Enum


class FileColumns(Enum):
    ID = "id"
    FILE_NAME = "name"
    FILE_EXT = "ext"
    FILE_BLOB = "blob"


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
        self.__conn: sqlite3.Connection = sqlite3.connect(
            DB_Path, isolation_level=isolation_level
        )
        self.initTables()

    def conn(self):
        return self.__conn

    def initTables(self):
        # Initialize tables
        c = self.conn().cursor()

        # Create File table
        c.execute(
            """CREATE TABLE IF NOT EXISTS File
                    (id INTEGER PRIMARY KEY,
                    name TEXT,
                    ext TEXT,
                    blob BLOB)"""
        )

        # Create Filter table
        c.execute(
            """CREATE TABLE IF NOT EXISTS Filter
                    (id INTEGER PRIMARY KEY,
                    method TEXT,
                    input TEXT)"""
        )

        # Create Relationship table (Junction table)
        c.execute(
            """CREATE TABLE IF NOT EXISTS FileFilter
                    (filter_id INTEGER,
                    file_id INTEGER,
                    FOREIGN KEY(filter_id) REFERENCES Filter(id),
                    FOREIGN KEY(file_id) REFERENCES File(id),
                    UNIQUE(filter_id, file_id))"""
        )

        self.__conn.commit()

    def commit(self):
        self.__conn.commit()

    def close(self):
        self.__conn.close()

    @staticmethod
    def addFile(filename, fileBlob):
        # Add the fileBlob to database
        filename = os.path.basename(filename)
        filename, ext = os.path.splitext(filename)


def initDB(parent: os.PathLike, dbName: str) -> DB:
    if not os.path.exists(parent):
        os.mkdir(parent)

    DB_path: str = os.path.join(parent, dbName) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(DB_path):
        with open(DB_path, "a"):
            pass

    return DB(DB_path)
