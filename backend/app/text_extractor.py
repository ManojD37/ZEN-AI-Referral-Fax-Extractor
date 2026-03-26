# app/text_extractor.py
import os
import base64
import tempfile
from typing import List, Dict, Any
from pathlib import Path
from io import BytesIO
from PIL import Image
import fitz  # PyMuPDF
import docx
from fastapi import UploadFile
from app.log import logger
from app.config import MAX_PAGES

# Max dimension for images sent to Vision API (keeps quality, reduces payload drastically)
MAX_IMAGE_DIMENSION = 1500


def pdf_to_images_base64(pdf_path: str, dpi: int = 120) -> List[str]:
    """
    Convert PDF pages to base64-encoded JPEG images using PyMuPDF.
    
    Args:
        pdf_path: Path to PDF file
        dpi: Resolution for rendering
        
    Returns:
        List of base64-encoded JPEG images (one per page, capped at MAX_PAGES)
    """
    logger.info(f"Converting PDF to images: {pdf_path}")
    images_b64 = []
    
    try:
        doc = fitz.open(pdf_path)
        total_pages = len(doc)
        pages_to_process = min(total_pages, MAX_PAGES)
        logger.info(f"PDF has {total_pages} pages, processing {pages_to_process}")
        
        for page_num in range(pages_to_process):
            page = doc[page_num]
            
            # Render page to pixmap
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert pixmap to PIL Image for resizing and JPEG compression
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img_b64 = _resize_and_encode(img)
            images_b64.append(img_b64)
            
            logger.info(f"Rendered page {page_num + 1}/{pages_to_process}")
        
        doc.close()
        logger.info(f"PDF conversion complete. Generated {len(images_b64)} images")
        return images_b64
        
    except Exception as e:
        logger.exception(f"PDF to image conversion failed: {e}")
        raise


def _resize_and_encode(img: Image.Image) -> str:
    """
    Resize image to fit within MAX_IMAGE_DIMENSION and encode as base64 JPEG.
    JPEG is 50-70% smaller than PNG, significantly reducing API payload.
    """
    # Downscale if larger than MAX_IMAGE_DIMENSION
    if max(img.size) > MAX_IMAGE_DIMENSION:
        img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.LANCZOS)
    
    # Ensure RGB mode for JPEG
    if img.mode != 'RGB':
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode in ('RGBA', 'LA'):
            background.paste(img, mask=img.split()[-1])
        elif img.mode == 'P':
            img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1])
        else:
            background.paste(img)
        img = background
    
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    return base64.b64encode(buffer.getvalue()).decode('utf-8')


def image_to_base64(image_path: str) -> str:
    """
    Convert image file to base64-encoded JPEG (resized if too large).
    
    Args:
        image_path: Path to image file
        
    Returns:
        Base64-encoded JPEG image
    """
    logger.info(f"Converting image to base64: {image_path}")
    try:
        img = Image.open(image_path)
        img_b64 = _resize_and_encode(img)
        logger.info(f"Image conversion complete")
        return img_b64
        
    except Exception as e:
        logger.exception(f"Image to base64 conversion failed: {e}")
        raise


def extract_text_from_txt(txt_path: str) -> str:
    """Extract text from TXT file."""
    logger.info(f"Reading text file: {txt_path}")
    try:
        with open(txt_path, 'r', encoding='utf-8') as f:
            text = f.read()
        logger.info(f"Text file read complete. Total characters: {len(text)}")
        return text
    except UnicodeDecodeError:
        # Try with different encoding
        with open(txt_path, 'r', encoding='latin-1') as f:
            text = f.read()
        logger.info(f"Text file read complete (latin-1). Total characters: {len(text)}")
        return text
    except Exception as e:
        logger.exception(f"Text file reading failed: {e}")
        raise


def extract_text_from_docx(docx_path: str) -> str:
    """Extract text from Word document (.docx)."""
    logger.info(f"Extracting text from Word document: {docx_path}")
    try:
        doc = docx.Document(docx_path)
        
        # Extract paragraphs
        paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
        
        # Extract tables
        tables_text = []
        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells)
                if row_text.strip():
                    tables_text.append(row_text)
        
        # Combine all text
        all_text = "\n".join(paragraphs)
        if tables_text:
            all_text += "\n\n--- Tables ---\n" + "\n".join(tables_text)
        
        logger.info(f"Word document extraction complete. Total characters: {len(all_text)}")
        return all_text
    except Exception as e:
        logger.exception(f"Word document extraction failed: {e}")
        raise


def extract_images_from_file(file_path: str) -> List[str]:
    """
    Universal image extractor - converts file to base64 images for vision processing.
    
    Supported formats:
    - PDF: Renders each page as image
    - Images (JPG, PNG, etc.): Converts to base64
    
    Args:
        file_path: Path to file
        
    Returns:
        List of base64-encoded images
    """
    file_path = Path(file_path)
    ext = file_path.suffix.lower()
    
    logger.info(f"Extracting images from: {file_path} (type: {ext})")
    
    if ext == '.pdf':
        return pdf_to_images_base64(str(file_path))
    elif ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
        return [image_to_base64(str(file_path))]
    else:
        raise ValueError(f"Unsupported file type for image extraction: {ext}")


def extract_text_from_file(file_path: str) -> str:
    """
    Extract text from TXT or DOCX files (text-only formats).
    
    For visual formats (PDF, images), use extract_images_from_file instead.
    """
    file_path = Path(file_path)
    ext = file_path.suffix.lower()
    
    logger.info(f"Extracting text from: {file_path} (type: {ext})")
    
    if ext == '.txt':
        return extract_text_from_txt(str(file_path))
    elif ext == '.docx':
        return extract_text_from_docx(str(file_path))
    else:
        raise ValueError(f"Unsupported file type for text extraction: {ext}")


def extract_with_metadata(file: UploadFile) -> Dict[str, Any]:
    """
    Extract content from uploaded file with metadata.
    
    Returns either:
    - {"type": "text", "raw_text": str, ...} for TXT/DOCX
    - {"type": "images", "images_base64": list, ...} for PDF/images
    
    Args:
        file: FastAPI UploadFile object
        
    Returns:
        Dictionary with extraction results and metadata
    """
    file_ext = Path(file.filename).suffix.lower()
    
    # Save uploaded file to temp location
    with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
        tmp_file.write(file.file.read())
        tmp_path = tmp_file.name
    
    try:
        # Visual formats (PDF, images) -> extract as images
        if file_ext in ['.pdf', '.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            images = extract_images_from_file(tmp_path)
            return {
                "type": "images",
                "images_base64": images,
                "file_type": file_ext,
                "image_count": len(images)
            }
        
        # Text formats (TXT, DOCX) -> extract as text
        elif file_ext in ['.txt', '.docx']:
            text = extract_text_from_file(tmp_path)
            return {
                "type": "text",
                "raw_text": text,
                "file_type": file_ext,
                "character_count": len(text),
                "word_count": len(text.split())
            }
        
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
            
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except Exception as e:
            logger.warning(f"Failed to delete temp file {tmp_path}: {e}")


# Backward compatibility alias
extract_text_with_metadata = extract_with_metadata
