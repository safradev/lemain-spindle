# Lemain Spindle

Desktop app da [Lemain Labs](https://lemain-labs.com) para extrair mídia do YouTube (MP4 / MP3).

```
┌─────────────────────────────┐
│  presentation (Electron)    │
│  preview · formatos · path  │
└──────────────┬──────────────┘
               │ NDJSON stdio
┌──────────────▼──────────────┐
│  core (Python)              │
│  validate · info · download │
└─────────────────────────────┘
```

## Módulos

| Pasta | Papel |
| --- | --- |
| [`core/`](core/) | Motor Python (domain, application, infrastructure, bridge, cli) |
| [`presentation/`](presentation/) | UI Electron + React + Tailwind + anime.js |
| [`run-scripts/`](run-scripts/) | Um script por SO (deps + UI + CLI) |

## Fluxo

1. Colar link do YouTube → **Validar**
2. Prévia (título, canal, duração, thumbnail)
3. Escolher MP4/MP3 + pasta de destino
4. **Extrair** com progresso

Extração só após validação bem-sucedida. Somente hosts YouTube; download unitário (`noplaylist`).

## Pré-requisitos

No PATH:

- Python 3.11+ (`python3` no macOS/Linux, `python` no Windows)
- Node.js 20+ e npm
- `ffmpeg` (obrigatório para extrair mídia)

## Rodar com scripts (recomendado)

Há **um script por sistema operacional**. Cada um:

1. verifica dependências do sistema
2. cria `.venv` / instala Python + npm se necessário
3. sobe a **UI** ou a **CLI**

### macOS

```bash
chmod +x run-scripts/macos/spindle.sh
./run-scripts/macos/spindle.sh
```

```bash
./run-scripts/macos/spindle.sh ui
./run-scripts/macos/spindle.sh cli "https://www.youtube.com/watch?v=..." -f mp4 -o ~/Downloads
./run-scripts/macos/spindle.sh setup
```

### Linux

```bash
chmod +x run-scripts/linux/spindle.sh
./run-scripts/linux/spindle.sh
```

```bash
./run-scripts/linux/spindle.sh ui
./run-scripts/linux/spindle.sh cli "https://www.youtube.com/watch?v=..." -f mp4 -o ~/Downloads
./run-scripts/linux/spindle.sh setup
```

### Windows

```bat
run-scripts\windows\spindle.cmd
```

```bat
run-scripts\windows\spindle.cmd ui
run-scripts\windows\spindle.cmd cli "https://www.youtube.com/watch?v=..." -f mp4 -o "%USERPROFILE%\Downloads"
run-scripts\windows\spindle.cmd setup
```

PowerShell:

```powershell
.\run-scripts\windows\spindle.ps1 ui
.\run-scripts\windows\spindle.ps1 cli "https://www.youtube.com/watch?v=..." -f mp3
```

Sem argumentos (ou `ui`), o script sobe a interface Electron. `cli` roda o download em terminal. `setup` só instala/verifica deps.

## Setup manual

### Core (Python)

```bash
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

CLI:

```bash
python download_youtube.py "https://www.youtube.com/watch?v=..." -f mp4 -o ~/Downloads
```

Bridge (smoke):

```bash
printf '%s\n' '{"id":"1","method":"ping","params":{}}' | python -m core.bridge.stdio_server
```

### Presentation (Electron)

```bash
cd presentation
npm install
npm run dev
```

## Contrato bridge (NDJSON)

- `ping` → `{ ok: true }`
- `getVideoInfo` `{ url }` → metadados do vídeo
- `download` `{ requestId, url, format, outputDir }` → path do arquivo
- evento `progress` `{ requestId, percent, status }`

## Tema

Claro/escuro no toggle da UI (persistido em `localStorage`).

## Distribuição Windows (v0.1.0)

Gera um `.exe` standalone (sem Python/Node no PC de destino). O build **precisa rodar no Windows** (PyInstaller não cross-compila).

### Em uma máquina Windows

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\packaging\windows\build.ps1
```

Artefatos em `presentation/release/`:

| Arquivo | Uso |
| --- | --- |
| `Lemain-Spindle-0.1.0-portable.exe` | Baixar e executar (recomendado) |
| `Lemain-Spindle-0.1.0-setup.exe` | Instalador NSIS |

O pacote inclui UI Electron + `spindle-core.exe` (motor Python congelado) + `ffmpeg`.

### Via GitHub Actions

Workflow [`.github/workflows/build-windows.yml`](.github/workflows/build-windows.yml):

1. Actions → **Build Windows** → Run workflow  
   ou push de tag `v0.1.0`
2. Baixar o artifact `lemain-spindle-windows-0.1.0`

### Pré-requisitos do build (só na máquina que gera o .exe)

- Windows 10/11 x64
- Python 3.12+
- Node.js 20+
- npm
