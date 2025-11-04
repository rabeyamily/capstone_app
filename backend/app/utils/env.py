"""
Development utilities and helpers.
"""
from app.config import settings


def get_settings():
    """Get application settings."""
    return settings


def validate_env():
    """Validate that required environment variables are set."""
    errors = []
    
    if not settings.openai_api_key or settings.openai_api_key == "your_openai_api_key_here":
        errors.append("OPENAI_API_KEY is not set or is using placeholder value")
    
    return errors

