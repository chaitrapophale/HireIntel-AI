from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import api_router
from app.core.database import engine, Base
from app.models.job import JobModel
from app.models.candidate import CandidateModel

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HireIntel AI API",
    description="Backend services for semantic candidate ranking and job matching.",
    version="1.0.0",
)

# Allow CORS for the frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "HireIntel AI Backend is running."}
