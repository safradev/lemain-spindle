#!/usr/bin/env python3

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src.application.download_media import DownloadMedia
from src.domain.entities import MediaFormat
from src.domain.errors import AppError
from src.infrastructure.output_path import OutputPathValidator
from src.infrastructure.youtube_url import YoutubeUrlValidator
from src.infrastructure.ytdlp_gateway import YtDlpVideoGateway


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Baixa vídeos do YouTube em MP4 ou MP3."
    )
    parser.add_argument(
        "urls",
        nargs="+",
        help="Uma ou mais URLs do YouTube",
    )
    parser.add_argument(
        "-f",
        "--format",
        choices=("mp4", "mp3"),
        default="mp4",
        help="Formato de saída (padrão: mp4)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path.home() / "Downloads",
        help="Pasta de destino (padrão: ~/Downloads)",
    )
    return parser


def main() -> int:
    logging.basicConfig(
        level=logging.WARNING,
        format="%(levelname)s: %(message)s",
    )
    args = build_parser().parse_args()
    media_format = MediaFormat(args.format)

    use_case = DownloadMedia(
        gateway=YtDlpVideoGateway(),
        url_validator=YoutubeUrlValidator(),
        path_validator=OutputPathValidator(),
    )

    failures: list[str] = []
    for url in args.urls:
        print(f"\nBaixando ({media_format.value}): {url}")
        try:
            result = use_case.execute(
                raw_url=url,
                media_format=media_format,
                raw_output_dir=args.output,
            )
            print(f"Salvo: {result.output_path}")
        except AppError as error:
            failures.append(url)
            print(f"Falha ao baixar {url}: {error.message}", file=sys.stderr)
        except Exception as error:
            failures.append(url)
            print(f"Erro inesperado em {url}: {error}", file=sys.stderr)

    if failures:
        print("\nNão foi possível baixar:")
        for url in failures:
            print(f"  - {url}")
        return 1

    print(f"\nConcluído. Arquivos em: {Path(args.output).expanduser().resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
