from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / "contracts"

for candidate in (ROOT, CONTRACTS):
    path_str = str(candidate)
    if path_str not in sys.path:
        sys.path.insert(0, path_str)
