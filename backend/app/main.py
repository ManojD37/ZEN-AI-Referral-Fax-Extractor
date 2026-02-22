# app/main.py
# Main FastAPI application — handles file uploads, extraction, authentication, and admin settings.
import time
import asyncio
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
from fastapi import FastAPI, File, UploadFile, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import ALLOWED_ORIGINS

from app.text_extractor import extract_with_metadata
from app.gpt_client import extract_referral_from_text, extract_referral_from_images
from app.schemas import ReferralExtraction
from app.json_schema import JSON_SCHEMA
from app.classifier import classify_document
from app.log import logger
from app.blob_storage import blob_service
from app.auth import verify_password, create_session, verify_session, invalidate_session, require_admin, get_admin_token
from app.cost_tracker import (
    get_extraction_mode, set_extraction_mode, get_settings, update_settings,
    record_extraction, get_cost_analytics
)


# Pydantic models for auth endpoints
class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    message: str

class SettingsRequest(BaseModel):
    extraction_mode: Optional[str] = None
    auto_fallback: Optional[bool] = None
    confidence_threshold: Optional[float] = None

# ========== FASTAPI APP INITIALIZATION ==========
app = FastAPI(
    title="zenai-referral-extractor",
    version="2.0.0",
    description="Medical referral document extraction service with React UI"
)

# ========== CORS (uses ALLOWED_ORIGINS from config.py) ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
)

# ========== SUPPORTED FORMATS ==========
SUPPORTED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# ========== HEALTH ==========
@app.get("/api/health", tags=["health"])
async def api_health():
    """API health check endpoint."""
    logger.info("API Health check endpoint called")
    return {
        "status": "healthy",
        "service": "zenai-referral-extractor",
        "version": "2.0.0",
        "supported_formats": list(SUPPORTED_EXTENSIONS),
    }

@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "timestamp": time.time()
    }


# ========== AUTH ENDPOINTS ==========
@app.post("/api/auth/login", tags=["auth"], response_model=LoginResponse)
async def admin_login(request: LoginRequest):
    """Admin login endpoint."""
    if verify_password(request.password):
        token = create_session()
        logger.info("Admin login successful")
        return LoginResponse(success=True, token=token, message="Login successful")
    else:
        logger.warning("Admin login failed - invalid password")
        return LoginResponse(success=False, message="Invalid password")


@app.post("/api/auth/logout", tags=["auth"])
async def admin_logout(token: Optional[str] = Depends(get_admin_token)):
    """Admin logout endpoint."""
    if token:
        invalidate_session(token)
    return {"success": True, "message": "Logged out"}


@app.get("/api/auth/verify", tags=["auth"])
async def verify_auth(token: Optional[str] = Depends(get_admin_token)):
    """Verify if current session is valid."""
    is_valid = token and verify_session(token)
    return {"authenticated": is_valid}


# ========== ADMIN SETTINGS ENDPOINTS ==========
@app.get("/api/settings", tags=["admin"])
async def get_admin_settings(is_admin: bool = Depends(require_admin)):
    """Get current admin settings (protected)."""
    settings = get_settings()
    return {
        "success": True,
        "settings": settings
    }


@app.post("/api/settings", tags=["admin"])
async def update_admin_settings(
    request: SettingsRequest,
    is_admin: bool = Depends(require_admin)
):
    """Update admin settings (protected)."""
    settings_dict = request.model_dump(exclude_none=True)
    updated = update_settings(settings_dict)
    logger.info(f"Admin settings updated: {settings_dict}")
    return {
        "success": True,
        "settings": updated
    }


# ========== COST ANALYTICS ENDPOINT ==========
@app.get("/api/stats/cost", tags=["admin"])
async def get_cost_stats(
    days: int = 30,
    is_admin: bool = Depends(require_admin)
):
    """Get cost analytics for the specified period (protected)."""
    analytics = get_cost_analytics(days)
    return {
        "success": True,
        "analytics": analytics
    }


