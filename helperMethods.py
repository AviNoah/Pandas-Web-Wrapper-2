# Helper methods

import os


def isAValidExt(filename: str, ALLOWED_EXTENSIONS: set) -> bool:
    _, ext = os.path.splitext(os.path.basename(filename))  # discard name
    if not ext:
        return False  # No extension isn't valid.

    return ext in ALLOWED_EXTENSIONS


def verifyKeys(json, key_set: set) -> bool:
    # Verifies if json contains every key from the given set
    return json and key_set.issubset(json.keys())
