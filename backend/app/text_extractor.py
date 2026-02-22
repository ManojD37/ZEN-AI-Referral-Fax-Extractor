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


def pdf_to_images_base64(pdf_path: str, dpi: int = 120) -> List[str]:
    """
    Convert PDF pages to base64-encoded PNG images using PyMuPDF.
    
    Args:
        pdf_path: Path to PDF file
        dpi: Resolution for rendering (150 is good balance of quality/size)
        
    Returns:
        List of base64-encoded PNG images (one per page)
    """
    logger.info(f"Converting PDF to images: {pdf_path}")
    images_b64 = []
    
    try:
        doc = fitz.open(pdf_path)
        logger.info(f"PDF has {len(doc)} pages")
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            
            # Render page to pixmap (image)
            # zoom factor: dpi/72 (72 is default DPI)
            zoom = dpi / 72
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PNG bytes
            img_bytes = pix.tobytes("png")
            
            # Encode to base64
            img_b64 = base64.b64encode(img_bytes).decode('utf-8')
            images_b64.append(img_b64)
            
            logger.info(f"Rendered page {page_num + 1}/{len(doc)}")
        
        doc.close()
        logger.info(f"PDF conversion complete. Generated {len(images_b64)} images")
        return images_b64
        
    except Exception as e:
        logger.exception(f"PDF to image conversion failed: {e}")
        raise


def image_to_base64(image_path: str) -> str:
    """
    Convert image file to base64-encoded PNG.
    
    Args:
        image_path: Path to image file
        
    Returns:
        Base64-encoded PNG image
    """
    logger.info(f"Converting image to base64: {image_path}")
    try:
        img = Image.open(image_path)
        
        # Convert to RGB if needed (for transparency handling)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        
        # Save to bytes
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_bytes = buffer.getvalue()
        
        # Encode to base64
        img_b64 = base64.b64encode(img_bytes).decode('utf-8')
        
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