# ========== PUBLIC EXTRACTION MODE ==========
@app.get("/api/extraction-mode", tags=["settings"])
async def get_current_extraction_mode():
    """Get current extraction mode (public - for upload page display)."""
    return {
        "mode": get_extraction_mode(),
        "modes_available": ["gpt", "free"]
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
    import uuid
    start_time = time.time()  # Track processing time for the frontend
    job_id = str(uuid.uuid4())[:8]  # Short unique ID for tracking
    
    filename = (file.filename or "").lower()
    ext = Path(filename).suffix
    
    logger.info(f"Upload received: {file.filename} (job_id: {job_id})")

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
        content_data = await asyncio.to_thread(extract_with_metadata, file)
        content_type = content_data.get("type")
        logger.info(f"Content extraction complete. Type: {content_type}")
    except Exception as e:
        logger.error(f"Content extraction failed: {e}")
        raise HTTPException(status_code=400, detail=f"Content extraction failed: {str(e)}")

    # ---------- PROCESS BASED ON CONTENT TYPE ----------
    # Get current extraction mode
    current_mode = get_extraction_mode()
    logger.info(f"Current extraction mode: {current_mode}")
    
    if content_type == "images":
        # Visual formats (PDF, images)
        images_base64 = content_data.get("images_base64", [])
        image_count = content_data.get("image_count", 0)
        
        logger.info(f"Processing {image_count} images")
        
        extracted = None
        extraction_confidence = 1.0
        
        # Try free OCR if mode is set to "free"
        if current_mode == "free":
            try:
                from app.ocr_free import ocr_extract, is_tesseract_available
                from app.ner_extractor import extract_structured_data
                
                if is_tesseract_available():
                    logger.info("Using FREE OCR mode (Tesseract + spaCy)")
                    
                    # Get file bytes from temp file
                    file.file.seek(0)
                    file_bytes = file.file.read()
                    file.file.seek(0)
                    
                    # OCR extraction
                    ocr_result = ocr_extract(file_bytes, ext.lstrip('.'))
                    
                    if ocr_result.get("success") and ocr_result.get("raw_text"):
                        raw_text = ocr_result["raw_text"]
                        extraction_confidence = ocr_result.get("confidence", 0.7)
                        
                        # NER extraction
                        extracted = await asyncio.to_thread(extract_structured_data, raw_text)
                        logger.info(f"Free OCR extraction complete. Confidence: {extraction_confidence}")
                        
                        # Record cost (free)
                        record_extraction("free", job_id, extraction_confidence)
                    else:
                        logger.warning(f"Free OCR failed: {ocr_result.get('error')}")
                else:
                    logger.warning("Tesseract not available, falling back to GPT")
            except Exception as e:
                logger.warning(f"Free OCR error, falling back to GPT: {e}")
        
        # Fallback to GPT Vision if free OCR didn't work or mode is GPT
        if extracted is None:
            logger.info("Using GPT-4 Vision API")
            try:
                extracted = await asyncio.to_thread(extract_referral_from_images, images_base64, JSON_SCHEMA)
                extraction_confidence = 0.95
                logger.info("Vision extraction complete")
                
                # Record cost (GPT)
                record_extraction("gpt", job_id, extraction_confidence)
            except Exception as e:
                logger.error(f"Vision extraction failed: {e}")
                raise HTTPException(status_code=500, detail="Vision extraction failed")
        
        # No classification for images (Vision API handles everything)
        classification = {
            "is_referral": True,
            "confidence": extraction_confidence,
            "reason": f"{current_mode}_processing"
        }
        
        text_stats = {
            "image_count": image_count,
            "character_count": 0,
            "word_count": 0,
            "extraction_mode": current_mode
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
            classification = await asyncio.to_thread(classify_document, raw_text)
            logger.info(f"Classification: is_referral={classification['is_referral']}, confidence={classification['confidence']}")
        except Exception as e:
            logger.warning(f"Classification error: {e}")
            classification = {
                "is_referral": True,
                "confidence": 0.5,
                "reason": "classification_failed"
            }
        
        # Extract based on mode
        extracted = None
        
        if current_mode == "free":
            try:
                from app.ner_extractor import extract_structured_data
                logger.info("Using FREE NER extraction (spaCy)")
                extracted = await asyncio.to_thread(extract_structured_data, raw_text)
                record_extraction("free", job_id, classification.get("confidence", 0.7))
                logger.info("Free NER extraction complete")
            except Exception as e:
                logger.warning(f"Free NER extraction failed, falling back to GPT: {e}")
        
        # Fallback to GPT
        if extracted is None:
            try:
                logger.info("Analyzing document with LLM")
                extracted = await asyncio.to_thread(extract_referral_from_text, raw_text, JSON_SCHEMA)
                record_extraction("gpt", job_id, 0.95)
                logger.info("LLM extraction complete")
            except Exception as e:
                logger.error(f"LLM extraction failed: {e}")
                raise HTTPException(status_code=500, detail="LLM extraction failed")
        
        text_stats = {
            "character_count": content_data.get("character_count", 0),
            "word_count": content_data.get("word_count", 0),
            "extraction_mode": current_mode
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
    extraction_id = await asyncio.to_thread(
        blob_service.save_extraction,
        extracted_data=validated.dict(),
        filename=file.filename,
        text_stats=text_stats
    )

    processing_time = round(time.time() - start_time, 2)
    logger.info(f"Processing complete in {processing_time}s (job_id: {job_id})")

    return {
        "job_id": extraction_id,
        "extraction_id": extraction_id,
        "file_type": ext.lstrip('.').upper(),
        "filename": file.filename,
        "classification": classification,
        "text_stats": text_stats,
        "extracted": validated.dict(),
        "processing_time_seconds": processing_time
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
# This must be the LAST route defined to avoid overriding API endpoints
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# The static directory should be where the React build is placed in the Docker container
static_path = Path("/app/static")  # Absolute path inside Docker container
if not static_path.exists():
    # Fallback for local development if static folder is inside backend
    static_path = Path(__file__).parent.parent / "static"

if static_path.exists():
    # Mount static assets first (js, css, media)
    app.mount("/static", StaticFiles(directory=str(static_path / "static"), html=True), name="static_assets")
    
    # Serve other build files (manifest.json, favicon.ico, etc.)
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static_root")

    @app.exception_handler(404)
    async def custom_404_handler(request: Request, exc: HTTPException):
        """
        Fallback for React Router (SPA).
        If a route is not found in API or static files, serve index.html.
        """
        if request.url.path.startswith("/api"):
            return JSONResponse(status_code=404, content={"error": "API endpoint not found"})
            
        index_file = static_path / "index.html"
        if index_file.exists():
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"error": "Not Found"})
else:
    logger.warning(f"Static directory not found at {static_path}. Frontend will not be served by backend.")