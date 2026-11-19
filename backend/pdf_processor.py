"""Memory-conscious PDF extraction with page batches and optional OCR."""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Callable, Optional

from pypdf import PdfReader


def clean_text(text: str) -> str:
    return " ".join((text or "").replace("\x00", " ").split())


def create_chunks(text: str, chunk_size: int = 1000, overlap: int = 100):
    text = clean_text(text)
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + chunk_size, len(text))
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return chunks


def _ocr_page(pdf_path: Path, page_number: int) -> str:
    """OCR one page when PyMuPDF and Tesseract are installed."""
    try:
        import fitz  # PyMuPDF
        import pytesseract
        from PIL import Image

        with fitz.open(pdf_path) as document:
            page = document.load_page(page_number)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(1.7, 1.7), alpha=False)
            image = Image.open(BytesIO(pixmap.tobytes("png")))
            return clean_text(pytesseract.image_to_string(image))
    except Exception:
        # OCR is optional. Text extraction can still continue for digital pages.
        return ""


def extract_text_batches(
    pdf_path,
    progress_callback: Optional[Callable[[dict], None]] = None,
    batch_size: int = 25,
    chunk_size: int = 1000,
    overlap: int = 100,
):
    """Extract page-by-page in small batches; return chunks and extraction stats."""
    path = Path(pdf_path)
    reader = PdfReader(str(path), strict=False)
    total_pages = len(reader.pages)
    chunks = []
    pages_with_text = 0
    pages_ocr = 0
    pages_without_text = 0

    for batch_start in range(0, total_pages, batch_size):
        batch_end = min(batch_start + batch_size, total_pages)
        batch_chunks = []
        batch_text_pages = 0
        batch_ocr_pages = 0
        batch_empty_pages = 0
        last_batch_error = None

        # Retry a failed page batch once. Page-level extraction also has its own retry.
        for batch_attempt in range(2):
            try:
                batch_chunks = []
                batch_text_pages = 0
                batch_ocr_pages = 0
                batch_empty_pages = 0
                for page_index in range(batch_start, batch_end):
                    page_text = ""
                    for page_attempt in range(2):
                        try:
                            page_text = clean_text(reader.pages[page_index].extract_text() or "")
                            break
                        except Exception:
                            if page_attempt == 1:
                                page_text = ""

                    if page_text:
                        batch_text_pages += 1
                    else:
                        page_text = _ocr_page(path, page_index)
                        if page_text:
                            batch_ocr_pages += 1
                        else:
                            batch_empty_pages += 1

                    if page_text:
                        for part_number, chunk in enumerate(create_chunks(page_text, chunk_size, overlap), start=1):
                            batch_chunks.append(f"[Page {page_index + 1} | Part {part_number}] {chunk}")
                last_batch_error = None
                break
            except Exception as exc:
                last_batch_error = exc
                if batch_attempt == 1:
                    raise RuntimeError(
                        f"Could not process PDF pages {batch_start + 1}-{batch_end} after retry: {exc}"
                    ) from exc

        if last_batch_error:
            raise last_batch_error
        pages_with_text += batch_text_pages
        pages_ocr += batch_ocr_pages
        pages_without_text += batch_empty_pages
        chunks.extend(batch_chunks)
        if progress_callback:
            progress_callback({
                "stage": "extracting",
                "processed_pages": batch_end,
                "total_pages": total_pages,
                "progress": round((batch_end / max(total_pages, 1)) * 75),
                "total_chunks": len(chunks),
                "pages_with_text": pages_with_text,
                "pages_ocr": pages_ocr,
                "pages_without_text": pages_without_text,
            })

    stats = {
        "total_pages": total_pages,
        "pages_with_text": pages_with_text,
        "pages_ocr": pages_ocr,
        "pages_without_text": pages_without_text,
    }
    return chunks, stats


def extract_text(pdf_path):
    """Backward-compatible helper used by the local test script."""
    reader = PdfReader(str(pdf_path), strict=False)
    return "\n".join(clean_text(page.extract_text() or "") for page in reader.pages)
