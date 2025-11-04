"""
Application settings and configuration.
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Keys
    openai_api_key: str = ""
    
    # Application Settings
    app_name: str = "Resume Job Skill Gap Analyzer"
    app_version: str = "1.0.0"
    debug: bool = True
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # CORS Settings
    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    
    # File Upload Settings
    max_file_size_mb: int = 10
    allowed_extensions: str = ".pdf,.docx,.txt"
    
    # LLM Settings
    llm_model: str = "gpt-4-turbo-preview"
    llm_temperature: float = 0.3
    llm_max_tokens: int = 2000
    
    # NLP Settings
    spacy_model: str = "en_core_web_sm"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.cors_origins.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """Parse allowed extensions string into list."""
        return [ext.strip() for ext in self.allowed_extensions.split(",")]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = Settings()

