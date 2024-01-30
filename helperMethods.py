# Helper methods

import os


def is_valid_ext(filename: str, ALLOWED_EXTENSIONS: set) -> bool:
    _, ext = os.path.splitext(os.path.basename(filename))  # discard name
    if not ext:
        return False  # No extension isn't valid.

    return ext in ALLOWED_EXTENSIONS
