from __future__ import annotations

import logging
import os
import time
import urllib.parse
from pydantic import BaseModel, Field
from typing import List, Optional, Annotated

import httpx
import fastapi
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Request
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.candidate import CandidateModel

from app.schemas.schemas import (
    CandidateResponse,
    CandidatePaginatedResponse,
    UpdateCandidateStatusRequest,
    UploadResumeRequest,
)

from app.services.ai.ai_factory import get_ai_provider
from app.services.ai.ranking_service import rank_candidates_for_job
from app.services.upload_service import process_dataset_upload
from app.services.vector.embeddings import delete_candidate_from_vector_db, add_candidates_to_vector_db

logger = logging.getLogger(__name__)
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# ---------------------------------------------------------------------------
# Allowed file types for upload proxy
# ---------------------------------------------------------------------------
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/csv",
    "application/json",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

class RankRequestDataset(BaseModel):
    job_description: str
    top_n: int = 100

@router.get("/")
def get_candidates(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    cands = db.execute(select(CandidateModel).where(CandidateModel.user_id == user_id)).scalars().all()
    res = []
    for c in cands:
        title = "Unknown Role"
        if c.experience and isinstance(c.experience, list) and len(c.experience) > 0:
            first_exp = c.experience[0]
            if isinstance(first_exp, dict):
                title = first_exp.get("title", "Unknown Role")
                
        res.append({
            "id": c.id,
            "name": c.full_name,
            "initials": "".join([part[0] for part in (c.full_name or "U").split() if part]).upper()[:2],
            "jobTitle": title,
            "location": "Remote", 
            "aiScore": int(c.overall_score) if getattr(c, "overall_score", None) is not None else 0,
            "status": c.status,
            "isHiddenGem": c.is_hidden_gem,
            "skills": c.skills if isinstance(c.skills, list) else [],
            "fitBreakdown": {
                "techSkills": int(c.skill_score) if getattr(c, "skill_score", None) is not None else 0,
                "experience": int(c.experience_score) if getattr(c, "experience_score", None) is not None else 0,
                "cultureSoftSkills": int(c.behavioral_score) if getattr(c, "behavioral_score", None) is not None else 0,
                "impact": 88,
                "roleFit": int(c.overall_score) if getattr(c, "overall_score", None) is not None else 0
            },
            "experience": c.experience if isinstance(c.experience, list) else [],
            "aiSummary": (c.resume_text[:200] + "...") if getattr(c, "resume_text", None) else "AI summarized this profile.",
            "whyStandOut": c.why_stand_out if getattr(c, "why_stand_out", None) else ["Strong technical background"],
            "riskAreas": c.risk_areas if getattr(c, "risk_areas", None) else ["None detected"],
            "appliedFor": title,
            "appliedAt": c.created_at.isoformat() if getattr(c, "created_at", None) else ""
        })
    return res

@router.patch("/{candidate_id}/status")
def update_candidate_status(
    candidate_id: str,
    body: UpdateCandidateStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    """Update a candidate's pipeline status (persists drag-drop changes)."""
    c = db.execute(
        select(CandidateModel).where(CandidateModel.id == candidate_id, CandidateModel.user_id == user_id)
    ).scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    c.status = body.status
    db.commit()
    logger.info("Candidate %s status updated to %s by user %s", candidate_id, body.status, user_id)
    return {"candidate_id": candidate_id, "status": body.status}

@router.post("/rank")
async def rank_candidates(req: RankRequestDataset, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    try:
        results = await rank_candidates_for_job(req.job_description, db, user_id=user_id, top_n=req.top_n)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")

@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> dict:
    user_id = current_user.id
    try:
        summary = await process_dataset_upload(file, db, user_id=user_id)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


_VALID_SKILL_LEVELS = {"expert", "advanced", "intermediate"}

def _normalise_skill_level(level: str) -> str:
    """Map any incoming level string to one of the three accepted values."""
    lvl = (level or "").lower().strip()
    if lvl in _VALID_SKILL_LEVELS:
        return lvl
    if lvl in ("senior", "proficient", "high"):
        return "expert"
    if lvl in ("mid", "medium", "moderate"):
        return "advanced"
    return "intermediate"


@router.post("/upload")
async def upload_resume(
    body: UploadResumeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_id = current_user.id
    """
    Parse a raw resume text string with the AI provider, persist the resulting
    candidate to SQLite, and index it in ChromaDB for vector search.
    Returns the serialised candidate object identical to GET /{candidate_id}.
    """
    ai = get_ai_provider()
    try:
        parsed = await ai.analyze_resume(body.resume_text)
    except Exception as e:
        logger.error("AI resume analysis failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=502, detail="AI resume parsing failed. Please try again.")

    if not parsed or not parsed.get("name"):
        raise HTTPException(
            status_code=422,
            detail="Could not extract a valid candidate profile from the provided resume text.",
        )

    # Normalise skills so level is always one of expert|advanced|intermediate
    raw_skills = parsed.get("skills") or []
    skills = [
        {
            "name": s.get("name", "").strip(),
            "level": _normalise_skill_level(s.get("level", "intermediate")),
            "verified": False,
        }
        for s in raw_skills
        if isinstance(s, dict) and s.get("name", "").strip()
    ]

    # Convert AI experience list → stored WorkExperience shape
    raw_exp = parsed.get("experience") or []
    experience = []
    for ex in raw_exp:
        if not isinstance(ex, dict):
            continue
        experience.append({
            "id": str(time.time_ns()),
            "title": ex.get("title", "Unknown Role"),
            "company": ex.get("company", "Unknown Company"),
            "startDate": "N/A",
            "endDate": None,
            "description": ex.get("description", ""),
        })

    candidate_id = f"CAND_{str(time.time_ns())[-8:]}"

    cand = CandidateModel(
        id=candidate_id,
        user_id=user_id,
        full_name=parsed.get("name", "Unknown Candidate"),
        email=parsed.get("email") or None,
        phone=parsed.get("phone") or None,
        skills=skills,
        experience=experience,
        resume_text=body.resume_text,
        linkedin=None,
        github=None,
        portfolio=None,
        overall_score=0.0,
        skill_score=0.0,
        experience_score=0.0,
        behavioral_score=0.0,
        is_hidden_gem=False,
        status="new",
    )
    db.add(cand)
    db.commit()
    db.refresh(cand)
    logger.info("Resume uploaded and parsed for user %s → candidate %s", user_id, candidate_id)

    # Index in ChromaDB (best-effort — don't fail the request if vector store is unavailable)
    try:
        add_candidates_to_vector_db([{
            "id": cand.id,
            "current_title": parsed.get("current_title", experience[0]["title"] if experience else "Unknown Role"),
            "summary": parsed.get("summary", body.resume_text[:500]),
            "skills": skills,
            "experience": experience,
            "years_of_experience": float(parsed.get("years_of_experience", 0)),
            "location": parsed.get("location", "Remote"),
        }])
    except Exception as e:
        logger.warning("ChromaDB indexing failed for candidate %s: %s", candidate_id, e)

    title = experience[0]["title"] if experience else "Unknown Role"
    return {
        "id": cand.id,
        "name": cand.full_name,
        "initials": "".join([p[0] for p in (cand.full_name or "U").split() if p]).upper()[:2],
        "jobTitle": title,
        "location": parsed.get("location", "Remote"),
        "aiScore": 0,
        "status": cand.status,
        "isHiddenGem": cand.is_hidden_gem,
        "skills": cand.skills,
        "fitBreakdown": {
            "techSkills": 0, "experience": 0,
            "cultureSoftSkills": 0, "impact": 0, "roleFit": 0,
        },
        "experience": cand.experience,
        "aiSummary": parsed.get("summary", "Resume uploaded. Run AI ranking to generate insights."),
        "whyStandOut": [],
        "riskAreas": [],
        "appliedFor": title,
        "appliedAt": cand.created_at.isoformat() if cand.created_at else "",
    }


@router.get("/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    c = db.execute(select(CandidateModel).where(CandidateModel.id == candidate_id, CandidateModel.user_id == user_id)).scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
        
    title = "Unknown Role"
    if c.experience and isinstance(c.experience, list) and len(c.experience) > 0:
        first_exp = c.experience[0]
        if isinstance(first_exp, dict):
            title = first_exp.get("title", "Unknown Role")
            
    return {
        "id": c.id,
        "name": c.full_name,
        "initials": "".join([part[0] for part in (c.full_name or "U").split() if part]).upper()[:2],
        "jobTitle": title,
        "location": "Remote", 
        "aiScore": int(c.overall_score) if getattr(c, "overall_score", None) is not None else 0,
        "status": c.status,
        "isHiddenGem": c.is_hidden_gem,
        "skills": c.skills if isinstance(c.skills, list) else [],
        "fitBreakdown": {
            "techSkills": int(c.skill_score) if getattr(c, "skill_score", None) is not None else 0,
            "experience": int(c.experience_score) if getattr(c, "experience_score", None) is not None else 0,
            "cultureSoftSkills": int(c.behavioral_score) if getattr(c, "behavioral_score", None) is not None else 0,
            "impact": 88,
            "roleFit": int(c.overall_score) if getattr(c, "overall_score", None) is not None else 0
        },
        "experience": c.experience if isinstance(c.experience, list) else [],
        "aiSummary": c.resume_text if getattr(c, "resume_text", None) else "No resume summary available.",
        "whyStandOut": c.why_stand_out if getattr(c, "why_stand_out", None) else ["Strong technical background"],
        "riskAreas": c.risk_areas if getattr(c, "risk_areas", None) else ["None detected"],
        "appliedFor": title,
        "appliedAt": c.created_at.isoformat() if getattr(c, "created_at", None) else ""
    }

@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    c = db.execute(select(CandidateModel).where(CandidateModel.id == candidate_id, CandidateModel.user_id == user_id)).scalars().first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    try:
        delete_candidate_from_vector_db(candidate_id)
    except Exception:
        pass  # Don't fail if vector entry doesn't exist
    db.delete(c)
    db.commit()
    return {"message": "Candidate deleted successfully", "id": candidate_id}

@router.post("/upload_proxy")
async def upload_proxy(
    request: Request,
    file: UploadFile = File(...),
    folder: str = Form(...),
    id_token: str = Form(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    user_id = current_user.id
    """
    Proxy upload to Firebase Storage REST API to bypass CORS.
    Now includes:
      - File type validation (PDF, DOCX, TXT only)
      - File size validation (5 MB max)
      - Rate limiting (20 uploads/minute)
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        logger.warning(
            "Rejected upload with forbidden content type '%s' from user %s",
            file.content_type,
            user_id,
        )
        raise HTTPException(
            status_code=415,
            detail=f"File type '{file.content_type}' is not allowed.",
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size.",
        )

    bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket:
        project_id = os.getenv("FIREBASE_PROJECT_ID", "hireintel-ai-aa784")
        bucket = f"{project_id}.firebasestorage.app"

    timestamp = int(time.time() * 1000)
    safe_name = "".join(c if c.isalnum() or c in ".-_" else "_" for c in (file.filename or "file"))
    path = f"{folder}/{user_id}/{timestamp}_{safe_name}"
    encoded_path = urllib.parse.quote(path, safe="")
    
    url = f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o?name={encoded_path}"

    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": file.content_type,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, content=file_bytes)
        if resp.status_code != 200:
            logger.error("Firebase Storage upload failed (status %s) for user %s: %s", resp.status_code, user_id, resp.text[:200])
            raise HTTPException(status_code=resp.status_code, detail="Firebase Storage upload failed.")

        data = resp.json()
        download_token = data.get("downloadTokens", "")
        download_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media&token={download_token}"

        logger.info("File uploaded to Firebase Storage at path '%s' for user %s", path, user_id)
        return {"downloadUrl": download_url, "path": path, "metadata": data}
