# app/ocr.py
import os
from collections import defaultdict
from typing import List
from datetime import datetime
import logging

from pdf2image import convert_from_path
from PIL import Image
import pytesseract

from app.schemas import OCRDocument, PageOCR, Block, Line, Word
from app.log import logger   # main logger


# -------------------------------------------------------------------------
# CREATE A UNIQUE LOG FILE FOR EVERY OCR RUN
# -------------------------------------------------------------------------
def create_run_logger():
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_dir = "logs/ocr_runs"
    os.makedirs(log_dir, exist_ok=True)

    file_path = f"{log_dir}/ocr_run_{timestamp}.log"

    run_logger = logging.getLogger(f"OCR_RUN_{timestamp}")
    run_logger.setLevel(logging.DEBUG)

    file_handler = logging.FileHandler(file_path)
    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler.setFormatter(formatter)

    run_logger.addHandler(file_handler)

    run_logger.info("=== NEW OCR RUN STARTED ===")
    run_logger.info(f"Log file: {file_path}")

    return run_logger


# Optional: tesseract cmd from config
try:
    from .config import TESSERACT_CMD
except Exception:
    TESSERACT_CMD = None

if TESSERACT_CMD:
    if os.path.isfile(TESSERACT_CMD) and os.access(TESSERACT_CMD, os.X_OK):
        pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
        logger.info(f"Tesseract executable set to: {TESSERACT_CMD}")
    else:
        logger.error(f"Invalid TESSERACT_CMD: {TESSERACT_CMD}")
        raise ValueError(f"TESSERACT_CMD '{TESSERACT_CMD}' does not exist or is not executable.")
else:
    logger.warning("TESSERACT_CMD not set; using system-installed tesseract.")


# -------------------------------------------------------------------------
# PDF TO IMAGE
# -------------------------------------------------------------------------
def pdf_to_images(pdf_path: str, dpi: int = 300, run_logger=None) -> List[Image.Image]:
    run_logger.info(f"Starting PDF → image conversion: {pdf_path}")
    try:
        images = convert_from_path(pdf_path, dpi=dpi)
        run_logger.info(f"PDF conversion successful. Pages extracted: {len(images)}")
        return images
    except Exception as e:
        run_logger.exception(f"PDF conversion failed: {e}")
        raise


# -------------------------------------------------------------------------
# IMAGE OCR PARSER
# -------------------------------------------------------------------------
# def image_to_ocr_structure(img: Image.Image, page_num: int, run_logger=None) -> PageOCR:
#     run_logger.info(f"Running OCR on page {page_num}...")

#     try:
#         data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
#         run_logger.info(f"OCR returned {len(data.get('text', []))} text entries.")
#     except Exception as e:
#         run_logger.exception(f"Tesseract error on page {page_num}: {e}")
#         raise

#     n = len(data.get("level", []))
#     blocks_map = defaultdict(lambda: defaultdict(list))

#     for i in range(n):
#         text = (data.get("text", [])[i] or "").strip()
#         if not text:
#             continue

#         block_num = int(data.get("block_num", [0] * n)[i])
#         line_num = int(data.get("line_num", [0] * n)[i])

#         conf_raw = data.get("conf", ["-1"])[i]
#         try:
#             conf = int(float(conf_raw))
#         except Exception:
#             conf = -1

#         w = Word(
#             text=text,
#             left=int(data.get("left", [0] * n)[i]),
#             top=int(data.get("top", [0] * n)[i]),
#             width=int(data.get("width", [0] * n)[i]),
#             height=int(data.get("height", [0] * n)[i]),
#             conf=conf,
#         )

#         blocks_map[block_num][line_num].append(w)

#     blocks: List[Block] = []
#     for b in sorted(blocks_map.keys()):
#         lines: List[Line] = []
#         for l in sorted(blocks_map[b].keys()):
#             words = blocks_map[b][l]
#             line_txt = " ".join(w.text for w in words)
#             lines.append(Line(text=line_txt, words=words))
#         blocks.append(Block(lines=lines))

#     run_logger.info(f"Page {page_num} OCR complete. Blocks: {len(blocks)}")
#     return PageOCR(page_number=page_num, blocks=blocks)
def image_to_ocr_structure(img: Image.Image, page_num: int, run_logger=None) -> PageOCR:
    run_logger.info(f"Running OCR on page {page_num}...")

    try:
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        run_logger.info(f"OCR returned {len(data.get('text', []))} text entries.")
    except Exception as e:
        run_logger.exception(f"Tesseract error on page {page_num}: {e}")
        raise

    n = len(data.get("level", []))
    blocks_map = defaultdict(lambda: defaultdict(list))

    for i in range(n):
        text = (data.get("text", [])[i] or "").strip()
        if not text:
            continue

        block_num = int(data.get("block_num", [0] * n)[i])
        line_num = int(data.get("line_num", [0] * n)[i])

        conf_raw = data.get("conf", ["-1"])[i]
        try:
            conf = int(float(conf_raw))
        except Exception:
            conf = -1

        w = Word(
            text=text,
            left=int(data.get("left", [0] * n)[i]),
            top=int(data.get("top", [0] * n)[i]),
            width=int(data.get("width", [0] * n)[i]),
            height=int(data.get("height", [0] * n)[i]),
            conf=conf,
        )

        blocks_map[block_num][line_num].append(w)

    blocks: List[Block] = []
    for b in sorted(blocks_map.keys()):
        lines: List[Line] = []
        for l in sorted(blocks_map[b].keys()):
            words = blocks_map[b][l]
            line_txt = " ".join(w.text for w in words)
            lines.append(Line(text=line_txt, words=words))
        blocks.append(Block(lines=lines))

    run_logger.info(f"Page {page_num} OCR complete. Blocks: {len(blocks)}")
    
    # FIX: Add width and height from the image
    return PageOCR(
        page_number=page_num,
        width=img.width,      # Added
        height=img.height,    # Added
        blocks=blocks
    )

# -------------------------------------------------------------------------
# COMPLETE OCR PIPELINE
# -------------------------------------------------------------------------
def pdf_to_ocr(pdf_path: str, max_pages: int = 8) -> OCRDocument:
    """
    Converts PDF → OCRDocument and generates a separate log file for every run.
    """

    run_logger = create_run_logger()  
    run_logger.info(f"Starting OCR pipeline for: {pdf_path}")

    images = pdf_to_images(pdf_path, run_logger=run_logger)
    pages = []

    total_pages = min(len(images), max_pages)

    for i, img in enumerate(images[:max_pages], start=1):
        run_logger.info(f"OCR processing page {i}/{total_pages}")
        try:
            page_ocr = image_to_ocr_structure(img, page_num=i, run_logger=run_logger)
            pages.append(page_ocr)
        except Exception as e:
            run_logger.exception(f"OCR failed on page {i}: {e}")
            raise

    run_logger.info("=== OCR RUN COMPLETED SUCCESSFULLY ===")
    run_logger.info(f"Total pages processed: {len(pages)}")

    return OCRDocument(pages=pages)
