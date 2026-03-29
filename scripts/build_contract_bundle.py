from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "contracts" / "roadmap_market.py"
UTILS = ROOT / "contracts" / "roadmap_market_utils.py"
OUTPUT = ROOT / "contracts" / "roadmap_market_standalone.py"

HEADER = [
    '# { "Depends": "py-genlayer:test" }',
    "",
    "from __future__ import annotations",
    "",
    "from dataclasses import dataclass",
    "from hashlib import sha256",
    "from html import unescape",
    "from html.parser import HTMLParser",
    "import json",
    "import typing",
    "from typing import Any",
    "from urllib.parse import urlparse",
    "",
    "from genlayer import *",
    "",
]

SKIP_LINES = {
    "from __future__ import annotations",
    "from dataclasses import dataclass",
    "from hashlib import sha256",
    "from html import unescape",
    "from html.parser import HTMLParser",
    "import json",
    "import typing",
    "from typing import Any",
    "from urllib.parse import urlparse",
    "from genlayer import *",
}


def strip_module(lines: list[str]) -> list[str]:
    stripped: list[str] = []
    skipping_local_import = False

    for line in lines:
        stripped_line = line.strip()
        if skipping_local_import:
            if stripped_line == ")":
                skipping_local_import = False
            continue
        if line.startswith("# {"):
            continue
        if stripped_line in SKIP_LINES:
            continue
        if line.startswith("from roadmap_market_utils import"):
            if stripped_line.endswith("("):
                skipping_local_import = True
            continue
        stripped.append(line)

    return stripped


def build_bundle() -> str:
    bundled = HEADER + strip_module(UTILS.read_text().splitlines()) + [""] + strip_module(
        CONTRACT.read_text().splitlines()
    )

    cleaned: list[str] = []
    blank_run = 0
    for line in bundled:
        if line.strip():
            blank_run = 0
            cleaned.append(line)
            continue
        blank_run += 1
        if blank_run <= 2:
            cleaned.append("")

    return "\n".join(cleaned).rstrip() + "\n"


def main() -> None:
    OUTPUT.write_text(build_bundle())
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
