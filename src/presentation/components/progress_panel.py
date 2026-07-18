from __future__ import annotations

import customtkinter as ctk

from src.presentation.theme import COLORS, FONTS


class ProgressPanel(ctk.CTkFrame):
    def __init__(self, master, **kwargs) -> None:
        super().__init__(master, fg_color="transparent", **kwargs)

        self.status_label = ctk.CTkLabel(
            self,
            text="Pronto para extrair",
            text_color=COLORS["ink_soft"],
            anchor="w",
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1]),
        )
        self.status_label.pack(fill="x", pady=(0, 8))

        self.bar = ctk.CTkProgressBar(
            self,
            height=10,
            corner_radius=8,
            progress_color=COLORS["progress"],
            fg_color=COLORS["surface_muted"],
        )
        self.bar.pack(fill="x")
        self.bar.set(0)

    def set_status(self, message: str, *, is_error: bool = False) -> None:
        color = COLORS["danger"] if is_error else COLORS["ink_soft"]
        self.status_label.configure(text=message, text_color=color)

    def set_progress(self, percent: float) -> None:
        value = max(0.0, min(100.0, percent)) / 100.0
        self.bar.set(value)

    def reset(self) -> None:
        self.set_progress(0)
        self.set_status("Pronto para extrair")
