import sqlite3
from sqlite3 import Cursor, Connection
import os

from enum import Enum


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



def initDB(parent: os.PathLike, dbName: str) -> DB:
    if not os.path.exists(parent):
        os.mkdir(parent)

    DB_path: str = os.path.join(parent, dbName) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(DB_path):
        with open(DB_path, "a"):
            pass

    return DB(DB_path)
