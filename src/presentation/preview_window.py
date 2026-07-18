from __future__ import annotations

import logging
import threading
import webbrowser

from src.domain.errors import PreviewFailedError

logger = logging.getLogger(__name__)


def open_video_preview(embed_url: str, title: str) -> None:
    if not embed_url:
        raise PreviewFailedError("Prévia indisponível para este vídeo.")

    def launch() -> None:
        try:
            import webview

            webview.create_window(
                title=title or "Prévia do YouTube",
                url=embed_url,
                width=960,
                height=540,
            )
            webview.start()
        except Exception:
            logger.exception("Falha ao abrir prévia embutida; abrindo no navegador")
            webbrowser.open(embed_url)

    threading.Thread(target=launch, daemon=True).start()
