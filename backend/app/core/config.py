import os
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict


def _parse_cors_origins() -> List[str]:
    env_val = os.getenv("CORS_ORIGINS", "").strip()
    if env_val:
        # Split by comma and strip spaces
        return [o.strip() for o in env_val.split(",") if o.strip()]
    # Default development origins
    return ["http://localhost:4200", "http://127.0.0.1:4200"]


class Settings(BaseSettings):
    # Pydantic v2 settings configuration
    # - extra: ignore unknown env vars (systemd EnvironmentFile may include many keys)
    # - env_file: load .env next to backend
    # - case_sensitive: keep env var names as-is
    model_config = SettingsConfigDict(
        extra="ignore",
        env_file=".env",
        case_sensitive=True,
    )
    # API Configuration
    api_v1_str: str = "/api/v1"
    project_name: str = "Ubuntu Server Admin"
    
    # Security
    # Use JWT_* env vars for consistency with auth routes
    secret_key: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
    access_token_expire_minutes: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./server_admin.db")
    
    # CORS
    backend_cors_origins: List[str] = _parse_cors_origins()
    
    # Server
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "True").lower() in ("1", "true", "yes", "on")
    
settings = Settings()
