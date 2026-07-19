$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$Presentation = Join-Path $RepoRoot "presentation"
$FfmpegDir = Join-Path $Presentation "build-resources\ffmpeg"
$FfmpegExe = Join-Path $FfmpegDir "ffmpeg.exe"
$FfprobeExe = Join-Path $FfmpegDir "ffprobe.exe"

if ((Test-Path $FfmpegExe) -and (Test-Path $FfprobeExe)) {
  Write-Host "ffmpeg already present in build-resources."
  exit 0
}

New-Item -ItemType Directory -Force -Path $FfmpegDir | Out-Null

$TempRoot = Join-Path $env:TEMP ("spindle-ffmpeg-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

try {
  $ZipUrl = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
  $ZipPath = Join-Path $TempRoot "ffmpeg.zip"
  Write-Host "Downloading ffmpeg..."
  Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing

  Expand-Archive -Path $ZipPath -DestinationPath $TempRoot -Force
  $FoundFfmpeg = Get-ChildItem -Path $TempRoot -Recurse -Filter "ffmpeg.exe" | Select-Object -First 1
  $FoundFfprobe = Get-ChildItem -Path $TempRoot -Recurse -Filter "ffprobe.exe" | Select-Object -First 1

  if (-not $FoundFfmpeg -or -not $FoundFfprobe) {
    throw "ffmpeg.exe / ffprobe.exe not found in downloaded archive."
  }

  Copy-Item -Force $FoundFfmpeg.FullName $FfmpegExe
  Copy-Item -Force $FoundFfprobe.FullName $FfprobeExe
  Write-Host "ffmpeg installed to $FfmpegDir"
}
finally {
  Remove-Item -Recurse -Force $TempRoot -ErrorAction SilentlyContinue
}
