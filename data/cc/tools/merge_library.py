#!/usr/bin/env python3
"""Merge staged citations into data/cc/originals/_framework_library.md.

Authors working in parallel stage new bullets in their own file instead of
editing the library at once. Each "## X" / "### X" block in the staged file
is appended to the end of the library section with the same heading; a
heading the library lacks becomes a new section before "## ISO/IEC" (NIST
blocks) or at the end.

Usage: python3 data/cc/tools/merge_library.py STAGED.md
"""
import re
import sys
from pathlib import Path

LIB = Path(__file__).resolve().parent.parent / "originals" / "_framework_library.md"


def main(staged):
    lib = LIB.read_text(encoding="utf-8").splitlines()
    blocks, cur = [], None
    for line in Path(staged).read_text(encoding="utf-8").splitlines():
        if re.match(r"#{2,3} ", line) and not line.startswith("## New citations"):
            cur = [line, []]
            blocks.append(cur)
        elif cur and line.strip():
            cur[1].append(line)
    for head, body in blocks:
        if not body:
            continue
        if head in lib:
            i = lib.index(head) + 1
            while i < len(lib) and not re.match(r"#{1,3} |---", lib[i]):
                i += 1
            while lib[i - 1].strip() == "":
                i -= 1
            lib[i:i] = body
            print(f"merged {len(body)} line(s) under {head}")
        else:
            nist = "NIST" in " ".join(body) and "## ISO/IEC" in lib
            at = lib.index("## ISO/IEC") if nist else len(lib)
            lib[at:at] = [head] + body + [""]
            print(f"new section {head}")
    LIB.write_text("\n".join(lib) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1])
