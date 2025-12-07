# app/log.py
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime
from pathlib import Path

# -------------------------
# Log directory & file setup
# -------------------------
ROOT = Path(__file__).resolve().parents[1]   # backend/
LOG_DIR = ROOT / "logs"
LOG_DIR.mkdir(exist_ok=True)

log_filename = LOG_DIR / f"app_{datetime.now().strftime('%Y-%m-%d')}.log"

# -------------------------
# Logger configuration
# -------------------------
logger = logging.getLogger("FaxRefBackend")
logger.setLevel(logging.DEBUG)   # Change to INFO in production

formatter = logging.Formatter(
    "%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Console output
console_handler = logging.StreamHandler()
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

# Rotating log file (5MB per file, 5 backups)
file_handler = RotatingFileHandler(
    log_filename,
    maxBytes=5 * 1024 * 1024,
    backupCount=5,
    encoding="utf-8"
)
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

# Optional: silence noisy loggers
logging.getLogger("uvicorn.access").disabled = False
logging.getLogger("PIL").setLevel(logging.WARNING)
logging.getLogger("pdf2image").setLevel(logging.WARNING)

logger.info("Logging system initialized.")
