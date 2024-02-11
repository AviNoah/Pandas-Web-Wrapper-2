from sqlite3 import Cursor, Connection, Error, connect
from enum import Enum
from typing import Optional, List, Tuple, List, Generator
from queue import Queue
from threading import Lock

import os
from werkzeug.datastructures import FileStorage
from contextlib import contextmanager


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


class ConnectionPool:
    def __init__(self, db_path: os.PathLike, pool_size: int):
        self.db_path = db_path
        self.pool_size = pool_size
        self.pool = Queue(maxsize=pool_size)
        self.lock = Lock()  # Prevent multiple threads from accessing a connection
        self._initialize_pool()  # Populate with connections at init

    def _initialize_pool(self):
        for _ in range(self.pool_size):
            self.pool.put(connect(self.db_path))

    def _increase_pool_size(self, value: int):
        for _ in range(value):
            self.pool.put(connect(self.db_path))
        self.pool_size += value

    def get_connection(self) -> Connection:
        with self.lock:
            if self.pool.empty():
                self._increase_pool_size(3)  # Allocate more connections due to load
            return self.pool.get()

    def release_connection(self, conn):
        with self.lock:
            self.pool.put(conn)

    def release_all_connections(self, is_failure: bool = False):
        with self.lock:
            while not self.pool.empty():
                conn: Connection = self.pool.get()
                if is_failure:
                    conn.rollback()  # Roll back in case of failure
                else:
                    conn.commit()
                conn.close()


