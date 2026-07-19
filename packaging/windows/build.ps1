$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Presentation = Join-Path $RepoRoot "presentation"
$CoreOutDir = Join-Path $Presentation "build-resources\core"
$CoreExe = Join-Path $CoreOutDir "spindle-core.exe"
$VenvDir = Join-Path $RepoRoot ".venv-packaging"
$Python = Join-Path $VenvDir "Scripts\python.exe"
$PyInstaller = Join-Path $VenvDir "Scripts\pyinstaller.exe"
$Spec = Join-Path $PSScriptRoot "spindle-core.spec"
$DistDir = Join-Path $PSScriptRoot "dist"
$BuildDir = Join-Path $PSScriptRoot "build"

Write-Host "==> Spindle Windows build (v0.1.0)"
Write-Host "Repo: $RepoRoot"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

Assert-Command "python"
Assert-Command "npm"
Assert-Command "node"

Push-Location $RepoRoot
try {
  Write-Host "==> Packaging venv"
  if (-not (Test-Path $Python)) {
    python -m venv $VenvDir
  }
  & $Python -m pip install --upgrade pip
  & $Python -m pip install -r (Join-Path $RepoRoot "packaging\requirements-build.txt")

  Write-Host "==> Freeze core (PyInstaller)"
  if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
  if (Test-Path $BuildDir) { Remove-Item -Recurse -Force $BuildDir }
  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  New-Item -ItemType Directory -Force -Path $BuildDir | Out-Null
  & $PyInstaller --clean --noconfirm --distpath $DistDir --workpath $BuildDir $Spec
  $BuiltDir = Join-Path $DistDir "spindle-core"
  $BuiltExe = Join-Path $BuiltDir "spindle-core.exe"
  if (-not (Test-Path $BuiltExe)) {
    Write-Host "Expected: $BuiltExe"
    if (Test-Path $DistDir) {
      Get-ChildItem -Recurse $DistDir | ForEach-Object { Write-Host " found: $($_.FullName)" }
    }
    throw "PyInstaller did not produce spindle-core.exe"
  }
  if (Test-Path $CoreOutDir) { Remove-Item -Recurse -Force $CoreOutDir }
  New-Item -ItemType Directory -Force -Path $CoreOutDir | Out-Null
  Copy-Item -Recurse -Force (Join-Path $BuiltDir "*") $CoreOutDir

  Write-Host "==> Smoke-test core"
  $Ping = '{"id":"1","method":"ping","params":{}}'
  $Result = $Ping | & $CoreExe
  if ($Result -notmatch '"ok"\s*:\s*true') {
    throw "Core ping failed. Output: $Result"
  }
  Write-Host "Core ping OK"

  Write-Host "==> Download ffmpeg"
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "download-ffmpeg.ps1")

  Write-Host "==> Build Electron UI"
  Push-Location $Presentation
  try {
    if (-not (Test-Path (Join-Path $Presentation "node_modules"))) {
      npm ci
    } else {
      npm install
    }
    npm run build
    npm run dist:win
  }
  finally {
    Pop-Location
  }

  $ReleaseDir = Join-Path $Presentation "release"
  Write-Host ""
  Write-Host "Build complete. Artifacts in: $ReleaseDir"
  Get-ChildItem $ReleaseDir -File | ForEach-Object { Write-Host " - $($_.Name)" }
}
finally {
  Pop-Location
}
