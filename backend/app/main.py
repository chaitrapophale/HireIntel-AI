import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.api.routers import api_router
from app.core.database import engine, Base
from app.core.config import settings
from app.core.logging import logger

# Import models so SQLAlchemy knows about them before creating tables
from app.models.job import JobModel
from app.models.candidate import CandidateModel
from app.models.user import User

# Create database tables
Base.metadata.create_all(bind=engine)
logger.info("Database tables initialized.")

# Seed default jobs if database is empty
from app.core.database import SessionLocal
from app.models.job import JobModel

db = SessionLocal()
try:
    if db.query(JobModel).count() == 0:
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

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend services for AI recruitment.",
    version="1.0.0",
)

# Allow CORS for the frontend development server
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173,http://127.0.0.1:5173")
origins = [url.strip() for url in frontend_url.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "HireIntel AI Backend is running."}

# Serve frontend static files if they exist (for GCR deployment)
frontend_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve index.html for all unrecognized paths to let React Router handle it
        return FileResponse(os.path.join(frontend_dist, "index.html"))