class DB:
    def __init__(self, db_path: os.PathLike, pool_size: int = 5):
        self.connection_pool = ConnectionPool(db_path, pool_size)
        self.init_tables()

    @contextmanager
    def connection(self) -> Generator[Connection, None, None]:
        conn = self.connection_pool.get_connection()
        try:
            yield conn
        except Error as e:
            conn.rollback()  # Rollback changes if an exception occurs
            self.connection_pool.release_connection(conn)  # Free connection
            raise e  # Re-raise the exception
        finally:
            if conn:
                conn.commit()  # Commit changes
                self.connection_pool.release_connection(conn)  # Free connection

    @contextmanager
    def cursor(self) -> Generator[Cursor, None, None]:
        with self.connection() as conn:
            cursor = conn.cursor()
            try:
                yield cursor
            finally:
                cursor.close()

    def init_tables(self):
        # Initialize tables
        with self.cursor() as c:
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

    def add_file(self, filename: str, file: FileStorage) -> Tuple[bool, str, int]:
        # Add the file_blob to database
        filename = os.path.basename(filename)
        name, ext = os.path.splitext(filename)
        with self.cursor() as c:
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
                return True, f"Added {name} successfully", file_id
            except Error as e:
                return False, f"Failed to add {name}: {e}", None

    def add_filter(
        self, method: str, input: str, enabled: bool
    ) -> Tuple[bool, str, int]:
        with self.cursor() as c:
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
                return True, f"Added filter successfully", filter_id
            except Error as e:
                return False, f"Failed to add filter: {e}", None

    def file_filter_relationship(
        self, file_id: int, filter_id: int, sheet: int, column: int
    ) -> Tuple[bool, str]:
        with self.cursor() as c:
            try:
                c.execute(
                    f"""INSERT OR REPLACE INTO {Tables.FileFilter.value} 
                    ({FileFilterColumns.FILE_ID.value},
                    {FileFilterColumns.FILTER_ID.value},
                    {FileFilterColumns.SHEET.value},
                    {FileFilterColumns.COLUMN.value})
                    VALUES (?, ?, ?, ?)""",
                    (file_id, filter_id, sheet, column),
                )

                return True, f"Relationship created successfully"
            except Error as e:
                return False, f"Failed to create relationship: {e}"

    def get_file(self, file_id) -> Optional[FileStorage]:
        # Return file blob as FileStorage
        with self.cursor() as c:
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

    def get_file_name(self, file_id) -> Optional[tuple[str, str]]:
        # Return file name and ext
        with self.cursor() as c:
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

    def get_all_files(self) -> Optional[List[dict]]:
        with self.cursor() as c:
            c.execute(
                f"""SELECT 
                        {FileColumns.ID.value}, 
                        {FileColumns.NAME.value},
                        {FileColumns.EXT.value} 
                        FROM {Tables.File.value}"""
            )

            files: List[dict] = [
                {"id": id, "name": name, "ext": ext} for id, name, ext in c.fetchall()
            ]

            return files

    def get_all_file_ids(self) -> Optional[List[int]]:
        with self.cursor() as c:
            c.execute(
                f"""SELECT 
                        {FileColumns.ID.value}
                        FROM {Tables.File.value}"""
            )
            rows = c.fetchall()
            files: List[int] = [id for id, *_ in rows]
            return files

    def get_filter(self, filter_id) -> Optional[dict]:
        # Return a json representing filter data
        with self.cursor() as c:
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

    def get_sheets_filters(self, file_id, sheet) -> Optional[List[dict]]:
        # Return a json representing a list of filter data's
        with self.cursor() as c:
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

    def get_filters_at(self, file_id, sheet, column) -> Optional[List[dict]]:
        # Return a json representing a list of filter data's
        with self.cursor() as c:
            c.execute(
                f"""SELECT {FilterColumns.ID.value}, 
                {FilterColumns.INPUT.value}, 
                {FilterColumns.METHOD.value}, 
                {FilterColumns.ENABLED.value}
                FROM {Tables.Filter.value}
                LEFT JOIN {Tables.FileFilter.value}
                ON {Tables.Filter.value}.{FilterColumns.ID.value} = {Tables.FileFilter.value}.{FileFilterColumns.FILTER_ID.value}
                WHERE {Tables.FileFilter.value}.{FileFilterColumns.FILE_ID.value}=? AND 
                {Tables.FileFilter.value}.{FileFilterColumns.SHEET.value}=? AND
                {Tables.FileFilter.value}.{FileFilterColumns.COLUMN.value}=?""",
                (
                    file_id,
                    sheet,
                    column,
                ),
            )

            filters_data = []
            for filter_id, input, method, enabled in c.fetchall():
                filters_data.append(
                    {
                        "id": filter_id,
                        "input": input,
                        "method": method,
                        "enabled": enabled == 1,  # Convert to bool
                    }
                )
            return filters_data

    def update_filter(self, filter_id, method: str, input: str, enabled: bool) -> bool:
        # Update filter data matching id, return whether succeeded or not
        with self.cursor() as c:
            try:
                c.execute(
                    f"""UPDATE {Tables.Filter.value}
                    SET {FilterColumns.INPUT.value} = ?,
                        {FilterColumns.METHOD.value} = ?,
                        {FilterColumns.ENABLED.value} = ?
                    WHERE {FilterColumns.ID.value} = ?""",
                    (input, method, enabled, filter_id),
                )

                if c.rowcount > 0:
                    return True
                return False
            except Exception as e:
                return False  # Filter not found

    def delete_filter(self, filter_id) -> bool:
        # Delete filter record matching id, return whether succeeded or not
        with self.cursor() as c:
            try:
                c.execute(
                    f"""DELETE FROM {Tables.Filter.value}
                    WHERE {FilterColumns.ID.value} = ?""",
                    (filter_id,),
                )

                if c.rowcount > 0:
                    return True
                return False
            except Exception as e:
                return False  # Filter not found

    def update_file(
        self, file_id, filename: str, file: FileStorage
    ) -> Tuple[bool, str, int]:
        # Update the file_blob in database at the given id
        filename = os.path.basename(filename)
        name, ext = os.path.splitext(filename)
        with self.cursor() as c:
            try:
                c.execute(
                    f"""UPDATE {Tables.File.value}
                    SET {FileColumns.NAME.value} = ?,
                        {FileColumns.EXT.value} = ?,
                        {FileColumns.BLOB.value} = ?
                    WHERE {FileColumns.ID.value} = ?""",
                    (name, ext, file.read(), file_id),
                )

                return c.rowcount > 0, f"Updated {name} successfully", file_id
            except Error as e:
                return False, f"Failed to update {name}: {e}", file_id

    def update_file_name(self, file_id, name) -> Tuple[bool, str, int]:
        # Update the file name and ext in database at the given id
        with self.cursor() as c:
            try:
                c.execute(
                    f"""UPDATE {Tables.File.value}
                    SET {FileColumns.NAME.value} = ?
                    WHERE {FileColumns.ID.value} = ?""",
                    (name, file_id),
                )

                return c.rowcount > 0, f"Updated {name} successfully", file_id
            except Error as e:
                return False, f"Failed to update {name}: {e}", file_id

    def delete_file(self, file_id) -> bool:
        # Delete file record matching id
        with self.cursor() as c:
            try:
                c.execute(
                    f"""DELETE FROM {Tables.File.value}
                    WHERE {FileColumns.ID.value} = ?""",
                    (file_id,),
                )

                if c.rowcount > 0:
                    return True
                return False
            except Exception as e:
                return False  # File not found


def init_db(parent: os.PathLike, db_name: str) -> os.PathLike:
    # Initialize DB file and return path
    if parent and not os.path.exists(parent):
        os.mkdir(parent)

    db_path: str = os.path.join(parent, db_name) + ".db"

    # Create an empty db file if it doesn't exist
    if not os.path.exists(db_path):
        with open(db_path, "a"):
            pass

    return db_path
