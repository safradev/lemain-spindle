from __future__ import annotations

import logging
from pathlib import Path

import customtkinter as ctk

from src.application.download_media import DownloadMedia
from src.application.get_video_info import GetVideoInfo
from src.domain.entities import DownloadResult, ProgressEvent, VideoInfo
from src.domain.errors import AppError
from src.infrastructure.output_path import OutputPathValidator
from src.infrastructure.thumbnail_loader import ThumbnailLoader
from src.infrastructure.youtube_url import YoutubeUrlValidator
from src.infrastructure.ytdlp_gateway import YtDlpVideoGateway
from src.presentation.components.folder_picker import FolderPicker
from src.presentation.components.format_picker import FormatPicker
from src.presentation.components.preview_panel import PreviewPanel
from src.presentation.components.progress_panel import ProgressPanel
from src.presentation.components.url_bar import UrlBar
from src.presentation.theme import COLORS, FONTS
from src.presentation.workers import BackgroundWorker

logger = logging.getLogger(__name__)


class YouTubeExtractorApp(ctk.CTk):
    def __init__(
        self,
        get_video_info: GetVideoInfo,
        download_media: DownloadMedia,
        thumbnail_loader: ThumbnailLoader,
        default_output_dir: Path,
    ) -> None:
        super().__init__()
        self._get_video_info = get_video_info
        self._download_media = download_media
        self._thumbnail_loader = thumbnail_loader
        self._worker = BackgroundWorker()
        self._current_video: VideoInfo | None = None
        self._busy = False

        self.title("YouTube Extractor")
        self.geometry("820x820")
        self.minsize(720, 760)
        self.configure(fg_color=COLORS["bg"])

        ctk.set_appearance_mode("light")
        ctk.set_default_color_theme("green")

        self._build_layout(default_output_dir)
        self.after(120, self._poll_worker)

    def _build_layout(self, default_output_dir: Path) -> None:
        container = ctk.CTkFrame(self, fg_color="transparent")
        container.pack(fill="both", expand=True, padx=36, pady=28)

        brand = ctk.CTkLabel(
            container,
            text="YouTube Extractor",
            text_color=COLORS["ink"],
            font=ctk.CTkFont(family=FONTS["brand"][0], size=FONTS["brand"][1], weight="bold"),
        )
        brand.pack(anchor="w")

        subtitle = ctk.CTkLabel(
            container,
            text="Cole o link, valide o vídeo e inicie a extração em MP4 ou MP3.",
            text_color=COLORS["ink_soft"],
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1]),
        )
        subtitle.pack(anchor="w", pady=(4, 22))

        self.url_bar = UrlBar(container, on_preview=self._on_preview)
        self.url_bar.pack(fill="x", pady=(0, 18))

        self.preview_panel = PreviewPanel(container, on_extract=self._on_download)
        self.preview_panel.pack(fill="both", expand=True, pady=(0, 18))

        controls = ctk.CTkFrame(container, fg_color="transparent")
        controls.pack(fill="x", pady=(0, 18))

        self.format_picker = FormatPicker(controls)
        self.format_picker.pack(side="left", fill="x", expand=True, padx=(0, 12))

        self.folder_picker = FolderPicker(controls, initial_path=default_output_dir)
        self.folder_picker.pack(side="left", fill="x", expand=True)

        self.progress_panel = ProgressPanel(container)
        self.progress_panel.pack(fill="x")

    def _set_busy(self, busy: bool) -> None:
        self._busy = busy
        enabled = not busy
        self.url_bar.set_enabled(enabled)
        self.format_picker.set_enabled(enabled)
        self.folder_picker.set_enabled(enabled)
        self.preview_panel.set_extract_enabled(enabled)

    def _on_preview(self) -> None:
        if self._busy:
            return

        url = self.url_bar.get_url()
        self._set_busy(True)
        self.progress_panel.set_progress(0)
        self.progress_panel.set_status("Validando vídeo...")
        self.preview_panel.show_placeholder("Validando vídeo...")

        def work():
            info = self._get_video_info.execute(url)
            thumbnail = self._thumbnail_loader.load(info.thumbnail_url)
            return info, thumbnail

        self._worker.submit("preview", work)

    def _on_download(self) -> None:
        if self._busy or self._current_video is None:
            return

        url = self.url_bar.get_url()
        media_format = self.format_picker.get_format()
        output_dir = self.folder_picker.get_path()

        self._set_busy(True)
        self.progress_panel.set_progress(0)
        self.progress_panel.set_status("Iniciando extração...")

        def on_progress(event: ProgressEvent) -> None:
            self._worker.push(
                "download_progress",
                {"percent": event.percent, "status": event.status},
            )

        def work() -> DownloadResult:
            return self._download_media.execute(
                raw_url=url,
                media_format=media_format,
                raw_output_dir=output_dir,
                on_progress=on_progress,
            )

        self._worker.submit("download", work)

    def _poll_worker(self) -> None:
        for message in self._worker.poll():
            self._handle_message(message)
        self.after(120, self._poll_worker)

    def _handle_message(self, message) -> None:
        kind = message.kind
        payload = message.payload

        if kind == "preview_ok":
            info, thumbnail = payload
            self._current_video = info
            self.preview_panel.show_video(info, thumbnail)
            self.progress_panel.set_status(
                "Vídeo validado. Escolha o formato e inicie a extração."
            )
            self._set_busy(False)
            return

        if kind == "preview_error":
            self._current_video = None
            self.preview_panel.show_placeholder("Não foi possível validar o vídeo")
            self.progress_panel.set_status(self._friendly_error(payload), is_error=True)
            self._set_busy(False)
            return

        if kind == "download_progress":
            self.progress_panel.set_progress(float(payload["percent"]))
            self.progress_panel.set_status(str(payload["status"]))
            return

        if kind == "download_ok":
            result: DownloadResult = payload
            self.progress_panel.set_progress(100)
            self.progress_panel.set_status(
                f"Salvo em: {result.output_path}"
            )
            self._set_busy(False)
            return

        if kind == "download_error":
            self.progress_panel.set_status(self._friendly_error(payload), is_error=True)
            self._set_busy(False)

    @staticmethod
    def _friendly_error(error: object) -> str:
        if isinstance(error, AppError):
            return error.message
        if isinstance(error, BaseException):
            logger.error("Erro inesperado na UI", exc_info=error)
        return "Ocorreu um erro inesperado. Tente novamente."


def build_app(default_output_dir: Path | None = None) -> YouTubeExtractorApp:
    gateway = YtDlpVideoGateway()
    url_validator = YoutubeUrlValidator()
    path_validator = OutputPathValidator()
    get_video_info = GetVideoInfo(gateway=gateway, url_validator=url_validator)
    download_media = DownloadMedia(
        gateway=gateway,
        url_validator=url_validator,
        path_validator=path_validator,
    )
    thumbnail_loader = ThumbnailLoader()
    output_dir = default_output_dir or (Path.home() / "Downloads")
    return YouTubeExtractorApp(
        get_video_info=get_video_info,
        download_media=download_media,
        thumbnail_loader=thumbnail_loader,
        default_output_dir=output_dir,
    )


def run_app() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    app = build_app()
    app.mainloop()
