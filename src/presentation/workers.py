from __future__ import annotations

import queue
import threading
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class WorkerMessage:
    kind: str
    payload: Any = None


class BackgroundWorker:
    def __init__(self) -> None:
        self._messages: queue.Queue[WorkerMessage] = queue.Queue()

    def submit(self, kind: str, work: Callable[[], Any]) -> None:
        def runner() -> None:
            try:
                result = work()
                self._messages.put(WorkerMessage(kind=f"{kind}_ok", payload=result))
            except Exception as error:
                self._messages.put(WorkerMessage(kind=f"{kind}_error", payload=error))

        threading.Thread(target=runner, daemon=True).start()

    def push(self, kind: str, payload: Any = None) -> None:
        self._messages.put(WorkerMessage(kind=kind, payload=payload))

    def poll(self) -> list[WorkerMessage]:
        items: list[WorkerMessage] = []
        while True:
            try:
                items.append(self._messages.get_nowait())
            except queue.Empty:
                break
        return items
