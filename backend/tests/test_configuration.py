import pytest
from pydantic import ValidationError
from app.core.config import Settings

def test_development_configuration_defaults():
    """Verify development mode accepts default dev values."""
    s = Settings(
        ENV="development",
        MONGODB_URI="mongodb://localhost:27017",
        MONGODB_DATABASE="placemind_dev",
        FRONTEND_URL="http://localhost:5173",
        JWT_SECRET="dev-secret-key-12345",
        ALLOW_MOCK_DB=True
    )
    assert s.ENV == "development"
    assert s.ALLOW_MOCK_DB is True

def test_test_environment_configuration():
    """Verify test mode setting validation."""
    s = Settings(
        ENV="test",
        MONGODB_URI="mongodb://localhost:27017",
        MONGODB_DATABASE="placemind_test",
        FRONTEND_URL="http://localhost:5173",
        JWT_SECRET="test-secret-key-67890",
        ALLOW_MOCK_DB=True
    )
    assert s.ENV == "test"
    assert s.ALLOW_MOCK_DB is True

def test_production_configuration_fail_fast_on_missing_secrets():
    """Verify production fails fast if required secrets or production URLs are missing/invalid."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            ENV="production",
            MONGODB_URI="mongodb://localhost:27017",  # Insecure localhost
            JWT_SECRET="dev-jwt-secret-key-change-in-prod-2026",  # Weak default secret
            FRONTEND_URL="http://localhost:5173",  # Insecure localhost
            ALLOW_MOCK_DB=True  # Insecure mock DB in prod
        )
    
    err_str = str(exc_info.value)
    assert "CRITICAL PRODUCTION CONFIGURATION ERROR" in err_str
    assert "MONGODB_URI must be set" in err_str
    assert "JWT_SECRET must be configured" in err_str
    assert "AI API credentials" in err_str
    assert "FRONTEND_URL must be configured" in err_str
    assert "ALLOW_MOCK_DB must be set to False" in err_str

def test_production_configuration_passes_with_valid_secrets():
    """Verify production succeeds when valid remote URLs, non-default secrets, and disabled mocks are supplied."""
    s = Settings(
        ENV="production",
        MONGODB_URI="mongodb+srv://prod_user:SecurePass123!@cluster.mongodb.net/placemind_prod",
        MONGODB_DATABASE="placemind_prod",
        FRONTEND_URL="https://placemind.university.edu",
        JWT_SECRET="x8f9a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8",
        SECURITY_SALT="s9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8",
        GEMINI_API_KEY="AIzaSySampleProductionGeminiKey987654321",
        ALLOW_MOCK_DB=False
    )
    assert s.ENV == "production"
    assert s.ALLOW_MOCK_DB is False
    assert s.FRONTEND_URL == "https://placemind.university.edu"
