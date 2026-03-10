from __future__ import annotations

from pathlib import Path
from typing import Callable, Sequence

from .models import PDFDocument


class CLI:
    """
    Input/output adapter for terminal interactions.

    This class is intentionally tiny and framework-agnostic so it can be
    swapped or mocked in tests.
    """

    def __init__(
        self,
        input_fn: Callable[[str], str] = input,
        output_fn: Callable[[str], None] = print,
    ) -> None:
        self._input = input_fn
        self._output = output_fn

    def show_welcome(self, stop_words: set[str]) -> None:
        self._output("=" * 68)
        self._output("📚 PDF Collector CLI")
        self._output("Add PDF files one by one. Each file is validated immediately.")
        self._output(f"Type one of {sorted(stop_words)} to finish input.")
        self._output("=" * 68)

    def ask_for_path(self) -> str:
        return self._input("Enter path to PDF: ").strip()

    def show_loaded(self, document: PDFDocument) -> None:
        kb = document.size_bytes / 1024
        self._output(f"✅ Loaded: {document.path} ({kb:.1f} KB)")

    def show_error(self, message: str) -> None:
        self._output(f"❌ {message}")

    def show_duplicate_warning(self, path: Path) -> None:
        self._output(f"⚠️  Already added, skipping duplicate: {path}")

    def show_summary(self, docs: Sequence[PDFDocument]) -> None:
        self._output("\nSummary")
        self._output("-" * 68)
        self._output(f"Total valid PDFs loaded: {len(docs)}")
        for i, doc in enumerate(docs, start=1):
            self._output(f"{i:>2}. {doc.path}")
        self._output("-" * 68)
