from __future__ import annotations

import logging
from io import BytesIO
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from PIL import Image

logger = logging.getLogger(__name__)

MAX_BYTES = 5 * 1024 * 1024
TIMEOUT_SECONDS = 15


class ThumbnailLoader:
    def load(self, url: str, max_size: tuple[int, int] = (640, 360)) -> Image.Image | None:
        if not url:
            return None

        try:
            request = Request(
                url,
                headers={"User-Agent": "YouTubeExtractor/1.0"},
                method="GET",
            )
            with urlopen(request, timeout=TIMEOUT_SECONDS) as response:
                content_type = response.headers.get("Content-Type", "")
                if content_type and not content_type.startswith("image/"):
                    logger.warning("Thumbnail com content-type inesperado: %s", content_type)
                    return None
                data = response.read(MAX_BYTES + 1)
        except (HTTPError, URLError, TimeoutError, ValueError, OSError) as error:
            logger.warning("Falha ao carregar thumbnail: %s", error)
            return None

        if not data or len(data) > MAX_BYTES:
            logger.warning("Thumbnail inválida ou muito grande")
            return None

        try:
            image = Image.open(BytesIO(data))
            image = image.convert("RGB")
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            return image
        except OSError as error:
            logger.warning("Falha ao decodificar thumbnail: %s", error)
            return None
