import os
from typing import Literal
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

INSECURE_DEFAULT_SECRETS = {
    "placemind-super-secret-jwt-key-2026",
    "placemind-super-secret-jwt-key-change-in-production",
    "dev-jwt-secret-key-change-in-prod-2026",
    "change_me",
    "secret",
    "password",
    "admin",
    "123456",
}

class Settings(BaseSettings):
    ENV: Literal["development", "test", "staging", "production"] = Field(
        default="development",
        alias="ENVIRONMENT"
    )
    MONGODB_URI: str = Field(
        default="mongodb://127.0.0.1:27017",
        description="MongoDB connection string (must come from backend/.env or environment variable)"
    )
    MONGODB_DATABASE: str = Field(
        default="placemind",
        description="MongoDB database name (must come from backend/.env or environment variable)"
    )
    FRONTEND_URL: str = "http://localhost:5173"
    JWT_SECRET: str = "dev-jwt-secret-key-change-in-prod-2026"
    SECURITY_SALT: str = "dev-security-salt-2026"
    AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    ALLOW_MOCK_DB: bool = False
    APTITUDE_PASS_PERCENTAGE: float = 60.0
    TECHNICAL_PASS_PERCENTAGE: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True
    )

    @model_validator(mode="after")
    def validate_configuration(self) -> "Settings":
        env_mode = (self.ENV or os.getenv("ENV") or os.getenv("ENVIRONMENT") or "development").lower().strip()
        errors = []

        # Enforce non-empty MONGODB_URI and MONGODB_DATABASE across all environments
        if not self.MONGODB_URI or not self.MONGODB_URI.strip():
            errors.append("MONGODB_URI is required and cannot be empty. Configure MONGODB_URI in backend/.env.")
        elif not (self.MONGODB_URI.startswith("mongodb://") or self.MONGODB_URI.startswith("mongodb+srv://")):
            errors.append("MONGODB_URI must start with 'mongodb://' or 'mongodb+srv://'.")

        if not self.MONGODB_DATABASE or not self.MONGODB_DATABASE.strip():
            errors.append("MONGODB_DATABASE is required and cannot be empty. Configure MONGODB_DATABASE in backend/.env.")

        # Strict validation for Production / Staging environments
        if env_mode in ["production", "staging"]:
            # 1. Require production MONGODB_URI (not localhost/127.0.0.1)
            if not self.MONGODB_URI or "localhost" in self.MONGODB_URI.lower() or "127.0.0.1" in self.MONGODB_URI:
                errors.append("MONGODB_URI must be set to a valid remote database connection string in production/staging.")

            # 2. Require production JWT_SECRET (not default/weak)
            if not self.JWT_SECRET or self.JWT_SECRET.strip() in INSECURE_DEFAULT_SECRETS:
                errors.append("JWT_SECRET must be configured with a secure high-entropy string in production/staging.")

            # 3. Require AI API credentials
            if not self.GEMINI_API_KEY.strip() and not self.AI_API_KEY.strip() and not self.GOOGLE_API_KEY.strip():
                errors.append("AI API credentials (GEMINI_API_KEY, GOOGLE_API_KEY or AI_API_KEY) must be provided in production/staging.")

            # 4. Require non-localhost FRONTEND_URL
            if not self.FRONTEND_URL or "localhost" in self.FRONTEND_URL.lower() or "127.0.0.1" in self.FRONTEND_URL:
                errors.append("FRONTEND_URL must be configured with a production domain (no localhost/127.0.0.1) in production/staging.")

            # 5. Disable mock database
            if self.ALLOW_MOCK_DB:
                errors.append("ALLOW_MOCK_DB must be set to False in production/staging.")

        if errors:
            prefix = "CRITICAL PRODUCTION CONFIGURATION ERROR" if env_mode in ["production", "staging"] else "CONFIGURATION VALIDATION ERROR"
            error_msg = f"{prefix} ({env_mode.upper()} MODE):\n" + "\n".join(f"- {err}" for err in errors)
            raise ValueError(error_msg)

        return self

settings = Settings()

def get_safe_db_target(uri: str = "", db_name: str = "", env_name: str = "") -> dict:
    """
    Parses connection details and returns a sanitized dictionary for logs and scripts
    without revealing username, password, or auth query parameters.
    """
    raw_uri = (uri if uri else settings.MONGODB_URI) or ""
    database = (db_name if db_name else settings.MONGODB_DATABASE) or "unknown"
    environment = (env_name if env_name else settings.ENV) or "development"

    scheme = "unknown"
    host_display = "unknown"
    is_atlas = False

    if "://" in raw_uri:
        scheme, remainder = raw_uri.split("://", 1)
        is_atlas = (scheme == "mongodb+srv" or "mongodb.net" in remainder)
        if "@" in remainder:
            _, host_part = remainder.split("@", 1)
        else:
            host_part = remainder
        host_display = host_part.split("/")[0].split("?")[0]
    else:
        host_display = raw_uri or "unknown"

    return {
        "host": host_display,
        "database": database,
        "scheme": scheme,
        "environment": environment,
        "is_atlas": is_atlas,
    }

def get_gemini_api_key() -> str:
    """Returns the configured Gemini/Google AI API key from environment, settings, or reloaded .env file."""
    try:
        from dotenv import dotenv_values
        env_dict = dotenv_values(".env")
        key_from_file = (
            env_dict.get("GEMINI_API_KEY")
            or env_dict.get("GOOGLE_API_KEY")
            or env_dict.get("AI_API_KEY")
            or ""
        ).strip()
        if key_from_file and key_from_file not in ["your-gemini-api-key-here", "change_me", "test-gemini-key", "mock-key", "default-gemini-key"]:
            return key_from_file
    except Exception:
        pass

    key = (
        os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
        or os.getenv("AI_API_KEY")
        or settings.GEMINI_API_KEY
        or settings.GOOGLE_API_KEY
        or settings.AI_API_KEY
        or ""
    ).strip()
    if key in ["your-gemini-api-key-here", "change_me", "test-gemini-key", "mock-key", "default-gemini-key"]:
        return ""
    return key
