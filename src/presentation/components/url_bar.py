from __future__ import annotations

from collections.abc import Callable

import customtkinter as ctk

from src.presentation.theme import COLORS, FONTS


class UrlBar(ctk.CTkFrame):
    def __init__(self, master, on_preview: Callable[[], None], **kwargs) -> None:
        super().__init__(master, fg_color="transparent", **kwargs)
        self._on_preview = on_preview

        label = ctk.CTkLabel(
            self,
            text="LINK DO YOUTUBE",
            text_color=COLORS["ink_soft"],
            font=ctk.CTkFont(family=FONTS["label"][0], size=FONTS["label"][1], weight="bold"),
        )
        label.pack(anchor="w", pady=(0, 8))

        row = ctk.CTkFrame(self, fg_color="transparent")
        row.pack(fill="x")

        self.entry = ctk.CTkEntry(
            row,
            height=44,
            corner_radius=10,
            border_width=1,
            border_color=COLORS["border"],
            fg_color=COLORS["surface"],
            text_color=COLORS["ink"],
            placeholder_text="Cole o link do vídeo aqui",
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1]),
        )
        self.entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.entry.bind("<Return>", lambda _event: self._on_preview())

        self.preview_button = ctk.CTkButton(
            row,
            text="Validar",
            width=150,
            height=44,
            corner_radius=10,
            fg_color=COLORS["accent"],
            hover_color=COLORS["accent_hover"],
            text_color="#FFFFFF",
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1], weight="bold"),
            command=self._on_preview,
        )
        self.preview_button.pack(side="right")

    def get_url(self) -> str:
        return self.entry.get().strip()

    def set_enabled(self, enabled: bool) -> None:
        state = "normal" if enabled else "disabled"
        self.entry.configure(state=state)
        self.preview_button.configure(state=state)
