from __future__ import annotations

import logging
import sys
from typing import Any

from core.application.download_media import DownloadMedia
from core.application.get_video_info import GetVideoInfo
from core.bridge.protocol import (
    decode_message,
    download_result_to_dict,
    encode_message,
    ensure_path_string,
    ensure_string,
    error_code_for,
    error_message_for,
    parse_media_format,
    progress_event_to_dict,
    video_info_to_dict,
)
from core.domain.errors import AppError
from core.infrastructure.output_path import OutputPathValidator
from core.infrastructure.youtube_url import YoutubeUrlValidator
from core.infrastructure.ytdlp_gateway import YtDlpVideoGateway

logger = logging.getLogger(__name__)


class BridgeServer:
    def __init__(self) -> None:
        gateway = YtDlpVideoGateway()
        url_validator = YoutubeUrlValidator()
        path_validator = OutputPathValidator()
        self._get_video_info = GetVideoInfo(gateway=gateway, url_validator=url_validator)
        self._download_media = DownloadMedia(
            gateway=gateway,
            url_validator=url_validator,
            path_validator=path_validator,
        )

    def handle(self, message: dict[str, Any]) -> None:
        request_id = message.get("id")
        method = message.get("method")

        if not isinstance(method, str) or not method:
            self._write_error(request_id, "InvalidRequest", "Método ausente.")
            return

        params = message.get("params") or {}
        if not isinstance(params, dict):
            self._write_error(request_id, "InvalidRequest", "Params inválidos.")
            return

        try:
            if method == "ping":
                self._write_result(request_id, {"ok": True})
                return
            if method == "getVideoInfo":
                self._handle_get_video_info(request_id, params)
                return
            if method == "download":
                self._handle_download(request_id, params)
                return
            self._write_error(request_id, "MethodNotFound", f"Método desconhecido: {method}")
        except AppError as error:
            self._write_error(request_id, error_code_for(error), error_message_for(error))
        except Exception:
            logger.exception("Erro interno no bridge")
            self._write_error(request_id, "InternalError", "Ocorreu um erro inesperado.")

    def _handle_get_video_info(self, request_id: Any, params: dict[str, Any]) -> None:
        url = ensure_string(params.get("url"), "url")
        info = self._get_video_info.execute(url)
        self._write_result(request_id, video_info_to_dict(info))

    def _handle_download(self, request_id: Any, params: dict[str, Any]) -> None:
        url = ensure_string(params.get("url"), "url")
        output_dir = ensure_path_string(params.get("outputDir"), "outputDir")
        media_format = parse_media_format(params.get("format"))
        progress_request_id = params.get("requestId")
        if not isinstance(progress_request_id, str) or not progress_request_id.strip():
            progress_request_id = str(request_id) if request_id is not None else "download"

        def on_progress(event) -> None:
            self._write_event(
                "progress",
                progress_event_to_dict(event, progress_request_id),
            )

        result = self._download_media.execute(
            raw_url=url,
            media_format=media_format,
            raw_output_dir=output_dir,
            on_progress=on_progress,
        )
        self._write_result(request_id, download_result_to_dict(result))

    def _write_result(self, request_id: Any, result: dict[str, Any]) -> None:
        self._emit({"id": request_id, "result": result})

    def _write_error(self, request_id: Any, code: str, message: str) -> None:
        self._emit({"id": request_id, "error": {"code": code, "message": message}})

    def _write_event(self, method: str, params: dict[str, Any]) -> None:
        self._emit({"id": None, "method": method, "params": params})

    def _emit(self, payload: dict[str, Any]) -> None:
        sys.stdout.write(encode_message(payload) + "\n")
        sys.stdout.flush()


def run() -> int:
    logging.basicConfig(
        level=logging.WARNING,
        format="%(levelname)s: %(message)s",
        stream=sys.stderr,
    )
    server = BridgeServer()
    sys.stderr.write("spindle-core:ready\n")
    sys.stderr.flush()
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            message = decode_message(line)
        except (ValueError, TypeError) as error:
            server._write_error(None, "InvalidRequest", f"JSON inválido: {error}")
            continue
        server.handle(message)
    return 0


def main() -> int:
    return run()


if __name__ == "__main__":
    raise SystemExit(main())
