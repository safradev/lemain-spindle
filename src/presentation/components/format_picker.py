from __future__ import annotations

import customtkinter as ctk

from src.domain.entities import MediaFormat
from src.presentation.theme import COLORS, FONTS


class FormatPicker(ctk.CTkFrame):
    def __init__(self, master, **kwargs) -> None:
        super().__init__(master, fg_color="transparent", **kwargs)

        label = ctk.CTkLabel(
            self,
            text="FORMATO",
            text_color=COLORS["ink_soft"],
            font=ctk.CTkFont(family=FONTS["label"][0], size=FONTS["label"][1], weight="bold"),
        )
        label.pack(anchor="w", pady=(0, 8))

        self.segment = ctk.CTkSegmentedButton(
            self,
            values=["MP4", "MP3"],
            selected_color=COLORS["accent"],
            selected_hover_color=COLORS["accent_hover"],
            unselected_color=COLORS["surface"],
            unselected_hover_color=COLORS["surface_muted"],
            text_color=COLORS["ink"],
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1], weight="bold"),
            height=40,
            corner_radius=10,
        )
        self.segment.set("MP4")
        self.segment.pack(fill="x")

    def get_format(self) -> MediaFormat:
        value = self.segment.get().lower()
        return MediaFormat.MP3 if value == "mp3" else MediaFormat.MP4

    def set_enabled(self, enabled: bool) -> None:
        self.segment.configure(state="normal" if enabled else "disabled")
