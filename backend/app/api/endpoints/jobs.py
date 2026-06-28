"""
Jobs API Endpoints — HireIntel AI
Fixes applied:
  - Pydantic models extracted to schemas.py
  - Create job endpoint added
  - Pagination support
  - Input length validation
  - Structured logging
  - Rate limiting on AI endpoint
  - Retry logic on OpenAI
"""
from __future__ import annotations

import logging
import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from sqlalchemy import select
import openai
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser

from app.core.database import get_db
from app.core.firebase import get_current_user
from app.models.job import JobModel
from app.schemas.schemas import JobResponse, AnalyzeJobRequest, JobExtraction, CreateJobRequest

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# ---------------------------------------------------------------------------
# Module-level LLM client
# ---------------------------------------------------------------------------
def _make_llm():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or api_key == "your_openai_api_key_here":
        return None
    return ChatOpenAI(temperature=0, model="gpt-4o-mini", api_key=api_key)


_llm = None


def get_llm():
    global _llm
    if _llm is None:
        _llm = _make_llm()
    return _llm


@retry(
    retry=retry_if_exception_type((openai.RateLimitError, openai.APIStatusError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(3),
)
async def _invoke_with_retry(chain, inputs: dict):
    return await chain.ainvoke(inputs)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _serialize_job(j: JobModel) -> dict:
    return {
        "id": j.id,
        "title": j.title,
        "department": j.department or "",
        "location": j.location or "",
        "description": j.description or "",
        "core_skills": j.core_skills or [],
        "soft_skills": j.soft_skills or [],
        "status": j.status or "open",
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[JobResponse])
def get_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """List jobs with pagination."""
    query = select(JobModel).where(JobModel.user_id == user_id)
    offset = (page - 1) * page_size
    jobs = db.execute(query.offset(offset).limit(page_size)).scalars().all()
    return [_serialize_job(j) for j in jobs]


@router.get("/{job_id}", response_model=JobResponse)
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


@router.post("/", response_model=JobResponse, status_code=201)
def create_job(
    body: CreateJobRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Create and persist a new job requisition."""
    job_id = f"JOB_{str(uuid.uuid4())[:8]}"
    new_job = JobModel(
        id=job_id,
        user_id=user_id,
        title=body.title,
        department=body.department,
        location=body.location,
        description=body.description,
        core_skills=[s.model_dump() for s in body.core_skills],
        soft_skills=body.soft_skills,
        status="open",
    )
    db.add(new_job)
    db.commit()
    db.refresh(new_job)
    logger.info("Job %s created by user %s", job_id, user_id)
    return _serialize_job(new_job)


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
    j.status = status  # type: ignore[assignment]
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
    """Extract structured data from a raw job description using AI."""
    llm = get_llm()

    if not llm:
        logger.warning("OpenAI key not set — returning mock extraction")
        return {
            "title": "Extracted Job Title",
            "department": "Engineering",
            "coreSkills": [
                {"skill": "React", "level": "expert"},
                {"skill": "TypeScript", "level": "advanced"},
            ],
            "softSkills": ["Communication", "Leadership"],
            "experience": "5+ years",
            "location": "Remote",
        }

    try:
        parser = PydanticOutputParser(pydantic_object=JobExtraction)
        prompt = PromptTemplate(
            template=(
                "Extract the following information from the job description.\n\n"
                "{format_instructions}\n\nJob Description:\n{jd}\n"
            ),
            input_variables=["jd"],
            partial_variables={"format_instructions": parser.get_format_instructions()},
        )
        chain = prompt | llm | parser
        res: JobExtraction = await _invoke_with_retry(chain, {"jd": body.description})
        logger.info("Job description analyzed for user %s", user_id)
        return res.model_dump()
    except Exception as e:
        logger.exception("Job analysis failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Failed to extract job details. Please try again.")
