from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from pathlib import Path


class MediaFormat(str, Enum):
    MP4 = "mp4"
    MP3 = "mp3"


@dataclass(frozen=True, slots=True)
class VideoInfo:
    video_id: str
    title: str
    channel: str
    duration_seconds: int
    thumbnail_url: str
    webpage_url: str

    @property
    def embed_url(self) -> str:
        return f"https://www.youtube.com/embed/{self.video_id}"

    @property
    def duration_label(self) -> str:
        total = max(0, int(self.duration_seconds))
        hours, remainder = divmod(total, 3600)
        minutes, seconds = divmod(remainder, 60)
        if hours:
            return f"{hours}:{minutes:02d}:{seconds:02d}"
        return f"{minutes}:{seconds:02d}"


@dataclass(frozen=True, slots=True)
class DownloadRequest:
    url: str
    media_format: MediaFormat
    output_dir: Path


@dataclass(frozen=True, slots=True)
class DownloadResult:
    output_path: Path
    title: str
    media_format: MediaFormat


@dataclass(frozen=True, slots=True)
class ProgressEvent:
    percent: float
    status: str
