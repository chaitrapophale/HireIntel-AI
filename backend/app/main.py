import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.api.routers import api_router
from app.core.database import engine, Base, SessionLocal
from app.core.config import settings
from app.core.logging import logger
from sqlalchemy import select

# Import models
from app.models.job import JobModel
from app.models.candidate import CandidateModel
from app.models.user import User

# ---------------------------------------------------------------------------
# Database — (Schema migrations managed exclusively via Alembic)
# ---------------------------------------------------------------------------
# Base.metadata.create_all(bind=engine)  # REMOVED: Rely on Alembic

# Seed default jobs if database is empty
db = SessionLocal()
try:
    if db.execute(select(JobModel)).first() is None:
        logger.info("Seeding default jobs...")
        jobs = [
            JobModel(
                title="Senior Frontend Engineer",
                department="Engineering",
                location="San Francisco, CA",
                description="We are looking for a Senior Frontend Engineer with experience in React, TypeScript, and modern styling libraries to build stunning user interfaces.",
                core_skills=["React", "TypeScript", "TailwindCSS", "CSS"],
                soft_skills=["Communication", "Teamwork"],
                status="open"
            ),
            JobModel(
                title="AI Research Scientist",
                department="AI Research",
                location="Remote",
                description="Join our AI research team to develop advanced agentic workflows, custom embeddings architectures, and deploy LLM applications.",
                core_skills=["Python", "PyTorch", "Embeddings", "LLMs"],
                soft_skills=["Research", "Critical Thinking"],
                status="open"
            ),
            JobModel(
                title="Product Manager",
                department="Product",
                location="New York, NY",
                description="We are looking for a Product Manager to own the lifecycle of our recruitment platform, work closely with engineering, and design workflows.",
                core_skills=["Agile", "Roadmapping", "Product Strategy"],
                soft_skills=["Leadership", "Stakeholder Management"],
                status="open"
            )
        ]
        db.add_all(jobs)
        db.commit()
        logger.info("Default jobs seeded successfully.")
except Exception as e:
    logger.error(f"Failed to seed default jobs: {e}")
finally:
    db.close()

# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend services for AI recruitment.",
    version="1.0.0",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please try again later."},
    )

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173,http://127.0.0.1:5173")
origins = [url.strip() for url in frontend_url.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(api_router, prefix=settings.API_V1_STR)

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "HireIntel AI Backend is running."}

# ---------------------------------------------------------------------------
# Serve frontend static files (for production / GCR deployment)
# ---------------------------------------------------------------------------
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist, "assets")),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        return FileResponse(os.path.join(frontend_dist, "index.html"))
