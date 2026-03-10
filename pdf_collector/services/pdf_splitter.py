from pathlib import Path
from typing import Sequence

from pypdf import PdfReader, PdfWriter

from pdf_collector.models import PDFDocument


def split_documents(documents: Sequence[PDFDocument | Path | str]) -> dict[Path, list[Path]]:
    """
    Process incoming PDF documents by splitting each one into overlapping chunks.

    Returns:
        A mapping of source PDF path -> created chunk paths.
    """
    pdf_paths = _normalize_document_paths(documents)
    chunk_index: dict[Path, list[Path]] = {}

    for pdf_path in pdf_paths:
        chunk_index[pdf_path] = chunk_pdf_with_overlapping_boundaries(
            pdf_path=pdf_path,
            chunk_size=5,
            overlap_pages=1,
        )

    return chunk_index


def flatten_chunk_index(chunk_index: dict[Path, list[Path]]) -> list[Path]:
    """
    Flatten splitter output mapping into a single list of chunk paths,
    preserving source-document order and per-document chunk order.
    """
    flattened: list[Path] = []
    for _, chunk_paths in chunk_index.items():
        flattened.extend(chunk_paths)
    return flattened


def split_documents_flat(documents: Sequence[PDFDocument | Path | str]) -> list[Path]:
    """
    Split documents using the default splitter behavior and return
    a flat list of chunk paths.
    """
    return flatten_chunk_index(split_documents(documents))

def chunk_pdf_with_overlapping_boundaries(
        pdf_path: Path,
        *,
        chunk_size: int = 5,
        overlap_pages: int = 1,
        output_dir: Path | None = None,
) -> list[Path]:
    """
    Split a PDF into chunks where each chunk overlaps with the next by boundary pages.

    Example for 15 pages with chunk_size=5 and overlap_pages=1:
    - 1..5
    - 5..10
    - 10..15

    Notes:
    - This implementation follows your requested behavior exactly.
    - The next chunk starts at the previous chunk's last page.
    - The final chunk always includes the last page of the source PDF.
    """
    if chunk_size < 2:
        raise ValueError("chunk_size must be at least 2")
    if overlap_pages < 1:
        raise ValueError("overlap_pages must be at least 1")
    if overlap_pages >= chunk_size:
        raise ValueError("overlap_pages must be smaller than chunk_size")

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)

    if total_pages == 0:
        return []

    if output_dir is None:
        output_dir = pdf_path.parent / "chunks"

    output_dir.mkdir(parents=True, exist_ok=True)

    stem = pdf_path.stem
    chunk_paths: list[Path] = []

    # 1-based indexing for page ranges in range tuples: (start, end), both inclusive.
    ranges: list[tuple[int, int]] = []
    start = 1

    # Step matches requested pattern: 1-5, 5-10, 10-15...
    step = chunk_size - overlap_pages

    while start <= total_pages:
        end = start + chunk_size - 1
        if end > total_pages:
            end = total_pages

        ranges.append((start, end))

        if end == total_pages:
            break

        start += step

    for idx, (start_page, end_page) in enumerate(ranges, start=1):
        writer = PdfWriter()
        for page_num in range(start_page, end_page + 1):
            writer.add_page(reader.pages[page_num - 1])  # convert to 0-based index

        chunk_name = f"{stem}_chunk_{idx:03d}_p{start_page:04d}-p{end_page:04d}.pdf"
        chunk_path = output_dir / chunk_name
        with chunk_path.open("wb") as handle:
            writer.write(handle)

        chunk_paths.append(chunk_path)

    return chunk_paths


def _normalize_document_paths(documents: Sequence[PDFDocument | Path | str]) -> list[Path]:
    """
    Normalize supported document inputs into Path objects.
    """
    normalized: list[Path] = []
    for document in documents:
        if isinstance(document, PDFDocument):
            normalized.append(document.path)
        elif isinstance(document, Path):
            normalized.append(document)
        elif isinstance(document, str):
            normalized.append(Path(document))
        else:
            raise TypeError(f"Unsupported document type: {type(document)!r}")
    return normalized
