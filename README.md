# Lemain Spindle

> **WIP — under construction**

Desktop app da [Lemain Labs](https://lemain-labs.com) para extrair mídia do YouTube (MP4 / MP3) com interface moderna e motor Python interno.

## Visão

O Spindle será reescrito como aplicação **Electron** na superfície, com um **motor Python** embutido para validar URLs, consultar metadados e executar downloads. A UI não fala com o extrator direto — o shell orquestra; o núcleo Python executa.

```
┌─────────────────────────────┐
│  Electron (UI / shell)      │
│  preview · formatos · path  │
└──────────────┬──────────────┘
               │ IPC / bridge
┌──────────────▼──────────────┐
│  Python engine              │
│  validate · info · download │
└─────────────────────────────┘
```

## O que o produto pretende entregar

- Extrair um único vídeo do YouTube (`noplaylist`)
- Exportar em **MP4** (vídeo) ou **MP3** (áudio)
- Preview com título, canal, duração e thumbnail antes do download
- Escolha de pasta de destino e acompanhamento de progresso
- Hosts YouTube apenas — sem scrapers genéricos

## Estado atual

Protótipo local em Python (CustomTkinter + yt-dlp), em Clean Architecture. A migração para Electron + motor Python ainda não começou.

| Camada | Papel |
| --- | --- |
| `src/domain` | entities, errors, ports |
| `src/application` | GetVideoInfo, DownloadMedia |
| `src/infrastructure` | yt-dlp gateway, validators |
| `src/presentation` | UI atual (protótipo) |

## Roadmap (rascunho)

- [ ] Definir contrato IPC Electron ↔ Python
- [ ] Empacotar o motor Python como runtime interno
- [ ] Reconstruir a UI em Electron no visual Lemain Studio
- [ ] CLI e desktop compartilhando o mesmo motor
- [ ] Distribuição macOS / Windows

## Requisitos (protótipo atual)

- Python 3.11+
- `ffmpeg` no PATH
- dependências em `requirements.txt`

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

---

Produto da Lemain Labs · [github.com/safradev/lemain-spindle](https://github.com/safradev/lemain-spindle)
