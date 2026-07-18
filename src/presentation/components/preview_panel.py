from __future__ import annotations

from collections.abc import Callable

import customtkinter as ctk
from PIL import Image

from src.domain.entities import VideoInfo
from src.presentation.theme import COLORS, FONTS


class PreviewPanel(ctk.CTkFrame):
    def __init__(self, master, on_extract: Callable[[], None], **kwargs) -> None:
        super().__init__(
            master,
            fg_color=COLORS["surface"],
            corner_radius=16,
            border_width=1,
            border_color=COLORS["border"],
            **kwargs,
        )
        self._on_extract = on_extract
        self._image_ref: ctk.CTkImage | None = None
        self._video_ready = False

        inner = ctk.CTkFrame(self, fg_color="transparent")
        inner.pack(fill="both", expand=True, padx=20, pady=20)

        self.thumbnail_label = ctk.CTkLabel(
            inner,
            text="Cole um link e valide o vídeo",
            text_color=COLORS["ink_soft"],
            fg_color=COLORS["surface_muted"],
            corner_radius=12,
            width=640,
            height=280,
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1]),
        )
        self.thumbnail_label.pack(fill="x", pady=(0, 16))

        self.title_label = ctk.CTkLabel(
            inner,
            text="Nenhum vídeo selecionado",
            text_color=COLORS["ink"],
            anchor="w",
            justify="left",
            font=ctk.CTkFont(family=FONTS["title"][0], size=FONTS["title"][1], weight="bold"),
        )
        self.title_label.pack(fill="x")

        self.meta_label = ctk.CTkLabel(
            inner,
            text="Título, canal e duração aparecem aqui",
            text_color=COLORS["ink_soft"],
            anchor="w",
            justify="left",
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1]),
        )
        self.meta_label.pack(fill="x", pady=(6, 14))

        self.extract_button = ctk.CTkButton(
            inner,
            text="Iniciar extração",
            width=180,
            height=42,
            corner_radius=10,
            fg_color=COLORS["accent"],
            hover_color=COLORS["accent_hover"],
            text_color="#FFFFFF",
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1], weight="bold"),
            command=self._on_extract,
            state="disabled",
        )
        self.extract_button.pack(anchor="w")

    def show_placeholder(self, message: str = "Cole um link e valide o vídeo") -> None:
        self._image_ref = None
        self._video_ready = False
        self.thumbnail_label.configure(image=None, text=message)
        self.title_label.configure(text="Nenhum vídeo selecionado")
        self.meta_label.configure(text="Título, canal e duração aparecem aqui")
        self.extract_button.configure(state="disabled")

    def show_video(self, info: VideoInfo, thumbnail: Image.Image | None) -> None:
        self._video_ready = True
        self.title_label.configure(text=info.title)
        self.meta_label.configure(
            text=f"{info.channel}  ·  {info.duration_label}"
        )
        self.extract_button.configure(state="normal")

        if thumbnail is None:
            self._image_ref = None
            self.thumbnail_label.configure(image=None, text="Thumbnail indisponível")
            return

        self._image_ref = ctk.CTkImage(
            light_image=thumbnail,
            dark_image=thumbnail,
            size=thumbnail.size,
        )
        self.thumbnail_label.configure(image=self._image_ref, text="")

    def set_extract_enabled(self, enabled: bool) -> None:
        can_extract = enabled and self._video_ready
        self.extract_button.configure(state="normal" if can_extract else "disabled")
