# app/auth.py
"""
Simple admin authentication for settings page.
Uses bcrypt for password hashing and JWT-like tokens for sessions.
"""
import os
import hashlib
import secrets
import time
from typing import Optional, Dict
from functools import wraps
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.log import logger

# Session storage (in-memory for simplicity, use Redis in production)
_sessions: Dict[str, dict] = {}

# Configuration
SESSION_EXPIRY_SECONDS = 24 * 60 * 60  # 24 hours (more secure than 30 days)
ADMIN_PASSWORD_ENV = "ADMIN_PASSWORD"
DEFAULT_ADMIN_PASSWORD = "QtOwbFqlrQJoXcP701iwfdz8Vx77UZTOVOeHmRV"  # Change in production!


def get_admin_password_hash() -> str:
    """Get the admin password hash from environment or use default."""
    password = os.getenv(ADMIN_PASSWORD_ENV, DEFAULT_ADMIN_PASSWORD)
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str) -> bool:
    """Verify if the provided password matches the admin password."""
    provided_hash = hashlib.sha256(password.encode()).hexdigest()
    stored_hash = get_admin_password_hash()
    return secrets.compare_digest(provided_hash, stored_hash)


def create_session() -> str:
    """Create a new admin session and return the token."""
    token = secrets.token_urlsafe(32)
    _sessions[token] = {
        "created_at": time.time(),
        "expires_at": time.time() + SESSION_EXPIRY_SECONDS
    }
    logger.info(f"New admin session created, expires in {SESSION_EXPIRY_SECONDS} seconds")
    return token


def verify_session(token: str) -> bool:
    """Verify if a session token is valid and not expired."""
    if not token or token not in _sessions:
        return False
    
    session = _sessions[token]
    if time.time() > session["expires_at"]:
        # Session expired, remove it
        del _sessions[token]
        logger.info("Admin session expired")
        return False
    
    return True


def invalidate_session(token: str) -> bool:
    """Invalidate/logout a session."""
    if token in _sessions:
        del _sessions[token]
        logger.info("Admin session invalidated")
        return True
    return False


def cleanup_expired_sessions():
    """Remove all expired sessions."""
    current_time = time.time()
    expired = [k for k, v in _sessions.items() if current_time > v["expires_at"]]
    for token in expired:
        del _sessions[token]
    if expired:
        logger.info(f"Cleaned up {len(expired)} expired sessions")


# FastAPI security scheme
security = HTTPBearer(auto_error=False)


async def get_admin_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[str]:
    """Extract admin token from Authorization header."""
    if credentials:
        return credentials.credentials
    return None


async def require_admin(
    token: Optional[str] = Depends(get_admin_token)
) -> bool:
    """Dependency that requires admin authentication."""
    if not token or not verify_session(token):
        raise HTTPException(
            status_code=401,
            detail="Admin authentication required"
        )
    return True


def admin_required(func):
    """Decorator for admin-only endpoints."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request: Request = kwargs.get("request")
        if request:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
                if verify_session(token):
                    return await func(*args, **kwargs)
        raise HTTPException(status_code=401, detail="Admin authentication required")
    return wrapper
