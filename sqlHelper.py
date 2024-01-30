import sqlite3
import os


class DB:
    def __init__(self, DB_Path: os.PathLike):
        self.__conn = sqlite3.connect(DB_Path)

    def conn(self):
        return self.__conn
