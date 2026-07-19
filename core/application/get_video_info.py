from __future__ import annotations

from core.domain.entities import VideoInfo
from core.domain.ports import UrlValidator, VideoGateway


class GetVideoInfo:
    def __init__(self, gateway: VideoGateway, url_validator: UrlValidator) -> None:
        self._gateway = gateway
        self._url_validator = url_validator

    def execute(self, raw_url: str) -> VideoInfo:
        url = self._url_validator.normalize(raw_url)
        return self._gateway.fetch_info(url)
