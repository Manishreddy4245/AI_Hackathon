import os
import sys
import pytest

# Enforce isolated test environment variables before application or settings are imported
os.environ["ENV"] = "test"
os.environ["ENVIRONMENT"] = "test"
if not os.environ.get("MONGODB_DATABASE") or os.environ.get("MONGODB_DATABASE") == "placemind":
    os.environ["MONGODB_DATABASE"] = "placemind_test"

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.core.config import settings
settings.ENV = "test"
settings.MONGODB_DATABASE = os.environ.get("MONGODB_DATABASE", "placemind_test")

from fastapi.testclient import TestClient
from app.main import app
from app.db.mongodb import db_manager, connect_to_mongo, close_mongo_connection

@pytest.fixture(scope="session", autouse=True)
def initialize_test_environment():
    """Ensure lifespan runs and database is connected for test sessions."""
    with TestClient(app) as test_client:
        yield test_client

@pytest.fixture
def client():
    """Provides a TestClient within the active application context."""
    with TestClient(app) as test_client:
        yield test_client
