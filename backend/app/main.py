import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection, ping_database, db_manager
from app.db.seed import seed_database
from app.db.integrity import setup_data_integrity, generate_data_integrity_report

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

# Configure simple application logger
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
    # Execute integrity verification and seeding in background so server begins accepting requests immediately
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

# Configure CORS Middleware for all dev clients
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

# Register API Routers
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


@app.get("/", tags=["Root"])
async def read_root():
    """Root welcome endpoint."""
    return {"message": "PlaceMind API is running"}

@app.get("/api/health", tags=["Health"])
async def health_check():
    """General service health status."""
    is_db_ok = await ping_database()
    return {
        "status": "ok",
        "service": "placemind-api",
        "database": "connected" if is_db_ok else "degraded"
    }

@app.get("/api/health/db", tags=["Health"])
async def db_health_check():
    """Database connectivity health check."""
    is_reachable = await ping_database()
    if is_reachable:
        return {
            "status": "ok",
            "database": settings.MONGODB_DATABASE
        }
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "degraded",
            "database": settings.MONGODB_DATABASE,
            "message": "MongoDB connection degraded"
        }
    )

@app.get("/api/health/data-integrity", tags=["Health"])
async def health_data_integrity():
    """Real-time data integrity report."""
    report = await generate_data_integrity_report(db_manager.db)
    return report

