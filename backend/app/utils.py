import os
import shutil
import uuid
import tempfile
from pathlib import Path
from fastapi import UploadFile, HTTPException
from .config import (
    UPLOAD_DIR, 
    USE_BLOB_STORAGE, 
    AZURE_STORAGE_CONNECTION_STRING,
    AZURE_BLOB_CONTAINER
)
from app.log import logger

# Lazy import Azure SDK (only when needed)
_blob_service_client = None

def get_blob_service_client():
    """Get or create Azure Blob Service Client (lazy initialization)."""
    global _blob_service_client
    if _blob_service_client is None:
        try:
            from azure.storage.blob import BlobServiceClient
            _blob_service_client = BlobServiceClient.from_connection_string(
                AZURE_STORAGE_CONNECTION_STRING
            )
            logger.info("Azure Blob Service Client initialized")
        except ImportError:
            raise RuntimeError(
                "azure-storage-blob is not installed. "
                "Install with: pip install azure-storage-blob"
            )
        except Exception as e:
            logger.error(f"Failed to initialize Blob Service Client: {e}")
            raise
    return _blob_service_client

# Supported file extensions
SUPPORTED_EXTENSIONS = {
    'pdf': 'pdf',
    'jpg': 'image',
    'jpeg': 'image',
    'png': 'image',
    'txt': 'text',
    'docx': 'word',
    'doc': 'word'
}

def get_file_type(filename: str) -> str:
    """
    Determine file type from filename.
    Returns: 'pdf', 'image', 'text', 'word', or raises HTTPException
    """
    ext = filename.lower().split('.')[-1]
    if ext not in SUPPORTED_EXTENSIONS:
        logger.warning(f"Unsupported file type: {ext}")
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
        )
    return SUPPORTED_EXTENSIONS[ext]

def save_upload_tmp(upload_file: UploadFile):
    """
    Save uploaded file (to Blob Storage in Azure, filesystem in local).
    
    Returns:
        tuple: (job_id, local_file_path, file_type)
        
    In Azure:
        - File is uploaded to Blob Storage
        - Local copy saved to /tmp for processing
        - Local copy is cleaned up after processing
        
    In Local:
        - File is saved directly to upload directory
    """
    if not upload_file.filename:
        logger.error("Upload file has no filename")
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Get file extension
    ext = upload_file.filename.lower().split('.')[-1]
    file_type = get_file_type(upload_file.filename)
    
    # Generate unique job ID
    job_id = uuid.uuid4().hex
    fname = f"{job_id}.{ext}"
    
    # Read file content
    try:
        file_content = upload_file.file.read()
        logger.info(f"Read file {upload_file.filename} ({len(file_content)} bytes)")
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(status_code=400, detail="Failed to read file")
    
    if USE_BLOB_STORAGE:
        return _save_to_blob_storage(file_content, fname, job_id, file_type)
    else:
        return _save_to_local_filesystem(file_content, fname, job_id, file_type)

def _save_to_local_filesystem(file_content: bytes, fname: str, job_id: str, file_type: str):
    """Save file to local filesystem."""
    try:
        path = UPLOAD_DIR / fname
        with open(path, 'wb') as f:
            f.write(file_content)
        logger.info(f"Saved file locally: {path} (job_id={job_id})")
        return job_id, str(path), file_type
    except Exception as e:
        logger.error(f"Failed to save file locally: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")

def _save_to_blob_storage(file_content: bytes, fname: str, job_id: str, file_type: str):
    """Save file to Azure Blob Storage (with local temp copy for processing)."""
    try:
        # Upload to Azure Blob Storage
        blob_service_client = get_blob_service_client()
        container_client = blob_service_client.get_container_client(AZURE_BLOB_CONTAINER)
        
        logger.info(f"Uploading to Azure Blob Storage: {fname}")
        container_client.upload_blob(fname, file_content, overwrite=True)
        logger.info(f"Successfully uploaded to blob storage: {fname}")
        
        # Save local temp copy for processing
        # (Azure Blob Storage can't be accessed like a file, need local copy)
        temp_path = Path(tempfile.gettempdir()) / fname
        with open(temp_path, 'wb') as f:
            f.write(file_content)
        logger.info(f"Saved temp copy for processing: {temp_path}")
        
        return job_id, str(temp_path), file_type
        
    except ImportError as e:
        logger.error("azure-storage-blob package not installed")
        raise HTTPException(
            status_code=500,
            detail="Azure Blob Storage is not properly configured"
        )
    except Exception as e:
        logger.error(f"Failed to save to Azure Blob Storage: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload file: {str(e)}"
        )

def cleanup_path(path: str):
    """
    Clean up temporary files.
    
    In Azure: Deletes temp file (blob storage file remains)
    In Local: Deletes upload file
    """
    try:
        if path and os.path.exists(path):
            os.remove(path)
            logger.debug(f"Cleaned up file: {path}")
    except Exception as e:
        logger.warning(f"Failed to cleanup {path}: {e}")

def cleanup_blob_storage(blob_name: str):
    """Delete file from Azure Blob Storage (optional cleanup)."""
    if not USE_BLOB_STORAGE:
        return
    
    try:
        blob_service_client = get_blob_service_client()
        container_client = blob_service_client.get_container_client(AZURE_BLOB_CONTAINER)
        container_client.delete_blob(blob_name)
        logger.info(f"Deleted blob from storage: {blob_name}")
    except Exception as e:
        logger.warning(f"Failed to delete blob {blob_name}: {e}")

##----------------------DEV---------------------------
# import os
# import shutil
# import uuid
# from pathlib import Path
# from fastapi import UploadFile, HTTPException
# from .config import UPLOAD_DIR

# # Supported file extensions
# SUPPORTED_EXTENSIONS = {
#     'pdf': 'pdf',
#     'jpg': 'image',
#     'jpeg': 'image',
#     'png': 'image',
#     'txt': 'text',
#     'docx': 'word',
#     'doc': 'word'
# }

# def get_file_type(filename: str) -> str:
#     """
#     Determine file type from filename.
#     Returns: 'pdf', 'image', 'text', 'word', or raises HTTPException
#     """
#     ext = filename.lower().split('.')[-1]
#     if ext not in SUPPORTED_EXTENSIONS:
#         raise HTTPException(
#             status_code=400,
#             detail=f"Unsupported file type: .{ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
#         )
#     return SUPPORTED_EXTENSIONS[ext]

# def save_upload_tmp(upload_file: UploadFile):
#     """
#     Save uploaded file and return job_id, file_path, and file_type.
#     """
#     if not upload_file.filename:
#         raise HTTPException(status_code=400, detail="No filename provided")
    
#     # Get file extension
#     ext = upload_file.filename.lower().split('.')[-1]
#     file_type = get_file_type(upload_file.filename)
    
#     # Generate unique job ID
#     job_id = uuid.uuid4().hex
#     fname = f"{job_id}.{ext}"
#     path = UPLOAD_DIR / fname
    
#     # Save file
#     with open(path, 'wb') as f:
#         shutil.copyfileobj(upload_file.file, f)
    
#     return job_id, str(path), file_type

# def cleanup_path(path):
#     try:
#         os.remove(path)
#     except Exception:
#         pass
    