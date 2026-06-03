from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.config import settings
from jose import jwt
from passlib.context import CryptContext

# Change from bcrypt to argon2 (no 72-byte limit)
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def truncate_password(password: str, max_bytes: int = 72) -> str:
    """Truncate password to max_bytes for compatibility (kept for safety)"""
    encoded = password.encode('utf-8')[:max_bytes]
    return encoded.decode('utf-8', errors='ignore')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    # Argon2 doesn't have the 72-byte limit, but we'll keep truncation for safety
    truncated = truncate_password(plain_password)
    return pwd_context.verify(truncated, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password using argon2."""
    truncated = truncate_password(password)
    return pwd_context.hash(truncated)


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta else timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode: dict[str, Any] = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)