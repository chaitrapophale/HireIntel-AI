import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "HireIntel AI"
    API_V1_STR: str = "/api/v1"
    
    # DB
    DATABASE_URL: str = "sqlite:///./hireintel.db"
    
    # Chroma
    CHROMA_PERSIST_DIRECTORY: str = "./chroma_db"
    
    # Security
    JWT_SECRET: str = "a_very_secret_string_please_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None

    # Gemini API (primary AI provider)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Controls which provider is used: "gemini" | "nvidia"
    DEFAULT_AI_PROVIDER: str = "gemini"
    
    # NVIDIA API
    NVIDIA_API_KEY: Optional[str] = None
    NVIDIA_API_KEY_PARSE: Optional[str] = None
    NVIDIA_API_KEY_EMBED: Optional[str] = None
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    
    # Models as requested
    NVIDIA_PARSE_MODEL: str = "nvidia/llama-3.3-nemotron-super-49b-v1"
    NVIDIA_EMBED_MODEL: str = "nvidia/nv-embedqa-e5-v5"
    NVIDIA_RANK_MODEL: str = "meta/llama-3.1-70b-instruct"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True, extra="ignore")

settings = Settings()
