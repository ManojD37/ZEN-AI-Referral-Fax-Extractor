import os
import shutil
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from .config import UPLOAD_DIR

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
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS.keys())}"
        )
    return SUPPORTED_EXTENSIONS[ext]

def save_upload_tmp(upload_file: UploadFile):
    """
    Save uploaded file and return job_id, file_path, and file_type.
    """
    if not upload_file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    # Get file extension
    ext = upload_file.filename.lower().split('.')[-1]
    file_type = get_file_type(upload_file.filename)
    
    # Generate unique job ID
    job_id = uuid.uuid4().hex
    fname = f"{job_id}.{ext}"
    path = UPLOAD_DIR / fname
    
    # Save file
    with open(path, 'wb') as f:
        shutil.copyfileobj(upload_file.file, f)
    
    return job_id, str(path), file_type

def cleanup_path(path):
    try:
        os.remove(path)
    except Exception:
        pass
    