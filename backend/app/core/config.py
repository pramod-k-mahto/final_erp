import os

import secrets
from functools import lru_cache
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, model_validator
# Load .env file
env_path = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=env_path)
class Settings(BaseModel):
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://postgres:admin@localhost:5432/account_system",
    )
    secret_key: str = os.getenv("SECRET_KEY", "change-this")
    license_secret: str = os.getenv("LICENSE_SECRET", "tH5kXjzZ3cR-8YwHqP6mS9sLpG_y5tXjzZ3cR-8YwHq=")
    algorithm: str = "HS256"
    # Sliding idle timeout: access tokens expire this many minutes after the last
    # authenticated API request (renewed automatically). No fixed periodic logout while active.
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    # Longer-lived refresh token (7 days default)
    refresh_token_expire_minutes: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", "10080"))

    print(os.getenv("CORS_ORIGINS"))
    # 1 wrong 
    cors_origins: list[str] = list({
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000"
    ).split(",")
    if origin.strip()
})
    # CSRF double-submit cookie secret
    csrf_secret: str = os.getenv("CSRF_SECRET", secrets.token_hex(32))
    # Debug mode — must be False in production
    debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    # When true, trust X-Forwarded-* from reverse proxy (Caddy/Nginx). Only enable behind a trusted proxy.
    trust_proxy_headers: bool = os.getenv("TRUST_PROXY_HEADERS", "false").lower() in (
        "true",
        "1",
        "yes",
    )

    @model_validator(mode="after")
    def _warn_insecure_defaults(self) -> "Settings":
        import warnings
        if self.database_url and "localhost" not in self.database_url and not self.database_url.startswith("sqlite"):
            import os
            if not os.getenv("DB_SSLMODE"):
                warnings.warn(
                    "SECURITY WARNING: Non-local database detected but DB_SSLMODE is not set. "
                    "Set DB_SSLMODE=require (or verify-full) for production.",
                    stacklevel=2,
                )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[arg-type]
