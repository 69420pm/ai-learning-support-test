from __future__ import annotations

from pathlib import Path
from typing import Optional, Set

from .cli import CLI
from .models import AppState, PDFDocument
from .services.pdf_loader import PDFValidationError, load_pdf, validate_pdf_path


class PDFCollectorApp:
    """
    Application service that orchestrates the CLI flow.

    Responsibilities:
    - Show user-facing prompts/messages through the CLI adapter
    - Collect user input until a stop word is entered
    - Validate and load PDFs immediately
    - Maintain in-memory state of loaded documents
    """

    def __init__(
        self,
        cli: CLI,
        stop_words: Optional[Set[str]] = None,
    ) -> None:
        self.cli = cli
        self.state = AppState()
        self.stop_words = stop_words or {"done", "exit", "quit", "q"}

    def run(self) -> list[PDFDocument]:
        """Run the collection flow and return all successfully loaded PDFs."""
        self.cli.show_welcome(self.stop_words)

        while True:
            user_input = self.cli.ask_for_path()

            if user_input.lower() in self.stop_words:
                break

            try:
                path = validate_pdf_path(user_input)

                if self._is_duplicate(path):
                    self.cli.show_duplicate_warning(path)
                    continue

                loaded = load_pdf(path)
                document = PDFDocument(
                    path=loaded["path"],
                    size_bytes=loaded["size_bytes"],
                )
                self.state.pdf_documents.append(document)
                self.cli.show_loaded(document)

            except PDFValidationError as exc:
                self.cli.show_error(str(exc))
                self.cli.show_error("Please try again with a valid PDF path.")

        self.cli.show_summary(self.state.pdf_documents)
        return self.state.pdf_documents

    def _is_duplicate(self, path: Path) -> bool:
        return any(doc.path == path for doc in self.state.pdf_documents)
