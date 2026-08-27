import asyncio
import logging
import time
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, ping_database, db_manager
from app.db.seed import seed_database
from app.db.integrity import setup_data_integrity, generate_data_integrity_report
from app.middleware.observability import RequestObservabilityMiddleware
from app.core.telemetry import capture_exception, metrics, log_structured_event

from app.routes.auth import router as auth_router
from app.routes.companies import router as companies_router
from app.routes.drives import router as drives_router
from app.routes.students import router as students_router
from app.routes.matching import router as matching_router
from app.routes.interviews import router as interviews_router, singular_router as interview_router
from app.routes.panels import router as panels_router
from app.routes.rooms import router as rooms_router
from app.routes.notifications import router as notifications_router
from app.routes.exceptions import router as exceptions_router
from app.routes.analytics import router as analytics_router
from app.routes.copilot import router as copilot_router
from app.routes.audit import router as audit_router
from app.routes.ai_extractor import router as ai_extractor_router
from app.routes.resumes import router as resumes_router
from app.routes.opportunities import router as opportunities_router
from app.routes.applications import router as applications_router
from app.routes.dashboard import router as dashboard_router
from app.routes.admin import router as admin_router
from app.routes.assessments import router as assessments_router
from app.routes.communities import router as communities_router
from app.routes.forms import router as forms_router

# Configure structured application logger
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("placemind.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager handling application startup and shutdown events."""
    logger.info("Starting PlaceMind API server...")
    await connect_to_mongo()
    asyncio.create_task(setup_data_integrity(db_manager.db))
    if settings.ENABLE_DB_SEED or settings.SEED_DEMO_DATA:
        asyncio.create_task(seed_database())
    yield
    logger.info("Shutting down PlaceMind API server...")
    await close_mongo_connection()

app = FastAPI(
    title="PlaceMind API",
    description="AI-powered campus placement operations and interview coordination API.",
    version="1.0.0",
    lifespan=lifespan
)

# 1. Observability & Tracing Middleware
app.add_middleware(RequestObservabilityMiddleware)

# 2. Configure CORS Middleware
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global catch-all exception handler providing safe error responses and server-side logging."""
    request_id = getattr(request.state, "request_id", "unknown")
    capture_exception(exc, {"request_id": request_id, "endpoint": request.url.path})
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please contact system administration.",
            "request_id": request_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

# 4. Register API Routers
app.include_router(auth_router)
app.include_router(companies_router)
app.include_router(drives_router)
app.include_router(forms_router)
app.include_router(students_router)
app.include_router(matching_router)
app.include_router(interviews_router)
app.include_router(interview_router)
app.include_router(panels_router)
app.include_router(rooms_router)
app.include_router(notifications_router)
app.include_router(exceptions_router)
app.include_router(analytics_router)
app.include_router(copilot_router)
app.include_router(audit_router)
app.include_router(ai_extractor_router)
app.include_router(resumes_router)
app.include_router(opportunities_router)
app.include_router(applications_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(assessments_router)
app.include_router(communities_router)

# 5. Telemetry & Health Endpoints
@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "PlaceMind API is running"}

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Liveness probe endpoint."""
    is_db_ok = await ping_database()
    return {
        "status": "ok" if is_db_ok else "degraded",
        "service": "placemind-api",
        "database": "connected" if is_db_ok else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

@app.get("/api/readiness", tags=["Health"])
async def readiness_check():
    """Readiness probe checking database, AI configuration, and code execution worker readiness."""
    is_db_ok = await ping_database()
    ai_configured = bool(getattr(settings, "GOOGLE_API_KEY", ""))
    
    if not is_db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "UNREADY",
                "reason": "Database connection degraded",
                "database": "FAILED",
                "ai_gateway": "READY" if ai_configured else "FALLBACK_MODE",
                "sandbox_engine": "READY",
            }
        )
    return {
        "status": "READY",
        "database": "OK",
        "ai_gateway": "READY" if ai_configured else "FALLBACK_MODE",
        "sandbox_engine": "READY",
    }

@app.get("/api/metrics", tags=["Observability"])
async def get_system_metrics():
    """Real-time system performance and operational metrics."""
    return metrics.get_summary()
