from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import os
import httpx
import urllib.parse
import time
import uuid

from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.firebase import get_current_user
from app.models.candidate import CandidateModel
from app.services.ai.ranking_service import rank_candidates_for_job
from app.services.upload_service import process_dataset_upload
from app.services.vector.embeddings import delete_candidate_from_vector_db

router = APIRouter()

class RankRequest(BaseModel):
    job_description: str
    top_n: int = 100

@router.get("/")
def get_candidates(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    cands = db.query(CandidateModel).filter(CandidateModel.user_id == user_id).all()
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
            "initials": "".join([part[0] for part in c.full_name.split() if part]).upper()[:2],
            "jobTitle": title,
            "location": "Remote", 
            "aiScore": int(c.overall_score),
            "status": c.status,
            "isHiddenGem": c.is_hidden_gem,
            "skills": c.skills if isinstance(c.skills, list) else [],
            "fitBreakdown": {
                "techSkills": int(c.skill_score),
                "experience": int(c.experience_score),
                "cultureSoftSkills": int(c.behavioral_score),
                "impact": 88,
                "roleFit": int(c.overall_score)
            },
            "experience": c.experience if isinstance(c.experience, list) else [],
            "aiSummary": c.resume_text[:200] + "..." if c.resume_text else "AI summarized this profile.",
            "whyStandOut": c.why_stand_out if c.why_stand_out else ["Strong technical background"],
            "riskAreas": c.risk_areas if c.risk_areas else ["None detected"],
            "appliedFor": title,
            "appliedAt": c.created_at.isoformat() if c.created_at else ""
        })
    return res

@router.post("/rank")
async def rank_candidates(req: RankRequest, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    try:
        results = await rank_candidates_for_job(req.job_description, db, user_id=user_id, top_n=req.top_n)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ranking failed: {str(e)}")

@router.post("/upload-dataset")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    try:
        summary = await process_dataset_upload(file, db, user_id=user_id)
        return summary
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    c = db.query(CandidateModel).filter(CandidateModel.id == candidate_id, CandidateModel.user_id == user_id).first()
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
        "initials": "".join([part[0] for part in c.full_name.split() if part]).upper()[:2],
        "jobTitle": title,
        "location": "Remote", 
        "aiScore": int(c.overall_score),
        "status": c.status,
        "isHiddenGem": c.is_hidden_gem,
        "skills": c.skills if isinstance(c.skills, list) else [],
        "fitBreakdown": {
            "techSkills": int(c.skill_score),
            "experience": int(c.experience_score),
            "cultureSoftSkills": int(c.behavioral_score),
            "impact": 88,
            "roleFit": int(c.overall_score)
        },
        "experience": c.experience if isinstance(c.experience, list) else [],
        "aiSummary": c.resume_text if c.resume_text else "No resume summary available.",
        "whyStandOut": c.why_stand_out if c.why_stand_out else ["Strong technical background"],
        "riskAreas": c.risk_areas if c.risk_areas else ["None detected"],
        "appliedFor": title,
        "appliedAt": c.created_at.isoformat() if c.created_at else ""
    }

@router.post("/upload_proxy")
async def upload_proxy(
    file: UploadFile = File(...),
    folder: str = Form(...),
    id_token: str = Form(...)
):
    """
    Proxy upload to Firebase Storage REST API to bypass CORS.
    The ID token is passed directly in the form data from the frontend.
    """
    bucket = os.getenv("FIREBASE_STORAGE_BUCKET")
    if not bucket:
        project_id = os.getenv("FIREBASE_PROJECT_ID", "hireintel-ai-aa784")
        bucket = f"{project_id}.firebasestorage.app"
        
    timestamp = int(time.time() * 1000)
    safe_name = "".join(c if c.isalnum() or c in ".-_" else "_" for c in file.filename)
    
    path = f"{folder}/proxy_user/{timestamp}_{safe_name}"
    
    encoded_path = urllib.parse.quote(path, safe='')
    url = f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o?name={encoded_path}"
    
    headers = {
        "Authorization": f"Bearer {id_token}",
        "Content-Type": file.content_type
    }
    
    file_bytes = await file.read()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, headers=headers, content=file_bytes)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Firebase Storage upload failed: {resp.text}")
            
        data = resp.json()
        
        download_token = data.get("downloadTokens", "")
        download_url = f"https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media&token={download_token}"
        
        return {
            "downloadUrl": download_url,
            "path": path,
            "metadata": data
        }

@router.delete("/{candidate_id}")
def delete_candidate(candidate_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    c = db.query(CandidateModel).filter(CandidateModel.id == candidate_id, CandidateModel.user_id == user_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    try:
        delete_candidate_from_vector_db(candidate_id)
    except Exception:
        pass  # Don't fail if vector entry doesn't exist
    db.delete(c)
    db.commit()
    return {"message": "Candidate deleted successfully", "id": candidate_id}
