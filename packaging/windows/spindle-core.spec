# -*- mode: python ; coding: utf-8 -*-
import os
import sys

from PyInstaller.utils.hooks import collect_all, collect_submodules

spec_dir = os.path.abspath(SPECPATH)
repo_root = os.path.abspath(os.path.join(spec_dir, "..", ".."))
entry_script = os.path.abspath(os.path.join(spec_dir, "..", "spindle_core_main.py"))

if not os.path.isdir(repo_root):
    raise SystemExit(f"Repo root not found: {repo_root}")
if not os.path.isfile(entry_script):
    raise SystemExit(f"Entry script not found: {entry_script}")

sys.path.insert(0, repo_root)

datas = []
binaries = []
hiddenimports = collect_submodules("core")

tmp_ret = collect_all("yt_dlp")
datas += tmp_ret[0]
binaries += tmp_ret[1]
hiddenimports += tmp_ret[2]

a = Analysis(
    [entry_script],
    pathex=[repo_root],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="spindle-core",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    contents_directory="runtime",
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    name="spindle-core",
    upx=False,
)
