from __future__ import annotations

import logging
import os
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.firebase import get_current_user
from app.models.job import JobModel
from app.services.ai.ai_factory import get_ai_provider

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class JobCreate(BaseModel):
    title: str
    department: Optional[str] = ""
    location: Optional[str] = ""
    description: Optional[str] = ""
    core_skills: Optional[List[str]] = []
    soft_skills: Optional[List[str]] = []

class AnalyzeJobRequest(BaseModel):
    description: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _serialize_job(j: JobModel) -> dict:
    return {
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
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/")
def get_jobs(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    jobs = db.execute(select(JobModel).where(JobModel.user_id == user_id)).scalars().all()
    return [_serialize_job(j) for j in jobs]


@router.get("/{job_id}")
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Get a single job by ID."""
    j = db.execute(
        select(JobModel).where(JobModel.id == job_id, JobModel.user_id == user_id)
    ).scalars().first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_job(j)


@router.post("/")
def create_job(
    job_in: JobCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    job_id = f"JOB_{str(uuid.uuid4())[:8]}"
    job = JobModel(
        id=job_id,
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
    logger.info("Job %s created by user %s", job_id, user_id)
    return _serialize_job(job)


@router.patch("/{job_id}/status")
def update_job_status(
    job_id: str,
    status: str = Query(..., pattern="^(open|on_hold|closed|draft)$"),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Update job status (open/on_hold/closed/draft)."""
    j = db.execute(
        select(JobModel).where(JobModel.id == job_id, JobModel.user_id == user_id)
    ).scalars().first()
    if not j:
        raise HTTPException(status_code=404, detail="Job not found")
    j.status = status
    db.commit()
    logger.info("Job %s status updated to %s by user %s", job_id, status, user_id)
    return {"id": job_id, "status": status}


@router.post("/analyze")
@limiter.limit("10/minute")
async def analyze_job_description(
    request: Request,
    body: AnalyzeJobRequest,
    user_id: str = Depends(get_current_user),
):
    """
    Extract structured data from a raw job description using AI.
    """
    ai = get_ai_provider()
    try:
        res = await ai.analyze_job(body.description)
        logger.info("Job description analyzed for user %s", user_id)
        return res
    except Exception as e:
        logger.exception("Error in AI extraction: %s", e)
        raise HTTPException(status_code=500, detail="Failed to extract job details")


@router.delete("/{job_id}")
def delete_job(
    job_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    job = db.execute(
        select(JobModel).where(JobModel.id == job_id, JobModel.user_id == user_id)
    ).scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job requisition not found")
    db.delete(job)
    db.commit()
    return {"message": "Job requisition deleted successfully", "id": job_id}
