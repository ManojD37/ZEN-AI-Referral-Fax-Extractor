# # app/config.py (add these lines)
# import os
# from pathlib import Path
# from dotenv import load_dotenv

# load_dotenv()

# # existing vars...
# BASE_DIR = Path(__file__).resolve().parent.parent
# UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", BASE_DIR / "uploads"))
# UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# MAX_PAGES = int(os.getenv("MAX_PAGES", "8"))
# TESSERACT_CMD = os.getenv("TESSERACT_CMD", "")

# # Azure OpenAI settings
# AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
# AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY", "")
# AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "")
# AZURE_OPENAI_API_VERSION = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")
# app/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = Path(os.getenv('UPLOAD_DIR', BASE_DIR / 'uploads'))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# general
MAX_PAGES = int(os.getenv('MAX_PAGES', '8'))
TESSERACT_CMD = os.getenv('TESSERACT_CMD', '').strip()

# Azure OpenAI
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', '').strip()
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY', '').strip()
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', '').strip()
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview').strip()
