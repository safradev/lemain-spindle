from __future__ import annotations

from collections.abc import Callable
from pathlib import Path
from typing import Protocol

from src.domain.entities import DownloadRequest, DownloadResult, ProgressEvent, VideoInfo


class VideoGateway(Protocol):
    def fetch_info(self, url: str) -> VideoInfo: ...

    def download(
        self,
        request: DownloadRequest,
        on_progress: Callable[[ProgressEvent], None] | None = None,
    ) -> DownloadResult: ...


class UrlValidator(Protocol):
    def normalize(self, raw_url: str) -> str: ...


class PathValidator(Protocol):
    def ensure_output_dir(self, raw_path: str | Path) -> Path: ...
