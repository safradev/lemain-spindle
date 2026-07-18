from __future__ import annotations

from collections.abc import Callable
from pathlib import Path

from src.domain.entities import DownloadRequest, DownloadResult, MediaFormat, ProgressEvent
from src.domain.ports import PathValidator, UrlValidator, VideoGateway


class DownloadMedia:
    def __init__(
        self,
        gateway: VideoGateway,
        url_validator: UrlValidator,
        path_validator: PathValidator,
    ) -> None:
        self._gateway = gateway
        self._url_validator = url_validator
        self._path_validator = path_validator

    def execute(
        self,
        raw_url: str,
        media_format: MediaFormat,
        raw_output_dir: str | Path,
        on_progress: Callable[[ProgressEvent], None] | None = None,
    ) -> DownloadResult:
        url = self._url_validator.normalize(raw_url)
        output_dir = self._path_validator.ensure_output_dir(raw_output_dir)
        request = DownloadRequest(
            url=url,
            media_format=media_format,
            output_dir=output_dir,
        )
        return self._gateway.download(request, on_progress=on_progress)
