from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from core.domain.entities import DownloadResult, MediaFormat, ProgressEvent, VideoInfo
from core.domain.errors import (
    AppError,
    DownloadFailedError,
    InvalidPathError,
    InvalidUrlError,
    VideoNotFoundError,
)

ERROR_CODES: dict[type[AppError], str] = {
    InvalidUrlError: "InvalidUrl",
    InvalidPathError: "InvalidPath",
    VideoNotFoundError: "VideoNotFound",
    DownloadFailedError: "DownloadFailed",
}


def error_code_for(error: BaseException) -> str:
    if isinstance(error, AppError):
        for error_type, code in ERROR_CODES.items():
            if isinstance(error, error_type):
                return code
        return "AppError"
    return "InternalError"


def error_message_for(error: BaseException) -> str:
    if isinstance(error, AppError):
        return error.message
    return "Ocorreu um erro inesperado."


def video_info_to_dict(info: VideoInfo) -> dict[str, Any]:
    return {
        "videoId": info.video_id,
        "title": info.title,
        "channel": info.channel,
        "durationSeconds": info.duration_seconds,
        "durationLabel": info.duration_label,
        "thumbnailUrl": info.thumbnail_url,
        "webpageUrl": info.webpage_url,
        "embedUrl": info.embed_url,
    }


def download_result_to_dict(result: DownloadResult) -> dict[str, Any]:
    return {
        "outputPath": str(result.output_path),
        "title": result.title,
        "mediaFormat": result.media_format.value,
    }


def progress_event_to_dict(event: ProgressEvent, request_id: str) -> dict[str, Any]:
    return {
        "requestId": request_id,
        "percent": event.percent,
        "status": event.status,
    }


def parse_media_format(raw: Any) -> MediaFormat:
    if not isinstance(raw, str):
        raise AppError("Formato de mídia inválido.")
    value = raw.strip().lower()
    try:
        return MediaFormat(value)
    except ValueError as error:
        raise AppError("Formato deve ser mp4 ou mp3.") from error


def encode_message(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def decode_message(line: str) -> dict[str, Any]:
    data = json.loads(line)
    if not isinstance(data, dict):
        raise ValueError("Mensagem NDJSON deve ser um objeto.")
    return data


def ensure_string(value: Any, field: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise InvalidUrlError(f"Campo obrigatório: {field}.")
    return value.strip()


def ensure_path_string(value: Any, field: str) -> str:
    if isinstance(value, Path):
        return str(value)
    if not isinstance(value, str) or not value.strip():
        raise InvalidPathError(f"Campo obrigatório: {field}.")
    return value.strip()
