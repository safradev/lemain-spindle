param(
  [Parameter(Mandatory = $true)]
  [string[]]$Paths
)

$ErrorActionPreference = "Stop"

$TimestampUrl = if ($env:WINDOWS_TIMESTAMP_URL) {
  $env:WINDOWS_TIMESTAMP_URL
} else {
  "http://timestamp.digicert.com"
}

function Find-SignTool {
  $cmd = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($cmd) {
    return $cmd.Source
  }
  $roots = @(
    "${env:ProgramFiles(x86)}\Windows Kits\10\bin",
    "${env:ProgramFiles}\Windows Kits\10\bin"
  )
  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $found = Get-ChildItem -Path $root -Recurse -Filter signtool.exe -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      Select-Object -First 1
    if ($found) {
      return $found.FullName
    }
  }
  return $null
}

if ([string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE) -and [string]::IsNullOrWhiteSpace($env:CSC_LINK)) {
  Write-Host "No WINDOWS_CERTIFICATE/CSC_LINK — skipping Authenticode."
  exit 0
}

$SignTool = Find-SignTool
if (-not $SignTool) {
  Write-Host "signtool.exe not found — skipping Authenticode."
  exit 0
}

$PfxPath = $env:CSC_LINK
$PfxPassword = $env:CSC_KEY_PASSWORD
$TempPfx = $null

if ([string]::IsNullOrWhiteSpace($PfxPath) -and -not [string]::IsNullOrWhiteSpace($env:WINDOWS_CERTIFICATE)) {
  $TempPfx = Join-Path $env:TEMP ("spindle-sign-" + [guid]::NewGuid().ToString("N") + ".pfx")
  $bytes = [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE.Trim())
  [IO.File]::WriteAllBytes($TempPfx, $bytes)
  $PfxPath = $TempPfx
  $PfxPassword = $env:WINDOWS_CERTIFICATE_PASSWORD
}

if (-not (Test-Path $PfxPath)) {
  throw "Certificate file not found: $PfxPath"
}

try {
  foreach ($raw in $Paths) {
    if (-not (Test-Path $raw)) {
      Write-Host "Skip missing: $raw"
      continue
    }
    $target = (Resolve-Path $raw).Path
    Write-Host "Signing $target"
    $args = @(
      "sign",
      "/fd", "SHA256",
      "/td", "SHA256",
      "/tr", $TimestampUrl,
      "/f", $PfxPath
    )
    if (-not [string]::IsNullOrWhiteSpace($PfxPassword)) {
      $args += @("/p", $PfxPassword)
    }
    $args += $target
    & $SignTool @args
    if ($LASTEXITCODE -ne 0) {
      throw "signtool failed for $target (exit $LASTEXITCODE)"
    }
  }
}
finally {
  if ($TempPfx -and (Test-Path $TempPfx)) {
    Remove-Item -Force $TempPfx
  }
}
