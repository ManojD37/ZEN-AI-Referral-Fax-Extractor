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

# ensure path for relative imports in worker subprocesses
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

app = FastAPI(title="medical-referral-extractor")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supported file extensions
SUPPORTED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'}


# -----------------------
# Middleware: request logging
# -----------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    try:
        logger.info(f"Incoming request {request.method} {request.url.path} from {request.client.host}")
    except Exception:
        logger.info(f"Incoming request {request.method} {request.url.path}")
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.exception(f"Unhandled exception during request {request.method} {request.url.path}: {exc}")
        raise
    duration = (time.time() - start) * 1000
    logger.info(f"Completed {request.method} {request.url.path} -> {response.status_code} in {duration:.1f}ms")
    return response


@app.on_event("startup")
async def on_startup():
    logger.info("Starting medical-referral-extractor application.")
    logger.info(f"Supported file types: {', '.join(SUPPORTED_EXTENSIONS)}")


@app.on_event("shutdown")
async def on_shutdown():
    logger.info("Shutting down medical-referral-extractor application.")


@app.get("/")
async def root():
    logger.debug("Health check ping received.")
    return {
        "message": "Medical Referral Extraction Service is running.",
        "supported_formats": list(SUPPORTED_EXTENSIONS)
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and process medical referral documents.
    
    Supported formats: PDF, JPG, JPEG, PNG, TXT, DOCX
    
    Returns structured JSON with referral information.
    """
    filename = (file.filename or "unknown").lower()
    logger.info(f"Upload received: {file.filename}")

    # Validate file extension
    file_ext = Path(filename).suffix.lower()
    if file_ext not in SUPPORTED_EXTENSIONS:
        logger.warning(f"Rejected upload (unsupported extension): {file.filename}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )

    # Save uploaded file
    job_id, path, file_type = save_upload_tmp(file)
    logger.info(f"Saved uploaded file: {path} (job_id={job_id}, type={file_type})")

    try:
        # --------------------------
        # STEP 1: EXTRACT TEXT FROM FILE
        # --------------------------
        logger.info(f"Extracting text from {file_type} file for job {job_id}")
        try:
            text_data = extract_text_with_metadata(path)
            raw_text = text_data["raw_text"]
            
            logger.info(
                f"Text extraction complete for job {job_id}. "
                f"Characters: {text_data['character_count']}, "
                f"Words: {text_data['word_count']}"
            )
            
            if not raw_text or len(raw_text.strip()) < 50:
                logger.warning(f"Extracted text is too short for job {job_id}")
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract sufficient text from the document. Please check if the file is valid."
                )
                
        except ValueError as e:
            logger.error(f"Text extraction failed for job {job_id}: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            logger.exception(f"Unexpected error during text extraction for job {job_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Text extraction failed: {e}")

        # --------------------------
        # STEP 2: CLASSIFY DOCUMENT
        # --------------------------
        logger.info(f"Classifying document for job {job_id}")
        try:
            classification = classify_document(raw_text)
            
            logger.info(
                f"Classification for job {job_id}: "
                f"is_referral={classification['is_referral']}, "
                f"confidence={classification['confidence']}"
            )
            
            # If not a referral with low confidence, return early
            if not classification['is_referral'] and classification['confidence'] < 0.3:
                logger.warning(f"Document {job_id} classified as NOT a referral")
                return JSONResponse(
                    status_code=200,
                    content={
                        "job_id": job_id,
                        "file_type": file_type,
                        "source_file": file.filename,
                        "classification": classification,
                        "message": "Document does not appear to be a medical referral",
                        "extracted": None
                    }
                )
        except Exception as e:
            logger.exception(f"Classification error for job {job_id}: {e}")
            # Continue anyway - classification is not critical

        # --------------------------
        # STEP 3: LLM ANALYSIS
        # --------------------------
        logger.info(f"Analyzing document with LLM for job {job_id}")
        try:
            raw_extracted = extract_referral_from_text(raw_text, JSON_SCHEMA)
            logger.debug(f"LLM raw output for job {job_id}: {str(raw_extracted)[:500]}...")
        except Exception as e:
            logger.exception(f"LLM processing error for job {job_id}: {e}")
            raise HTTPException(status_code=500, detail=f"LLM processing failed: {e}")

        # --------------------------
        # STEP 3: VALIDATE OUTPUT
        # --------------------------
        try:
            validated = ReferralExtraction.parse_obj(raw_extracted)
            logger.info(f"Validation successful for job {job_id}")
        except Exception as e:
            logger.warning(f"Validation failed for job {job_id}: {e}")
            logger.debug(f"Raw extracted data: {raw_extracted}")
            return JSONResponse(
                status_code=422,
                content={
                    "error": "LLM output did not validate against schema",
                    "validation_error": str(e),
                    "raw_extracted": raw_extracted,
                },
            )

        # --------------------------
        # STEP 4: RETURN RESULT
        # --------------------------
        result = {
            "job_id": job_id,
            "file_type": file_type,
            "source_file": file.filename,
            "classification": classification,  # Include classification
            "text_stats": {
                "character_count": text_data["character_count"],
                "word_count": text_data["word_count"]
            },
            "extracted": validated.dict()
        }
        
        logger.info(f"Job {job_id} completed successfully")
        return JSONResponse(content=result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception(f"Processing failed for job {job_id}: {exc}")
        raise HTTPException(status_code=500, detail=f"Processing failed: {exc}")
    finally:
        try:
            cleanup_path(path)
            logger.debug(f"Cleaned up temporary file: {path} (job_id={job_id})")
        except Exception as e:
            logger.exception(f"Failed to cleanup path {path}: {e}")


@app.get("/supported-formats")
async def get_supported_formats():
    """Get list of supported file formats."""
    return {
        "supported_formats": list(SUPPORTED_EXTENSIONS),
        "descriptions": {
            ".pdf": "Portable Document Format (OCR)",
            ".jpg": "JPEG Image (OCR)",
            ".jpeg": "JPEG Image (OCR)",
            ".png": "PNG Image (OCR)",
            ".txt": "Plain Text",
            ".docx": "Microsoft Word Document"
        }
    }
#-------------------------------------------------------------------------------

# # app/main.py
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
#         "http://localhost",
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
# @app.post("/")
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
#         # STEP 2: LLM ANALYSIS
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

