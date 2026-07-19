$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Presentation = Join-Path $RepoRoot "presentation"
$CoreOutDir = Join-Path $Presentation "build-resources\core"
$FfmpegDir = Join-Path $Presentation "build-resources\ffmpeg"
$CoreExe = Join-Path $CoreOutDir "spindle-core.exe"
$FfmpegExe = Join-Path $FfmpegDir "ffmpeg.exe"
$FfprobeExe = Join-Path $FfmpegDir "ffprobe.exe"
$VenvDir = Join-Path $RepoRoot ".venv-packaging"
$Python = Join-Path $VenvDir "Scripts\python.exe"
$PyInstaller = Join-Path $VenvDir "Scripts\pyinstaller.exe"
$Spec = Join-Path $PSScriptRoot "spindle-core.spec"
$DistDir = Join-Path $PSScriptRoot "dist"
$BuildDir = Join-Path $PSScriptRoot "build"
$SignScript = Join-Path $PSScriptRoot "sign-binaries.ps1"

Write-Host "==> Spindle Windows build (v0.1.3)"
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
  $RuntimeDir = Join-Path $BuiltDir "runtime"
  if (-not (Test-Path $RuntimeDir)) {
    throw "PyInstaller did not produce runtime/ next to spindle-core.exe"
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

  Write-Host "==> Authenticode (nested binaries)"
  & powershell -NoProfile -ExecutionPolicy Bypass -File $SignScript -Paths @(
    $CoreExe,
    $FfmpegExe,
    $FfprobeExe
  )

  if (-not [string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE) -and [string]::IsNullOrWhiteSpace($env:CSC_LINK)) {
    $CscPfx = Join-Path $env:TEMP ("spindle-csc-" + [guid]::NewGuid().ToString("N") + ".pfx")
    $bytes = [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE.Trim())
    [IO.File]::WriteAllBytes($CscPfx, $bytes)
    $env:CSC_LINK = $CscPfx
    $env:CSC_KEY_PASSWORD = $env:WINDOWS_CERTIFICATE_PASSWORD
    $env:CSC_TIMESTAMP_URL = if ($env:WINDOWS_TIMESTAMP_URL) { $env:WINDOWS_TIMESTAMP_URL } else { "http://timestamp.digicert.com" }
  }

  Write-Host "==> Build Electron UI (NSIS)"
  Push-Location $Presentation
  try {
    if (-not (Test-Path (Join-Path $Presentation "node_modules"))) {
      npm ci
    } else {
      npm install
    }
    npm run build
    if ($LASTEXITCODE -ne 0) {
      throw "npm run build failed (exit $LASTEXITCODE)"
    }
    npm run dist:win
    if ($LASTEXITCODE -ne 0) {
      throw "npm run dist:win failed (exit $LASTEXITCODE)"
    }
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
