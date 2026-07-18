#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.presentation.app import run_app


def main() -> int:
    run_app()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
