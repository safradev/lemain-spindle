from __future__ import annotations

import logging
import os
from pathlib import Path

from src.domain.errors import InvalidPathError

logger = logging.getLogger(__name__)


class OutputPathValidator:
    def ensure_output_dir(self, raw_path: str | Path) -> Path:
        if raw_path is None or (isinstance(raw_path, str) and not raw_path.strip()):
            raise InvalidPathError("Informe uma pasta de destino.")

        try:
            path = Path(raw_path).expanduser()
            if not path.is_absolute():
                path = (Path.cwd() / path).resolve()
            else:
                path = path.resolve()
        except (OSError, RuntimeError, ValueError) as error:
            logger.exception("Falha ao resolver pasta de destino")
            raise InvalidPathError("Pasta de destino inválida.") from error

        if path.exists() and not path.is_dir():
            raise InvalidPathError("O caminho informado não é uma pasta.")

        try:
            path.mkdir(parents=True, exist_ok=True)
        except OSError as error:
            logger.exception("Falha ao criar pasta de destino: %s", path)
            raise InvalidPathError("Não foi possível criar a pasta de destino.") from error

        if not os.access(path, os.W_OK):
            raise InvalidPathError("A pasta de destino não tem permissão de escrita.")

        return path
