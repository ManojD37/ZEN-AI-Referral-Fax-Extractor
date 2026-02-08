# app/ocr_free.py
"""
Free OCR engine using Tesseract for text extraction.
Provides cost-free alternative to GPT-4 Vision.
"""
import io
import re
from typing import Dict, List, Tuple, Optional
from pathlib import Path

from app.log import logger

# Try to import pytesseract and PIL
try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract or PIL not installed. Free OCR will not be available.")

# Try to import pdf2image for PDF processing
try:
    from pdf2image import convert_from_bytes
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False
    logger.warning("pdf2image not installed. PDF OCR will use fallback method.")


def is_tesseract_available() -> bool:
    """Check if Tesseract OCR is available."""
    if not TESSERACT_AVAILABLE:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Preprocess image for better OCR results.
    - Convert to grayscale
    - Upscale if needed
    - Apply adaptive thresholding (binarization)
    - Denoise
    - Enhance contrast and sharpness
    """
    # Convert to grayscale
    if image.mode != 'L':
        image = image.convert('L')
    
    # Upscale if too small (OCR works much better with larger text)
    # Aim for at least 2000px width for good character recognition
    min_width = 2000
    if image.width < min_width:
        ratio = min_width / image.width
        new_size = (int(image.width * ratio), int(image.height * ratio))
        image = image.resize(new_size, Image.LANCZOS)
        logger.info(f"Upscaled image to {new_size[0]}x{new_size[1]}")
    
    # Apply median filter to remove noise
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Enhance contrast before binarization
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.0)
    
    # Apply adaptive thresholding (binarization)
    # Convert to numpy for better thresholding
    try:
        import numpy as np
        from PIL import ImageOps
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Apply Otsu's binarization (automatic threshold detection)
        # This creates pure black/white which Tesseract loves
        threshold = np.mean(img_array)
        binary = np.where(img_array > threshold, 255, 0).astype(np.uint8)
        
        image = Image.fromarray(binary)
    except ImportError:
        # Fallback: simple thresholding without numpy
        from PIL import ImageOps
        image = ImageOps.autocontrast(image)
        # Simple threshold
        image = image.point(lambda x: 0 if x < 128 else 255, '1')
        image = image.convert('L')
    
    # Final sharpening
    image = image.filter(ImageFilter.SHARPEN)
    
    return image



def extract_text_from_image(image: Image.Image) -> Tuple[str, float]:
    """
    Extract text from a PIL Image using Tesseract.
    Returns (text, confidence_score).
    """
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("Tesseract OCR is not available")
    
    # Preprocess
    processed = preprocess_image(image)
    
    # Get detailed OCR data
    try:
        data = pytesseract.image_to_data(processed, output_type=pytesseract.Output.DICT)
        
        # Calculate average confidence
        confidences = [int(c) for c in data['conf'] if int(c) > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        
        # Get text
        text = pytesseract.image_to_string(processed)
        
        return text.strip(), avg_confidence / 100.0
    except Exception as e:
        logger.error(f"Tesseract OCR error: {e}")
        raise


def extract_text_from_pdf_bytes(pdf_bytes: bytes) -> Tuple[str, float]:
    """
    Extract text from PDF bytes using Tesseract OCR.
    Converts PDF pages to images first.
    """
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("Tesseract OCR is not available")
    
    all_text = []
    all_confidences = []
    
    if PDF2IMAGE_AVAILABLE:
        try:
            # Convert PDF to images with higher DPI for better OCR
            images = convert_from_bytes(pdf_bytes, dpi=300)
            
            for i, image in enumerate(images[:10]):  # Limit to 10 pages
                logger.info(f"Processing PDF page {i + 1}")
                text, confidence = extract_text_from_image(image)
                all_text.append(text)
                all_confidences.append(confidence)
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {e}")
            raise
    else:
        # Fallback: use PyMuPDF for image extraction
        try:
            import fitz
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            for page_num in range(min(doc.page_count, 10)):
                page = doc[page_num]
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_bytes))
                
                text, confidence = extract_text_from_image(image)
                all_text.append(text)
                all_confidences.append(confidence)
            
            doc.close()
        except Exception as e:
            logger.error(f"PyMuPDF fallback failed: {e}")
            raise
    
    combined_text = "\n\n".join(all_text)
    avg_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0
    
    return combined_text, avg_confidence


def extract_text_from_image_bytes(image_bytes: bytes) -> Tuple[str, float]:
    """Extract text from image bytes."""
    if not TESSERACT_AVAILABLE:
        raise RuntimeError("Tesseract OCR is not available")
    
    image = Image.open(io.BytesIO(image_bytes))
    return extract_text_from_image(image)


def ocr_extract(file_bytes: bytes, file_extension: str) -> Dict:
    """
    Main OCR extraction function.
    Returns dict with text, confidence, and metadata.
    """
    if not is_tesseract_available():
        return {
            "success": False,
            "error": "Tesseract OCR is not available",
            "raw_text": "",
            "confidence": 0,
            "ocr_engine": "tesseract"
        }
    
    try:
        ext = file_extension.lower().lstrip('.')
        
        if ext == 'pdf':
            text, confidence = extract_text_from_pdf_bytes(file_bytes)
        elif ext in ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff']:
            text, confidence = extract_text_from_image_bytes(file_bytes)
        else:
            return {
                "success": False,
                "error": f"Unsupported file type for OCR: {ext}",
                "raw_text": "",
                "confidence": 0,
                "ocr_engine": "tesseract"
            }
        
        word_count = len(text.split())
        char_count = len(text)
        
        return {
            "success": True,
            "raw_text": text,
            "confidence": round(confidence, 2),
            "word_count": word_count,
            "character_count": char_count,
            "ocr_engine": "tesseract"
        }
    
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "raw_text": "",
            "confidence": 0,
            "ocr_engine": "tesseract"
        }
