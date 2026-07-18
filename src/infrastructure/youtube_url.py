from __future__ import annotations

from urllib.parse import parse_qs, urlparse

from src.domain.errors import InvalidUrlError

ALLOWED_HOSTS = frozenset(
    {
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtu.be",
        "www.youtu.be",
    }
)


class YoutubeUrlValidator:
    def normalize(self, raw_url: str) -> str:
        if not isinstance(raw_url, str):
            raise InvalidUrlError("Informe um link válido do YouTube.")

        candidate = raw_url.strip()
        if not candidate:
            raise InvalidUrlError("Informe um link do YouTube.")

        if "://" not in candidate:
            candidate = f"https://{candidate}"

        parsed = urlparse(candidate)
        host = (parsed.hostname or "").lower()
        if host not in ALLOWED_HOSTS:
            raise InvalidUrlError("Somente links do YouTube são permitidos.")

        if parsed.scheme not in {"http", "https"}:
            raise InvalidUrlError("O link precisa usar http ou https.")

        video_id = self._extract_video_id(parsed)
        if not video_id:
            raise InvalidUrlError("Não foi possível identificar o vídeo no link.")

        return f"https://www.youtube.com/watch?v={video_id}"

    def _extract_video_id(self, parsed) -> str | None:
        host = (parsed.hostname or "").lower()
        path = (parsed.path or "").strip("/")

        if host in {"youtu.be", "www.youtu.be"}:
            video_id = path.split("/")[0] if path else ""
            return video_id if self._is_valid_id(video_id) else None

        if path == "watch":
            values = parse_qs(parsed.query).get("v", [])
            video_id = values[0] if values else ""
            return video_id if self._is_valid_id(video_id) else None

        prefixes = ("shorts/", "embed/", "live/", "v/")
        for prefix in prefixes:
            if path.startswith(prefix):
                video_id = path[len(prefix) :].split("/")[0]
                return video_id if self._is_valid_id(video_id) else None

        return None

    @staticmethod
    def _is_valid_id(video_id: str) -> bool:
        return bool(video_id) and len(video_id) == 11 and video_id.replace("-", "").replace("_", "").isalnum()
