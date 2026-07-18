from __future__ import annotations

from pathlib import Path
from tkinter import filedialog

import customtkinter as ctk

from src.presentation.theme import COLORS, FONTS


class FolderPicker(ctk.CTkFrame):
    def __init__(self, master, initial_path: Path, **kwargs) -> None:
        super().__init__(master, fg_color="transparent", **kwargs)

        label = ctk.CTkLabel(
            self,
            text="PASTA DE EXTRAÇÃO",
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
            font=ctk.CTkFont(family=FONTS["mono"][0], size=FONTS["mono"][1]),
        )
        self.entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.entry.insert(0, str(initial_path))

        self.browse_button = ctk.CTkButton(
            row,
            text="Escolher…",
            width=120,
            height=44,
            corner_radius=10,
            fg_color=COLORS["surface"],
            hover_color=COLORS["surface_muted"],
            border_width=1,
            border_color=COLORS["border"],
            text_color=COLORS["ink"],
            font=ctk.CTkFont(family=FONTS["body"][0], size=FONTS["body"][1], weight="bold"),
            command=self._browse,
        )
        self.browse_button.pack(side="right")

    def get_path(self) -> str:
        return self.entry.get().strip()

    def set_enabled(self, enabled: bool) -> None:
        state = "normal" if enabled else "disabled"
        self.entry.configure(state=state)
        self.browse_button.configure(state=state)

    def _browse(self) -> None:
        selected = filedialog.askdirectory(
            initialdir=self.get_path() or str(Path.home() / "Downloads"),
            title="Escolher pasta de extração",
        )
        if not selected:
            return
        self.entry.delete(0, "end")
        self.entry.insert(0, selected)
