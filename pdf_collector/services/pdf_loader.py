from __future__ import annotations

from pathlib import Path
from typing import Final


PDF_HEADER_MAGIC: Final[bytes] = b"%PDF-"


class PDFValidationError(Exception):
    """Raised when a candidate PDF path fails validation or loading."""


def validate_pdf_path(candidate: str) -> Path:
    """
    Validate a user-provided path and return a normalized absolute Path.

    Rules:
    - Must not be empty
    - Must exist
    - Must be a file
    - Must have .pdf extension
    """
    raw = candidate.strip()
    if not raw:
        raise PDFValidationError("Input was empty. Please enter a file path or a stop word.")

    path = Path(raw).expanduser().resolve()

    if not path.exists():
        raise PDFValidationError(f"File does not exist: {path}")
    if not path.is_file():
        raise PDFValidationError(f"Path is not a file: {path}")
    if path.suffix.lower() != ".pdf":
        raise PDFValidationError(f"File is not a PDF (.pdf): {path.name}")

    return path


def load_pdf(path: Path) -> dict[str, object]:
    """
    Load lightweight PDF metadata after validating file signature.

    Returns a dictionary that can be mapped into your domain model.
    """
    try:
        with path.open("rb") as file:
            header = file.read(len(PDF_HEADER_MAGIC))
    except OSError as exc:
        raise PDFValidationError(f"Could not read file: {path} ({exc})") from exc

    if header != PDF_HEADER_MAGIC:
        raise PDFValidationError(
            f"The file extension is .pdf but content header looks invalid: {path.name}"
        )

    stat = path.stat()
    return {
        "path": path,
        "size_bytes": stat.st_size,
        "name": path.name,
    }
