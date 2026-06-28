from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.models.candidate import CandidateModel
from app.models.job import JobModel
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    active_jobs = db.query(func.count(JobModel.id)).filter(JobModel.status == "open").scalar() or 0
    total_candidates = db.query(func.count(CandidateModel.id)).scalar() or 0
    hidden_gems = db.query(func.count(CandidateModel.id)).filter(CandidateModel.is_hidden_gem == True).scalar() or 0
    
    # Mocking some values for now to preserve UI structure
    return {
        "activeRequisitions": active_jobs,
        "topCandidatesSourced": total_candidates,
        "timeToHire": 18,
        "interviewsScheduled": 24,
        "hiddenGems": hidden_gems
    }
