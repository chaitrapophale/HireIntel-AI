from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class JobResponse(BaseModel):
    id: str
    title: str
    department: str
    location: str
    description: str
    core_skills: List[str] = []
    soft_skills: List[str] = []
    status: str

class ProfileBase(BaseModel):
    anonymized_name: str
    headline: str
    summary: str
    location: str
    country: str
    years_of_experience: float
    current_title: str
    current_company: str

class CandidateResponse(BaseModel):
    candidate_id: str
    profile: ProfileBase
    career_history: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    skills: List[Dict[str, Any]] = []
    redrob_signals: Dict[str, Any] = {}
    
    # Internal calculated scores
    github_score: float = -1.0
    profile_completeness: float = 0.0
    is_hidden_gem: bool = False
