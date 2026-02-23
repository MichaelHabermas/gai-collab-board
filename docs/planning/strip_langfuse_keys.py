#!/usr/bin/env python3
"""Remove objects that have 'messages', 'message', or 'tools' from a JSON file."""

import json
import sys

FORBIDDEN_KEYS = frozenset({"messages", "message", "tools"})


def has_forbidden_keys(obj):
    if not isinstance(obj, dict):
        return False
    return bool(FORBIDDEN_KEYS & set(obj.keys()))


def clean(obj):
    if isinstance(obj, dict):
        if has_forbidden_keys(obj):
            return None
        out = {}
        for k, v in obj.items():
            cleaned = clean(v)
            if cleaned is not None:
                out[k] = cleaned
        return out
    if isinstance(obj, list):
        return [v for item in obj for v in [clean(item)] if v is not None]
    return obj


def main():
    path = "langfuse copy.json"
    if len(sys.argv) > 1:
        path = sys.argv[1]

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    cleaned = clean(data)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cleaned, f, indent=4, ensure_ascii=False)

    print(f"Wrote cleaned JSON to {path}")


if __name__ == "__main__":
    main()
