import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# ========== ENVIRONMENT DETECTION ==========
BASE_DIR = Path(__file__).resolve().parent.parent
ENVIRONMENT = os.getenv("ENVIRONMENT", "local").lower()
DEBUG = ENVIRONMENT in ["local", "dev"]

# ========== FILE UPLOAD CONFIGURATION ==========
# In Azure: Use Azure Blob Storage
# In Local: Use filesystem
USE_BLOB_STORAGE = ENVIRONMENT == "azure"

if USE_BLOB_STORAGE:
    # Azure Blob Storage for production
    AZURE_STORAGE_ACCOUNT = os.getenv('AZURE_STORAGE_ACCOUNT', '').strip()
    AZURE_STORAGE_KEY = os.getenv('AZURE_STORAGE_KEY', '').strip()
    AZURE_STORAGE_CONNECTION_STRING = os.getenv('AZURE_STORAGE_CONNECTION_STRING', '').strip()
    AZURE_BLOB_CONTAINER = os.getenv('AZURE_BLOB_CONTAINER', 'uploads').strip()
    
    # Validate required Azure Storage config
    if not AZURE_STORAGE_CONNECTION_STRING:
        raise ValueError(
            "AZURE_STORAGE_CONNECTION_STRING is required in Azure environment. "
            "Set it in Azure App Service Configuration."
        )
    
    # Local temp directory for processing
    UPLOAD_DIR = Path("/tmp/uploads")
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
else:
    # Local filesystem for development
    upload_dir_env = os.getenv('UPLOAD_DIR', str(BASE_DIR / 'uploads'))
    UPLOAD_DIR = Path(upload_dir_env)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    AZURE_STORAGE_CONNECTION_STRING = None
    AZURE_BLOB_CONTAINER = None

# ========== OCR CONFIGURATION ==========
MAX_PAGES = int(os.getenv('MAX_PAGES', '8'))
TESSERACT_CMD = os.getenv('TESSERACT_CMD', '/usr/bin/tesseract').strip()

# ========== AZURE OPENAI CONFIGURATION ==========
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', '').strip()
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY', '').strip()
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', '').strip()
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview').strip()

# Validate required Azure OpenAI config in production
if ENVIRONMENT == "azure":
    required_fields = {
        'AZURE_OPENAI_ENDPOINT': AZURE_OPENAI_ENDPOINT,
        'AZURE_OPENAI_API_KEY': AZURE_OPENAI_API_KEY,
        'AZURE_OPENAI_DEPLOYMENT': AZURE_OPENAI_DEPLOYMENT,
    }
    for field_name, field_value in required_fields.items():
        if not field_value:
            raise ValueError(
                f"Missing required config: {field_name}. "
                f"Set it in Azure App Service Configuration."
            )

# ========== CORS CONFIGURATION ==========
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost",
    "http://localhost:80",
]

# Add frontend URL from environment
frontend_url = os.getenv('FRONTEND_URL', '').strip()
if frontend_url:
    ALLOWED_ORIGINS.append(frontend_url)

# Add any additional origins from env (comma-separated)
extra_origins = os.getenv('EXTRA_ORIGINS', '').strip()
if extra_origins:
    ALLOWED_ORIGINS.extend([o.strip() for o in extra_origins.split(',') if o.strip()])

# Remove duplicates and empty strings
ALLOWED_ORIGINS = list(set(o for o in ALLOWED_ORIGINS if o))

# ========== LOGGING CONFIGURATION ==========
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO' if not DEBUG else 'DEBUG')
LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

# ========== FILE PROCESSING CONFIGURATION ==========
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
TEMP_DIR = Path("/tmp") if ENVIRONMENT == "azure" else Path(BASE_DIR / "temp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ========== VALIDATION ==========
if __name__ == "__main__":
    print(f"Configuration loaded for environment: {ENVIRONMENT}")
    print(f"Using Blob Storage: {USE_BLOB_STORAGE}")
    print(f"Upload Directory: {UPLOAD_DIR}")
    print(f"Allowed Origins: {ALLOWED_ORIGINS}")
# app/config.py
# import os
# from pathlib import Path
# from dotenv import load_dotenv

# load_dotenv()

# BASE_DIR = Path(__file__).resolve().parent.parent
# UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', BASE_DIR / 'uploads'))
# UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# # general
# MAX_PAGES = int(os.getenv('MAX_PAGES', '8'))
# TESSERACT_CMD = os.getenv('TESSERACT_CMD', '').strip()

# # Azure OpenAI
# AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', '').strip()
# AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY', '').strip()
# AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', '').strip()
# AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview').strip()
