#!/usr/bin/env python3
"""Merge missing words from a skribbl CSV into public/words.json.

The CSV may contain one word per line or lines like: word,number_of_characters.
Character counts are ignored.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
import urllib.request
from pathlib import Path
from typing import Iterable


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--csv",
        required=True,
        help="Path to local CSV file or http(s) URL",
    )
    p.add_argument(
        "--words-path",
        default="skribbl-hints-app/public/words.json",
    )
    p.add_argument(
        "--custom-words-path",
        default="skribbl-hints-app/public/custom-words.json",
    )
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()


def read_text(source: str) -> str:
    if source.startswith(("http://", "https://")):
        with urllib.request.urlopen(source, timeout=30) as response:
            return response.read().decode("utf-8")
    return Path(source).read_text(encoding="utf-8")


def iter_csv_words(csv_text: str) -> Iterable[str]:
    reader = csv.reader(csv_text.splitlines())
    for row in reader:
        if not row:
            continue
        word = row[0].strip()
        if not word:
            continue
        yield word


def main() -> int:
    args = parse_args()
    words_path = Path(args.words_path)
    custom_words_path = Path(args.custom_words_path)

    words = json.loads(words_path.read_text(encoding="utf-8"))
    custom_words = json.loads(custom_words_path.read_text(encoding="utf-8"))

    existing_lower = {w.lower() for w in words}
    existing_lower.update(w.lower() for w in custom_words)

    csv_text = read_text(args.csv)

    new_words: list[str] = []
    seen_in_csv: set[str] = set()
    for word in iter_csv_words(csv_text):
        lw = word.lower()
        if lw in seen_in_csv:
            continue
        seen_in_csv.add(lw)
        if lw in existing_lower:
            continue
        new_words.append(word)
        existing_lower.add(lw)

    if not new_words:
        print("No new words found.")
        return 0

    merged = words + new_words

    if args.dry_run:
        print(f"Would add {len(new_words)} words:")
        for word in new_words:
            print(f"- {word}")
        return 0

    words_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Added {len(new_words)} new words to {words_path}.")
    for word in new_words:
        print(f"- {word}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
