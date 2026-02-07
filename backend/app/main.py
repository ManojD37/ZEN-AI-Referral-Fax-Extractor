# app/main.py
import sys
import time
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.text_extractor import extract_with_metadata
from app.gpt_client import extract_referral_from_text, extract_referral_from_images
from app.schemas import ReferralExtraction
from app.json_schema import JSON_SCHEMA
from app.classifier import classify_document
from app.log import logger
from app.blob_storage import blob_service

# Ensure path for relative imports
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# ========== FASTAPI APP INITIALIZATION ==========
app = FastAPI(
    title="medical-referral-extractor",
    version="2.0.0",
    description="Medical referral document extraction service with Streamlit UI"
)

# ========== CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8501",  # Streamlit default
        "http://127.0.0.1:8501",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
)

# ========== SUPPORTED FORMATS ==========
SUPPORTED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# ========== HEALTH ==========
@app.get("/", tags=["health"])
async def root():
    logger.info("Health check endpoint called")
    return {
        "status": "healthy",
        "service": "medical-referral-extractor",
        "version": "2.0.0",
        "supported_formats": list(SUPPORTED_EXTENSIONS),
    }

@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "timestamp": time.time()
    }


def ensure_required_fields(data: dict) -> dict:
    """Ensure all required fields exist in extraction result."""
    if not isinstance(data, dict):
        data = {}

    data.setdefault("patient", {})
    for k in ["full_name", "date_of_birth", "gender", "phone", "address"]:
        data["patient"].setdefault(k, None)

    data.setdefault("referral", {})
    for k in [
        "referral_to", "referral_focal_point", "referral_phone", "referral_email",
        "referring_from", "referring_focal_point", "referring_phone", "referring_email"
    ]:
        data["referral"].setdefault(k, None)

    data.setdefault("diagnoses", {})
    data["diagnoses"].setdefault("primary_diagnoses", [])
    data["diagnoses"].setdefault("other_diagnoses", [])

    data.setdefault("document_meta", {})
    data["document_meta"].setdefault("title", None)
    data["document_meta"].setdefault("date", None)

    data.setdefault("treatments", [])
    data.setdefault("reason_for_referral", None)
    data.setdefault("compiled_by", None)
    data.setdefault("position", None)
    data.setdefault("signature", None)
    data.setdefault("file_number", None)

    return data


