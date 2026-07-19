$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $Root

$VenvPython = Join-Path $Root ".venv\Scripts\python.exe"
$NodeModules = Join-Path $Root "presentation\node_modules"

function Show-Usage {
  @"
Lemain Spindle · Windows

Uso:
  .\run-scripts\windows\spindle.cmd              # verifica deps, instala se preciso e sobe a UI
  .\run-scripts\windows\spindle.cmd ui           # sobe a UI Electron
  .\run-scripts\windows\spindle.cmd cli <url> …  # CLI de download
  .\run-scripts\windows\spindle.cmd setup        # só verifica/instala dependências

Exemplos:
  .\run-scripts\windows\spindle.cmd
  .\run-scripts\windows\spindle.cmd cli "https://www.youtube.com/watch?v=..." -f mp4 -o "$env:USERPROFILE\Downloads"
"@ | Write-Host
}

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Erro: '$Name' não encontrado no PATH."
  }
}

function Warn-Ffmpeg {
  if (Get-Command "ffmpeg" -ErrorAction SilentlyContinue) {
    return
  }
  Write-Warning "ffmpeg não está no PATH. A extração de mídia vai falhar até instalar."
  Write-Host "  winget: winget install Gyan.FFmpeg" -ForegroundColor Yellow
  Write-Host "  choco:  choco install ffmpeg" -ForegroundColor Yellow
}

function Ensure-Deps {
  Write-Host "==> Lemain Spindle · Windows · checando dependências"
  Write-Host "    raiz: $Root"

  Assert-Command "python"
  Assert-Command "npm"
  Assert-Command "node"
  Warn-Ffmpeg

  if (-not (Test-Path $VenvPython)) {
    Write-Host "==> criando .venv"
    python -m venv (Join-Path $Root ".venv")
  }

  Write-Host "==> garantindo dependências Python"
  & $VenvPython -m pip install --upgrade pip | Out-Null
  & $VenvPython -m pip install -r (Join-Path $Root "requirements.txt")

  if (-not (Test-Path $NodeModules)) {
    Write-Host "==> instalando dependências Node (presentation/)"
  } else {
    Write-Host "==> verificando dependências Node (presentation/)"
  }

  Push-Location (Join-Path $Root "presentation")
  try {
    npm install
    npm run patch:electron
  } finally {
    Pop-Location
  }

  Write-Host "==> dependências ok"
}

function Invoke-Ui {
  Ensure-Deps
  $env:PATH = "$(Join-Path $Root '.venv\Scripts');$env:PATH"
  $env:PYTHONPATH = if ($env:PYTHONPATH) { "$Root;$env:PYTHONPATH" } else { "$Root" }

  Write-Host "==> subindo UI (Electron)"
  Write-Host "    Python: $(& $VenvPython -V)"
  Write-Host "    Node:   $(node -v)"
  Write-Host ""

  Push-Location (Join-Path $Root "presentation")
  try {
    npm run dev
  } finally {
    Pop-Location
  }
}

function Invoke-Cli([string[]]$CliArgs) {
  Ensure-Deps

  if ($CliArgs.Count -lt 1) {
    Write-Host "Informe a URL do YouTube." -ForegroundColor Yellow
    Show-Usage
    exit 1
  }

  $env:PATH = "$(Join-Path $Root '.venv\Scripts');$env:PATH"
  $env:PYTHONPATH = if ($env:PYTHONPATH) { "$Root;$env:PYTHONPATH" } else { "$Root" }

  Write-Host "==> CLI"
  & $VenvPython (Join-Path $Root "download_youtube.py") @CliArgs
  exit $LASTEXITCODE
}

$Command = if ($args.Count -gt 0) { $args[0] } else { "ui" }

switch -Regex ($Command) {
  "^(?i)-h|--help|help$" {
    Show-Usage
    break
  }
  "^(?i)setup$" {
    Ensure-Deps
    Write-Host ""
    Write-Host "Pronto. Para a UI: .\run-scripts\windows\spindle.cmd ui"
    Write-Host "Para a CLI: .\run-scripts\windows\spindle.cmd cli <url>"
    break
  }
  "^(?i)ui|dev$" {
    Invoke-Ui
    break
  }
  "^(?i)cli$" {
    Invoke-Cli @($args | Select-Object -Skip 1)
    break
  }
  "^https?://" {
    Invoke-Cli $args
    break
  }
  default {
    Write-Host "Comando desconhecido: $Command" -ForegroundColor Yellow
    Show-Usage
    exit 1
  }
}
