"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache
import os
import sys

# Default insecure key — used ONLY to detect misconfiguration
_INSECURE_DEFAULT_KEY = "your-super-secret-key-change-in-production-min-32-chars"


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "AI Inclusive Assessment System"
    DEBUG: bool = False

    # Security
    SECRET_KEY: str = _INSECURE_DEFAULT_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database (MongoDB — configured via .env MONGODB_URL)
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "ai_assessment"

    # AI Models
    SBERT_MODEL: str = "all-MiniLM-L6-v2"

    # Gemini API
    GEMINI_API_KEY: str = ""

    # File Upload
    UPLOAD_DIR: str = "./data/uploads"
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    s = Settings()

    # ── Security Guard ──────────────────────────────────────────────────────
    # Raise a hard error in production if the default insecure key is still set.
    if not s.DEBUG and s.SECRET_KEY == _INSECURE_DEFAULT_KEY:
        print(
            "\n[FATAL] SECRET_KEY is set to the insecure default value.\n"
            "Set a strong SECRET_KEY in your .env file before running in production.\n",
            file=sys.stderr,
        )
        sys.exit(1)

    if s.SECRET_KEY == _INSECURE_DEFAULT_KEY:
        import logging
        logging.getLogger(__name__).warning(
            "SECRET_KEY is using the insecure default. "
            "Please set a strong SECRET_KEY in your .env file."
        )

    return s


settings = get_settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs("./data", exist_ok=True)