# ========== FILE UPLOAD ==========
@app.post("/upload", tags=["upload"])
async def upload_file(file: UploadFile = File(...)):
    """Upload and process medical referral documents."""
    filename = (file.filename or "").lower()
    ext = Path(filename).suffix
    
    logger.info(f"Upload received: {file.filename}")

    # Validate file extension
    if ext not in SUPPORTED_EXTENSIONS:
        logger.warning(f"Rejected upload (unsupported extension): {file.filename}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}"
        )

    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    if file_size > MAX_FILE_SIZE:
        logger.warning(f"File too large: {file_size} bytes")
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds 50MB limit"
        )

    # ---------- CONTENT EXTRACTION ----------
    try:
        logger.info(f"Extracting content from {ext} file")
        content_data = extract_with_metadata(file)
        content_type = content_data.get("type")
        logger.info(f"Content extraction complete. Type: {content_type}")
    except Exception as e:
        logger.error(f"Content extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"Content extraction failed: {str(e)}")

    # ---------- PROCESS BASED ON CONTENT TYPE ----------
    if content_type == "images":
        # Visual formats (PDF, images) -> use Vision API
        images_base64 = content_data.get("images_base64", [])
        image_count = content_data.get("image_count", 0)
        
        logger.info(f"Processing {image_count} images with Vision API")
        
        # No classification for images (Vision API handles everything)
        classification = {
            "is_referral": True,
            "confidence": 1.0,
            "reason": "vision_processing"
        }
        
        # Extract using Vision API
        try:
            logger.info("Analyzing images with GPT-4o Vision")
            extracted = extract_referral_from_images(images_base64, JSON_SCHEMA)
            logger.info("Vision extraction complete")
        except Exception as e:
            logger.error(f"Vision extraction failed: {e}")
            raise HTTPException(status_code=500, detail="Vision extraction failed")
        
        text_stats = {
            "image_count": image_count,
            "character_count": 0,
            "word_count": 0
        }
        
    elif content_type == "text":
        # Text formats (TXT, DOCX) -> use text API
        raw_text = content_data.get("raw_text", "").strip()
        
        if not raw_text or len(raw_text) < 50:
            logger.warning("Extracted text is too short")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "Insufficient text extracted",
                    "text_stats": content_data
                }
            )
        
        # Classification
        try:
            logger.info("Classifying document")
            classification = classify_document(raw_text)
            logger.info(f"Classification: is_referral={classification['is_referral']}, confidence={classification['confidence']}")
        except Exception as e:
            logger.warning(f"Classification error: {e}")
            classification = {
                "is_referral": True,
                "confidence": 0.5,
                "reason": "classification_failed"
            }
        
        # Extract using text API
        try:
            logger.info("Analyzing document with LLM")
            extracted = extract_referral_from_text(raw_text, JSON_SCHEMA)
            logger.info("LLM extraction complete")
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
            raise HTTPException(status_code=500, detail="LLM extraction failed")
        
        text_stats = {
            "character_count": content_data.get("character_count", 0),
            "word_count": content_data.get("word_count", 0),
        }
    
    else:
        raise HTTPException(status_code=500, detail=f"Unknown content type: {content_type}")

    extracted = ensure_required_fields(extracted)

    # ---------- VALIDATION ----------
    try:
        validated = ReferralExtraction.parse_obj(extracted)
        logger.info("Validation successful")
    except Exception as e:
        logger.warning(f"Validation failed: {e}")
        return JSONResponse(
            status_code=200,
            content={
                "classification": classification,
                "text_stats": text_stats,
                "extracted": extracted,
                "validation_warning": str(e),
            }
        )

    # ---------- SAVE TO BLOB STORAGE ----------
    extraction_id = blob_service.save_extraction(
        extracted_data=validated.dict(),
        filename=file.filename,
        text_stats=text_stats
    )

    return {
        "extraction_id": extraction_id,
        "classification": classification,
        "text_stats": text_stats,
        "extracted": validated.dict()
    }


# ========== INFO ==========
@app.get("/supported-formats", tags=["info"])
async def get_supported_formats():
    return {
        "supported_formats": list(SUPPORTED_EXTENSIONS)
    }

@app.get("/history", tags=["history"])
async def get_history(limit: int = 50):
    """Get extraction history from blob storage."""
    logger.info(f"Fetching extraction history (limit: {limit})")
    try:
        extractions = blob_service.list_extractions(limit=limit)
        return {
            "count": len(extractions),
            "extractions": extractions
        }
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch history")

@app.get("/extraction/{extraction_id}", tags=["history"])
async def get_extraction(extraction_id: str):
    """Get specific extraction by ID."""
    logger.info(f"Fetching extraction: {extraction_id}")
    try:
        result = blob_service.get_extraction(extraction_id)
        if result:
            return result
        else:
            raise HTTPException(status_code=404, detail="Extraction not found")
    except Exception as e:
        logger.error(f"Failed to fetch extraction {extraction_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch extraction")


# ========== ERROR HANDLERS ==========
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(f"HTTP error: {exc.status_code} - {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

# ========== STATIC FILES (React) ==========
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# The static directory should be where the React build is placed in the Docker container
# During local development without 'build', this directory may not exist
static_path = Path(__file__).parent.parent / "static"

if static_path.exists():
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def catch_all(full_path: str):
        # Serve index.html for all non-API routes to support React Router
        index_file = static_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"error": "Not Found"})
else:
    logger.warning(f"Static directory not found at {static_path}. Frontend will not be served by backend.")