import sqlite3
import os

from enum import Enum


class file_columns(Enum):
    id = "id"
    file_name = "name"
    file_ext = "ext"
    file_blob = "blob"


class filter_columns(Enum):
    id = "id"
    method = "method"
    input = "input"


class file_filter_columns(Enum):
    # A relation ship table between file and filter tables
    file_id = "file_id"
    filter_id = "filter_id"
    sheet = "sheet"


class DB:
    def __init__(self, DB_Path: os.PathLike, auto_commit: bool = False):
        if auto_commit:
            isolation_level = None  # Auto-commit mode
        else:
            isolation_level = ""  # Default isolation level
        self.__conn: sqlite3.Connection = sqlite3.connect(
            DB_Path, isolation_level=isolation_level
        )

    def conn(self):
        return self.__conn

    def commit(self):
        self.__conn.commit()

    def close(self):
        self.__conn.close()


def init_DB(parent: os.PathLike, db_name: str) -> DB:
    if not os.path.exists(parent):
        os.mkdir(parent)

    DB_path: str = os.path.join(parent, db_name) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(DB_path):
        with open(DB_path, "a"):
            pass

    return DB(DB_path)
