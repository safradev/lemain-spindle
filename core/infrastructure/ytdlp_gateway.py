from __future__ import annotations

import logging
import os
from collections.abc import Callable
from pathlib import Path

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

from core.domain.entities import (
    DownloadRequest,
    DownloadResult,
    MediaFormat,
    ProgressEvent,
    VideoInfo,
)
from core.domain.errors import DownloadFailedError, VideoNotFoundError

logger = logging.getLogger(__name__)


def resolve_ffmpeg_location() -> str | None:
    for key in ("SPINDLE_FFMPEG", "FFMPEG_LOCATION"):
        raw = (os.environ.get(key) or "").strip()
        if not raw:
            continue
        path = Path(raw)
        if path.is_file():
            return str(path.parent.resolve())
        if path.is_dir():
            return str(path.resolve())
    return None


class YtDlpVideoGateway:
    def fetch_info(self, url: str) -> VideoInfo:
        options = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "skip_download": True,
        }
        options.update(self._ffmpeg_options())
        try:
            with YoutubeDL(options) as ydl:
                info = ydl.extract_info(url, download=False)
        except DownloadError as error:
            logger.exception("Falha ao obter informações do vídeo")
            raise VideoNotFoundError(
                "Não foi possível obter as informações deste vídeo."
            ) from error
        except Exception as error:
            logger.exception("Erro inesperado ao obter informações do vídeo")
            raise VideoNotFoundError(
                "Não foi possível obter as informações deste vídeo."
            ) from error

        if not isinstance(info, dict):
            raise VideoNotFoundError("Resposta inválida ao consultar o vídeo.")

        if info.get("_type") == "playlist":
            entries = info.get("entries") or []
            first = next((item for item in entries if isinstance(item, dict)), None)
            if first is None:
                raise VideoNotFoundError("O link aponta para uma playlist vazia.")
            info = first

        video_id = str(info.get("id") or "").strip()
        title = str(info.get("title") or "Vídeo sem título").strip()
        channel = str(info.get("uploader") or info.get("channel") or "Canal desconhecido").strip()
        duration = info.get("duration") or 0
        thumbnail = str(info.get("thumbnail") or "").strip()
        webpage_url = str(info.get("webpage_url") or url).strip()

        if not video_id:
            raise VideoNotFoundError("Não foi possível identificar o vídeo.")

        try:
            duration_seconds = int(duration)
        except (TypeError, ValueError):
            duration_seconds = 0

        return VideoInfo(
            video_id=video_id,
            title=title,
            channel=channel,
            duration_seconds=duration_seconds,
            thumbnail_url=thumbnail,
            webpage_url=webpage_url,
        )

    def download(
        self,
        request: DownloadRequest,
        on_progress: Callable[[ProgressEvent], None] | None = None,
    ) -> DownloadResult:
        output_dir = request.output_dir
        options = self._build_options(output_dir, request.media_format)
        collected_paths: list[str] = []

        def hook(event: dict) -> None:
            status = event.get("status")
            if status == "downloading" and on_progress is not None:
                total = event.get("total_bytes") or event.get("total_bytes_estimate") or 0
                downloaded = event.get("downloaded_bytes") or 0
                percent = 0.0
                if total:
                    percent = max(0.0, min(100.0, (downloaded / total) * 100.0))
                on_progress(ProgressEvent(percent=percent, status="Baixando..."))
            elif status == "finished":
                filename = event.get("filename")
                if isinstance(filename, str) and filename:
                    collected_paths.append(filename)
                if on_progress is not None:
                    on_progress(ProgressEvent(percent=100.0, status="Finalizando..."))

        options["progress_hooks"] = [hook]

        prepared_path: Path | None = None
        try:
            with YoutubeDL(options) as ydl:
                info = ydl.extract_info(request.url, download=True)
                if isinstance(info, dict):
                    prepared = ydl.prepare_filename(info)
                    if request.media_format is MediaFormat.MP3:
                        prepared_path = Path(prepared).with_suffix(".mp3")
                    else:
                        prepared_path = Path(prepared).with_suffix(".mp4")
        except DownloadError as error:
            logger.exception("Falha no download")
            raise DownloadFailedError(
                "Falha ao baixar o vídeo. Tente novamente."
            ) from error
        except Exception as error:
            logger.exception("Erro inesperado no download")
            raise DownloadFailedError(
                "Falha ao baixar o vídeo. Tente novamente."
            ) from error

        if not isinstance(info, dict):
            raise DownloadFailedError("Download concluído sem metadados válidos.")

        title = str(info.get("title") or "Vídeo").strip()
        output_path = self._resolve_output_path(
            info=info,
            collected_paths=collected_paths,
            prepared_path=prepared_path,
            output_dir=output_dir,
            media_format=request.media_format,
        )

        if on_progress is not None:
            on_progress(ProgressEvent(percent=100.0, status="Concluído"))

        return DownloadResult(
            output_path=output_path,
            title=title,
            media_format=request.media_format,
        )

    def _ffmpeg_options(self) -> dict:
        location = resolve_ffmpeg_location()
        if not location:
            return {}
        return {"ffmpeg_location": location}

    def _build_options(self, output_dir: Path, media_format: MediaFormat) -> dict:
        outtmpl = str(output_dir / "%(title)s [%(id)s].%(ext)s")
        common = {
            "outtmpl": outtmpl,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            **self._ffmpeg_options(),
        }

        if media_format is MediaFormat.MP3:
            return {
                **common,
                "format": "bestaudio/best",
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": "192",
                    }
                ],
            }

        return {
            **common,
            "format": (
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/"
                "bestvideo+bestaudio/best[ext=mp4]/best"
            ),
            "merge_output_format": "mp4",
        }

    def _resolve_output_path(
        self,
        info: dict,
        collected_paths: list[str],
        prepared_path: Path | None,
        output_dir: Path,
        media_format: MediaFormat,
    ) -> Path:
        requested_ext = f".{media_format.value}"
        candidates: list[Path] = []

        if prepared_path is not None:
            candidates.append(prepared_path)

        for raw in reversed(collected_paths):
            path = Path(raw)
            candidates.append(path)
            candidates.append(path.with_suffix(requested_ext))

        video_id = str(info.get("id") or "")
        if video_id and output_dir.exists():
            needle = f"[{video_id}]{requested_ext}"
            for path in output_dir.iterdir():
                if path.is_file() and path.name.endswith(needle):
                    candidates.append(path)

        for path in candidates:
            if path.exists() and path.is_file():
                return path.resolve()

        raise DownloadFailedError("Download concluído, mas o arquivo final não foi encontrado.")
