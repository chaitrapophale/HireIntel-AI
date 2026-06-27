from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.firebase import get_current_user
from app.models.job import JobModel
from app.services.ai.ai_factory import get_ai_provider
from app.schemas.schemas import JobResponse

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
def get_jobs(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    jobs = db.query(JobModel).filter(JobModel.user_id == user_id).all()
    result = []
    for j in jobs:
        result.append({
            "id": j.id,
            "title": j.title,
            "department": j.department or "",
            "location": j.location or "",
            "locationType": "remote", 
            "status": j.status or "open",
            "openedAt": "2024-01-01T00:00:00Z",
            "candidateCount": 12,
            "topMatchScore": 95,
            "pipelineStats": {
                "sourced": 120,
                "screened": 45,
                "interviewing": 12,
                "offered": 2
            },
            "description": j.description or "",
            "core_skills": j.core_skills or [],
            "soft_skills": j.soft_skills or []
        })
    return result

class AnalyzeRequest(BaseModel):
    description: str

class JobCreate(BaseModel):
    title: str
    department: Optional[str] = ""
    location: Optional[str] = ""
    description: Optional[str] = ""
    core_skills: Optional[List[str]] = []
    soft_skills: Optional[List[str]] = []

@router.post("/")
def create_job(job_in: JobCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    job = JobModel(
        user_id=user_id,
        title=job_in.title,
        department=job_in.department,
        location=job_in.location,
        description=job_in.description,
        core_skills=job_in.core_skills,
        soft_skills=job_in.soft_skills,
        status="open"
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return {
        "id": job.id,
        "title": job.title,
        "department": job.department,
        "location": job.location,
        "status": job.status,
        "core_skills": job.core_skills,
        "soft_skills": job.soft_skills,
        "description": job.description
    }

@router.post("/analyze")
async def analyze_job_description(request: AnalyzeRequest, user_id: str = Depends(get_current_user)):
    """
    Extract structured data from a raw job description using AI.
    """
    ai = get_ai_provider()
    try:
        res = await ai.analyze_job(request.description)
        return res
    except Exception as e:
        print("Error in AI extraction:", e)
        raise HTTPException(status_code=500, detail="Failed to extract job details")

@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    job = db.query(JobModel).filter(JobModel.id == job_id, JobModel.user_id == user_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found")
    db.delete(job)
    db.commit()
    return {"message": "Job requisition deleted successfully", "id": job_id}
