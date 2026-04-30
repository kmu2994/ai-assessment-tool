"""
Text Extraction and OCR Processor
Handles PDF, DOCX, TXT, and Image (OCR) extraction.
Uses OpenCV preprocessing for improved handwriting accuracy.
"""
import io
import os
import logging
from typing import Optional

# Document parsers
try:
    import pypdf  # preferred — actively maintained fork of PyPDF2
    _PDF_BACKEND = "pypdf"
except ImportError:
    try:
        import PyPDF2  # fallback if pypdf not installed
        _PDF_BACKEND = "PyPDF2"
    except ImportError:
        _PDF_BACKEND = None

import docx

# OCR / Image libs
import pytesseract
from PIL import Image

# OpenCV for preprocessing (optional — graceful fallback)
try:
    import cv2
    import numpy as np
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

# Auto-detect Tesseract path (cross-platform)
_tesseract_env = os.getenv("TESSERACT_CMD")
if _tesseract_env:
    pytesseract.pytesseract.tesseract_cmd = _tesseract_env
elif os.name == 'nt':  # Windows
    _win_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(_win_path):
        pytesseract.pytesseract.tesseract_cmd = _win_path
# On Linux/Mac, tesseract is usually in PATH — no config needed

logger = logging.getLogger(__name__)


class TextExtractionAgent:
    def __init__(self):
        self.confidence_threshold = 60
        logger.info(
            f"TextExtractionAgent initialized. "
            f"PDF backend={_PDF_BACKEND}, OpenCV={'available' if _CV2_AVAILABLE else 'unavailable (no preprocessing)'}"
        )

    def extract_text_from_bytes(self, content: bytes, filename: str) -> str:
        """Determines file type and extracts text accordingly."""
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        try:
            if ext == 'pdf':
                return self._extract_pdf(content)
            elif ext in ('doc', 'docx'):
                return self._extract_docx(content)
            elif ext == 'txt':
                return content.decode('utf-8', errors='ignore')
            elif ext in ('png', 'jpg', 'jpeg', 'bmp', 'tiff', 'webp'):
                return self._extract_ocr(content)
            else:
                raise ValueError(f"Unsupported file type: .{ext}")
        except Exception as e:
            logger.error(f"Error extracting text from '{filename}': {e}")
            raise

    # ── PDF ──────────────────────────────────────────────────────────────────

    def _extract_pdf(self, content: bytes) -> str:
        """Extracts text from a PDF. Falls back to a helpful message for scanned PDFs."""
        if _PDF_BACKEND is None:
            raise RuntimeError("No PDF library available. Install 'pypdf'.")

        pdf_file = io.BytesIO(content)
        text = ""

        if _PDF_BACKEND == "pypdf":
            reader = pypdf.PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"
        else:
            import PyPDF2
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text() or ""
                text += page_text + "\n"

        if not text.strip():
            logger.info("PDF has no selectable text — likely a scanned image PDF.")
            return (
                "Could not extract text from this PDF. "
                "It appears to be a scanned image PDF. "
                "Please upload a text-based PDF or an image file instead."
            )

        return text.strip()

    # ── DOCX ─────────────────────────────────────────────────────────────────

    def _extract_docx(self, content: bytes) -> str:
        """Extracts text from Word documents."""
        doc_file = io.BytesIO(content)
        doc = docx.Document(doc_file)
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        return "\n".join(paragraphs)

    # ── OCR ──────────────────────────────────────────────────────────────────

    def _extract_ocr(self, content: bytes) -> str:
        """
        Perform OCR on images using Tesseract.
        If OpenCV is available, applies preprocessing for better accuracy:
          1. Convert to grayscale
          2. Adaptive thresholding (handles uneven lighting)
          3. Noise removal (median blur)
          4. Slight upscaling for small text
        """
        logger.info(f"Running OCR on buffer ({len(content)} bytes).")

        if _CV2_AVAILABLE:
            return self._extract_ocr_with_opencv(content)
        else:
            logger.warning("OpenCV not available — using raw Tesseract (lower accuracy).")
            return self._extract_ocr_raw(content)

    def _extract_ocr_with_opencv(self, content: bytes) -> str:
        """High-quality OCR with OpenCV preprocessing."""
        # Decode to numpy array
        nparr = np.frombuffer(content, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            logger.error("OpenCV failed to decode image. Falling back to PIL.")
            return self._extract_ocr_raw(content)

        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 2. Upscale if image is too small (improves OCR on thumbnails)
        h, w = gray.shape
        if h < 600 or w < 600:
            scale = max(600 / h, 600 / w)
            gray = cv2.resize(gray, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_CUBIC)

        # 3. Noise removal
        gray = cv2.medianBlur(gray, 3)

        # 4. Adaptive thresholding — handles shadows and uneven lighting
        thresh = cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            blockSize=11,
            C=2,
        )

        # 5. Convert back to PIL for Tesseract
        pil_image = Image.fromarray(thresh)

        # 6. OCR with page-segmentation mode 6 (assume a single uniform block of text)
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(pil_image, config=custom_config)
        logger.info(f"OCR extracted {len(text)} characters (OpenCV-enhanced).")
        return text.strip()

    def _extract_ocr_raw(self, content: bytes) -> str:
        """Raw OCR fallback using PIL only."""
        try:
            image = Image.open(io.BytesIO(content))
            text = pytesseract.image_to_string(image)
            logger.info(f"OCR extracted {len(text)} characters (raw PIL).")
            return text.strip()
        except Exception as e:
            logger.error(f"PIL OCR failed: {e}")
            raise


# Singleton instance
ocr_agent = TextExtractionAgent()
HandwritingAgent = TextExtractionAgent  # Alias for backward compatibility
