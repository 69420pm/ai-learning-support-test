from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class PDFDocument:
    """Represents a validated and loaded PDF file."""
    path: Path
    size_bytes: int


@dataclass
class AppState:
    """Mutable application state for the PDF collector app."""
    pdf_documents: list[PDFDocument] = field(default_factory=list)
