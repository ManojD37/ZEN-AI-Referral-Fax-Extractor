# app/main.py
import sys
import time
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .utils import save_upload_tmp, cleanup_path
from .text_extractor import extract_text_with_metadata
from .gpt_client import extract_referral_from_text
from .schemas import ReferralExtraction
from .json_schema import JSON_SCHEMA
from .classifier import classify_document
from app.log import logger

# Ensure path for relative imports
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# ========== FASTAPI APP INITIALIZATION ==========
app = FastAPI(
    title="medical-referral-extractor",
    version="1.0.0",
    description="Medical referral document extraction service"
)

# ========== CORS MIDDLEWARE ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "https://zen-ai-referral-fax-extractor.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# ========== SUPPORTED FORMATS ==========
SUPPORTED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'}

# ========== MIDDLEWARE: REQUEST LOGGING ==========
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests and responses."""
    start = time.time()
    
    try:
        client_host = request.client.host if request.client else "unknown"
        logger.info(f"→ {request.method} {request.url.path} from {client_host}")
    except Exception:
        logger.info(f"→ {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as exc:
        duration = (time.time() - start) * 1000
        logger.error(
            f"✗ {request.method} {request.url.path} - "
            f"Exception after {duration:.1f}ms: {exc}"
        )
        raise
    
    duration = (time.time() - start) * 1000
    status_icon = "✓" if 200 <= response.status_code < 300 else "✗"
    logger.info(
        f"{status_icon} {request.method} {request.url.path} → "
        f"{response.status_code} ({duration:.1f}ms)"
    )
    return response

# ========== STARTUP & SHUTDOWN EVENTS ==========
@app.on_event("startup")
async def on_startup():
    """Initialize on application startup."""
    logger.info("=" * 60)
    logger.info("🚀 Starting Medical Referral Extractor")
    logger.info("=" * 60)
    logger.info(f"Supported file types: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    logger.info("=" * 60)

@app.on_event("shutdown")
async def on_shutdown():
    """Cleanup on application shutdown."""
    logger.info("=" * 60)
    logger.info("🛑 Shutting down Medical Referral Extractor")
    logger.info("=" * 60)

# ========== HEALTH CHECK ENDPOINT ==========
@app.get("/", tags=["health"])
async def root():
    """Health check endpoint."""
    logger.debug("Health check ping received")
    return {
        "status": "healthy",
        "message": "Medical Referral Extraction Service is running",
        "supported_formats": list(SUPPORTED_EXTENSIONS),
        "version": "1.0.0"
    }

@app.get("/health", tags=["health"])
async def health_check():
    """Detailed health check endpoint."""
    return {
        "status": "ok",
        "service": "medical-referral-extractor",
        "timestamp": time.time()
    }


def ensure_required_fields(data: dict) -> dict:
    """Ensure all required fields exist with proper defaults."""
    
    # Patient field (required)
    if 'patient' not in data or not isinstance(data['patient'], dict):
        data['patient'] = {}
    
    patient_defaults = {
        'full_name': None,
        'date_of_birth': None,
        'gender': None,
        'phone': None,
        'address': None
    }
    for key, default_val in patient_defaults.items():
        if key not in data['patient']:
            data['patient'][key] = default_val
    
    # Referral field (required)
    if 'referral' not in data or not isinstance(data['referral'], dict):
        data['referral'] = {}
    
    referral_defaults = {
        'referral_to': None,
        'referral_focal_point': None,
        'referral_phone': None,
        'referral_email': None,
        'referring_from': None,
        'referring_focal_point': None,
        'referring_phone': None,
        'referring_email': None
    }
    for key, default_val in referral_defaults.items():
        if key not in data['referral']:
            data['referral'][key] = default_val
    
    # Diagnoses field (required)
    if 'diagnoses' not in data or not isinstance(data['diagnoses'], dict):
        data['diagnoses'] = {}
    
    if 'primary_diagnoses' not in data['diagnoses']:
        data['diagnoses']['primary_diagnoses'] = []
    if 'other_diagnoses' not in data['diagnoses']:
        data['diagnoses']['other_diagnoses'] = []
    
    # Document meta field (required)
    if 'document_meta' not in data or not isinstance(data['document_meta'], dict):
        data['document_meta'] = {}
    
    if 'title' not in data['document_meta']:
        data['document_meta']['title'] = None
    if 'date' not in data['document_meta']:
        data['document_meta']['date'] = None
    
    # Optional fields
    if 'treatments' not in data:
        data['treatments'] = []
    elif data['treatments'] is None:
        data['treatments'] = []
    
    if 'reason_for_referral' not in data:
        data['reason_for_referral'] = None
    
    if 'compiled_by' not in data:
        data['compiled_by'] = None
    
    if 'position' not in data:
        data['position'] = None
    
    if 'signature' not in data:
        data['signature'] = None
    
    if 'file_number' not in data:
        data['file_number'] = None
    
    return data


# ========== FILE UPLOAD ENDPOINT ==========
@app.post("/upload", tags=["upload"])
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and process medical referral documents.
    
    Supported formats:
    - PDF (with OCR)
    - JPG, JPEG, PNG (with OCR)
    - TXT (plain text)
    - DOCX (Microsoft Word)
    
    Returns:
    - job_id: Unique identifier for this processing job
    - extracted: Structured referral data as JSON
    - classification: Document classification results
    - text_stats: Character and word count
    """
    filename = (file.filename or "unknown").lower()
    logger.info(f"📄 Upload received: {file.filename}")

    # ========== STEP 0: VALIDATE FILE ==========
    file_ext = Path(filename).suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        logger.warning(f"❌ Rejected: unsupported extension {file_ext}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. "
                   f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    # ========== STEP 1: SAVE FILE ==========
    job_id, path, file_type = None, None, None
    try:
        job_id, path, file_type = save_upload_tmp(file)
        logger.info(f"💾 Saved file: {path} (job_id={job_id}, type={file_type})")
    except Exception as e:
        logger.error(f"❌ Failed to save file: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save file")

    try:
        # ========== STEP 2: EXTRACT TEXT ==========
        logger.info(f"📝 Extracting text from {file_type}")
        try:
            text_data = extract_text_with_metadata(path)
            raw_text = text_data.get("raw_text", "").strip()
            
            logger.info(
                f"✓ Text extraction complete: "
                f"{text_data.get('character_count', 0)} chars, "
                f"{text_data.get('word_count', 0)} words"
            )
            
            if not raw_text or len(raw_text) < 50:
                logger.warning(f"❌ Extracted text too short (< 50 chars)")
                return JSONResponse(
                    status_code=400,
                    content={
                        "job_id": job_id,
                        "file_type": file_type,
                        "source_file": file.filename,
                        "error": "Could not extract sufficient text from document",
                        "text_stats": text_data
                    }
                )
                
        except ValueError as e:
            logger.error(f"❌ Text extraction error: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.error(f"❌ Unexpected text extraction error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Text extraction failed")

        # ========== STEP 3: CLASSIFY DOCUMENT ==========
        classification = {"is_referral": True, "confidence": 0.5, "score": 0, "details": {}, "reason": "Classification not performed"}
        try:
            logger.info(f"🔍 Classifying document")
            classification = classify_document(raw_text)
            logger.info(
                f"✓ Classification: referral={classification.get('is_referral')}, "
                f"confidence={classification.get('confidence', 0):.2f}"
            )
        except Exception as e:
            logger.warning(f"⚠️  Classification failed: {e} (continuing with extraction)")

        # ========== STEP 4: LLM ANALYSIS ==========
        raw_extracted = None
        try:
            logger.info(f"🤖 Analyzing with LLM")
            raw_extracted = extract_referral_from_text(raw_text, JSON_SCHEMA)
            logger.debug(f"✓ LLM raw output: {str(raw_extracted)[:200]}...")
        except Exception as e:
            logger.error(f"❌ LLM analysis failed: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="LLM analysis failed")

        # ========== STEP 5: ENSURE REQUIRED FIELDS & VALIDATE ==========
        try:
            # Ensure all required fields exist
            if not raw_extracted or not isinstance(raw_extracted, dict):
                raw_extracted = {}
            
            raw_extracted = ensure_required_fields(raw_extracted)
            
            # Validate with Pydantic
            validated = ReferralExtraction.parse_obj(raw_extracted)
            logger.info(f"✓ Validation successful")
            
        except Exception as e:
            logger.error(f"❌ Validation failed: {e}", exc_info=True)
            logger.debug(f"Raw extracted data: {raw_extracted}")
            
            # Return partial result with error
            return JSONResponse(
                status_code=200,  # Changed to 200 to allow frontend to display partial data
                content={
                    "job_id": job_id,
                    "file_type": file_type,
                    "source_file": file.filename,
                    "classification": classification,
                    "text_stats": {
                        "character_count": text_data.get("character_count", 0),
                        "word_count": text_data.get("word_count", 0)
                    },
                    "extracted": raw_extracted,
                    "validation_warning": f"Data validation had issues: {str(e)}",
                }
            )

        # ========== STEP 6: RETURN RESULT ==========
        result = {
            "job_id": job_id,
            "file_type": file_type,
            "source_file": file.filename,
            "classification": classification,
            "text_stats": {
                "character_count": text_data.get("character_count", 0),
                "word_count": text_data.get("word_count", 0)
            },
            "extracted": validated.dict()
        }
        
        logger.info(f"✓ Job {job_id} completed successfully")
        return JSONResponse(content=result, status_code=200)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"❌ Job {job_id} failed: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Processing failed")
    finally:
        # Cleanup temp file
        if path:
            try:
                cleanup_path(path)
                logger.debug(f"🧹 Cleaned up: {path}")
            except Exception as e:
                logger.warning(f"⚠️  Cleanup failed: {e}")

# ========== SUPPORTED FORMATS ENDPOINT ==========
@app.get("/supported-formats", tags=["info"])
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "supported_formats": list(SUPPORTED_EXTENSIONS),
        "descriptions": {
            ".pdf": "Portable Document Format (with OCR)",
            ".jpg": "JPEG Image (with OCR)",
            ".jpeg": "JPEG Image (with OCR)",
            ".png": "PNG Image (with OCR)",
            ".txt": "Plain Text File",
            ".docx": "Microsoft Word Document"
        }
    }

# ========== ERROR HANDLERS ==========
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.error(f"HTTP {exc.status_code}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )

#-----------------------------------DEV--------------------------------------------

# app/main.py (Updated)
# import sys
# import time
# from pathlib import Path
# from fastapi import FastAPI, File, UploadFile, HTTPException, Request
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.responses import JSONResponse
# from .utils import save_upload_tmp, cleanup_path
# from .text_extractor import extract_text_with_metadata
# from .gpt_client import extract_referral_from_text
# from .schemas import ReferralExtraction
# from .json_schema import JSON_SCHEMA
# from .classifier import classify_document
# from app.log import logger

# # ensure path for relative imports in worker subprocesses
# ROOT = Path(__file__).resolve().parents[1]
# sys.path.insert(0, str(ROOT))

# app = FastAPI(title="medical-referral-extractor")

# # Add CORS middleware
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[
#         "http://localhost:3000",
#         "http://127.0.0.1:3000",
#         "http://localhost","https://zen-ai-referral-fax-extractor.vercel.app"
#     ],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Supported file extensions
# SUPPORTED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'}


# # -----------------------
# # Middleware: request logging
# # -----------------------
# @app.middleware("http")
# async def log_requests(request: Request, call_next):
#     start = time.time()
#     try:
#         logger.info(f"Incoming request {request.method} {request.url.path} from {request.client.host}")
#     except Exception:
#         logger.info(f"Incoming request {request.method} {request.url.path}")
#     try:
#         response = await call_next(request)
#     except Exception as exc:
#         logger.exception(f"Unhandled exception during request {request.method} {request.url.path}: {exc}")
#         raise
#     duration = (time.time() - start) * 1000
#     logger.info(f"Completed {request.method} {request.url.path} -> {response.status_code} in {duration:.1f}ms")
#     return response


# @app.on_event("startup")
# async def on_startup():
#     logger.info("Starting medical-referral-extractor application.")
#     logger.info(f"Supported file types: {', '.join(SUPPORTED_EXTENSIONS)}")


# @app.on_event("shutdown")
# async def on_shutdown():
#     logger.info("Shutting down medical-referral-extractor application.")


# @app.get("/")
# async def root():
#     logger.debug("Health check ping received.")
#     return {
#         "message": "Medical Referral Extraction Service is running.",
#         "supported_formats": list(SUPPORTED_EXTENSIONS)
#     }


# @app.post("/upload")
# async def upload_file(file: UploadFile = File(...)):
#     """
#     Upload and process medical referral documents.
    
#     Supported formats: PDF, JPG, JPEG, PNG, TXT, DOCX
    
#     Returns structured JSON with referral information.
#     """
#     filename = (file.filename or "unknown").lower()
#     logger.info(f"Upload received: {file.filename}")

#     # Validate file extension
#     file_ext = Path(filename).suffix.lower()
#     if file_ext not in SUPPORTED_EXTENSIONS:
#         logger.warning(f"Rejected upload (unsupported extension): {file.filename}")
#         raise HTTPException(
#             status_code=400,
#             detail=f"Unsupported file type: {file_ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
#         )

#     # Save uploaded file
#     job_id, path, file_type = save_upload_tmp(file)
#     logger.info(f"Saved uploaded file: {path} (job_id={job_id}, type={file_type})")

#     try:
#         # --------------------------
#         # STEP 1: EXTRACT TEXT FROM FILE
#         # --------------------------
#         logger.info(f"Extracting text from {file_type} file for job {job_id}")
#         try:
#             text_data = extract_text_with_metadata(path)
#             raw_text = text_data["raw_text"]
            
#             logger.info(
#                 f"Text extraction complete for job {job_id}. "
#                 f"Characters: {text_data['character_count']}, "
#                 f"Words: {text_data['word_count']}"
#             )
            
#             if not raw_text or len(raw_text.strip()) < 50:
#                 logger.warning(f"Extracted text is too short for job {job_id}")
#                 raise HTTPException(
#                     status_code=400,
#                     detail="Could not extract sufficient text from the document. Please check if the file is valid."
#                 )
                
#         except ValueError as e:
#             logger.error(f"Text extraction failed for job {job_id}: {e}")
#             raise HTTPException(status_code=400, detail=str(e))
#         except Exception as e:
#             logger.exception(f"Unexpected error during text extraction for job {job_id}: {e}")
#             raise HTTPException(status_code=500, detail=f"Text extraction failed: {e}")

#         # --------------------------
#         # STEP 2: CLASSIFY DOCUMENT
#         # --------------------------
#         logger.info(f"Classifying document for job {job_id}")
#         try:
#             classification = classify_document(raw_text)
            
#             logger.info(
#                 f"Classification for job {job_id}: "
#                 f"is_referral={classification['is_referral']}, "
#                 f"confidence={classification['confidence']}"
#             )
            
#             # If not a referral with low confidence, return early
#             if not classification['is_referral'] and classification['confidence'] < 0.3:
#                 logger.warning(f"Document {job_id} classified as NOT a referral")
                
#                 # BUG FIX: Return an empty dict for 'extracted' instead of None 
#                 # to prevent the frontend from failing the check for !editedData.
#                 return JSONResponse(
#                     status_code=200,
#                     content={
#                         "job_id": job_id,
#                         "file_type": file_type,
#                         "source_file": file.filename,
#                         "classification": classification,
#                         "message": "Document does not appear to be a medical referral",
#                         "extracted": {} # Changed from None to {}
#                     }
#                 )
#         except Exception as e:
#             logger.exception(f"Classification error for job {job_id}: {e}")
#             # Continue anyway - classification is not critical

#         # --------------------------
#         # STEP 3: LLM ANALYSIS
#         # --------------------------
#         logger.info(f"Analyzing document with LLM for job {job_id}")
#         try:
#             raw_extracted = extract_referral_from_text(raw_text, JSON_SCHEMA)
#             logger.debug(f"LLM raw output for job {job_id}: {str(raw_extracted)[:500]}...")
#         except Exception as e:
#             logger.exception(f"LLM processing error for job {job_id}: {e}")
#             raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}")

#         # --------------------------
#         # STEP 3: VALIDATE OUTPUT
#         # --------------------------
#         try:
#             validated = ReferralExtraction.parse_obj(raw_extracted)
#             logger.info(f"Validation successful for job {job_id}")
#         except Exception as e:
#             logger.warning(f"Validation failed for job {job_id}: {e}")
#             logger.debug(f"Raw extracted data: {raw_extracted}")
#             return JSONResponse(
#                 status_code=422,
#                 content={
#                     "error": "LLM output did not validate against schema",
#                     "validation_error": str(e),
#                     "raw_extracted": raw_extracted,
#                 },
#             )

#         # --------------------------
#         # STEP 4: RETURN RESULT
#         # --------------------------
#         result = {
#             "job_id": job_id,
#             "file_type": file_type,
#             "source_file": file.filename,
#             "classification": classification,  # Include classification
#             "text_stats": {
#                 "character_count": text_data["character_count"],
#                 "word_count": text_data["word_count"]
#             },
#             "extracted": validated.dict()
#         }
        
#         logger.info(f"Job {job_id} completed successfully")
#         return JSONResponse(content=result)

#     except HTTPException:
#         raise
#     except Exception as exc:
#         logger.exception(f"Processing failed for job {job_id}: {exc}")
#         raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")
#     finally:
#         try:
#             cleanup_path(path)
#             logger.debug(f"Cleaned up temporary file: {path} (job_id={job_id})")
#         except Exception as e:
#             logger.exception(f"Failed to cleanup path {path}: {e}")


# @app.get("/supported-formats")
# async def get_supported_formats():
#     """Get list of supported file formats."""
#     return {
#         "supported_formats": list(SUPPORTED_EXTENSIONS),
#         "descriptions": {
#             ".pdf": "Portable Document Format (OCR)",
#             ".jpg": "JPEG Image (OCR)",
#             ".jpeg": "JPEG Image (OCR)",
#             ".png": "PNG Image (OCR)",
#             ".txt": "Plain Text",
#             ".docx": "Microsoft Word Document"
#         }
#     }