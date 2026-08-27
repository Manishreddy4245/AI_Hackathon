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
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DATABASE: str = "placemind"
    FRONTEND_URL: str = "http://localhost:5173"
    JWT_SECRET: str = "dev-jwt-secret-key-change-in-prod-2026"
    SECURITY_SALT: str = "dev-security-salt-2026"
    AI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
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
    def validate_production_configuration(self) -> "Settings":
        env_mode = (self.ENV or os.getenv("ENV") or os.getenv("ENVIRONMENT") or "development").lower().strip()
        
        if env_mode in ["production", "staging"]:
            errors = []

            # 1. Require production MONGODB_URI (not localhost/127.0.0.1)
            if not self.MONGODB_URI or "localhost" in self.MONGODB_URI.lower() or "127.0.0.1" in self.MONGODB_URI:
                errors.append("MONGODB_URI must be set to a valid remote database connection string in production/staging.")

            # 2. Require production JWT_SECRET (not default/weak)
            if not self.JWT_SECRET or self.JWT_SECRET.strip() in INSECURE_DEFAULT_SECRETS:
                errors.append("JWT_SECRET must be configured with a secure high-entropy string in production/staging.")

            # 3. Require AI API credentials
            if not self.GEMINI_API_KEY.strip() and not self.AI_API_KEY.strip():
                errors.append("AI API credentials (GEMINI_API_KEY or AI_API_KEY) must be provided in production/staging.")

            # 4. Require non-localhost FRONTEND_URL
            if not self.FRONTEND_URL or "localhost" in self.FRONTEND_URL.lower() or "127.0.0.1" in self.FRONTEND_URL:
                errors.append("FRONTEND_URL must be configured with a production domain (no localhost/127.0.0.1) in production/staging.")

            # 5. Disable mock database
            if self.ALLOW_MOCK_DB:
                errors.append("ALLOW_MOCK_DB must be set to False in production/staging.")

            if errors:
                error_msg = f"CRITICAL PRODUCTION CONFIGURATION ERROR ({env_mode.upper()} MODE):\n" + "\n".join(f"- {err}" for err in errors)
                raise ValueError(error_msg)

        return self

settings = Settings()
