"""
Central Pydantic schema definitions for HireIntel AI.
All request/response models live here — never inside route handlers.
"""
from __future__ import annotations

from typing import List, Any, Dict
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Shared primitives
# ---------------------------------------------------------------------------

class SkillSchema(BaseModel):
    name: str
    proficiency: str = "intermediate"


class ExperienceSchema(BaseModel):
    title: str
    company: str
    years: float = 0.0


class EducationSchema(BaseModel):
    degree: str
    tier: str = "unknown"


# ---------------------------------------------------------------------------
# Candidate
# ---------------------------------------------------------------------------

class CandidateExtraction(BaseModel):
    """Output schema for LLM resume parsing."""
    name: str
    headline: str = ""
    summary: str = ""
    location: str = ""
    country: str = ""
    years_of_experience: float = Field(default=0.0, ge=0, le=80)
    current_title: str = ""
    current_company: str = ""
    skills: List[SkillSchema] = Field(default_factory=list)
    experience: List[ExperienceSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)


class ProfileBase(BaseModel):
    anonymized_name: str
    headline: str = ""
    summary: str = ""
    location: str = ""
    country: str = ""
    years_of_experience: float = 0.0
    current_title: str = ""
    current_company: str = ""


class CandidateResponse(BaseModel):
    candidate_id: str
    profile: ProfileBase
    career_history: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    skills: List[Dict[str, Any]] = []
    redrob_signals: Dict[str, Any] = {}
    github_score: float = 0.0
    profile_completeness: float = 0.0
    is_hidden_gem: bool = False


class UploadResumeRequest(BaseModel):
    resume_text: str = Field(..., min_length=10, max_length=50_000)


class CandidatePaginatedResponse(BaseModel):
    items: List[CandidateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class RankRequest(BaseModel):
    job_description: str = Field(..., min_length=10, max_length=20_000)
    required_skills: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Job
# ---------------------------------------------------------------------------

class SkillExtraction(BaseModel):
    skill: str
    level: str = "intermediate"


class JobExtraction(BaseModel):
    """Output schema for LLM job description parsing."""
    title: str
    department: str = ""
    coreSkills: List[SkillExtraction] = Field(default_factory=list)
    softSkills: List[str] = Field(default_factory=list)
    experience: str = ""
    location: str = ""


class JobResponse(BaseModel):
    id: str
    title: str
    department: str = ""
    location: str = ""
    description: str = ""
    core_skills: List[Any] = []
    soft_skills: List[Any] = []
    status: str = "open"


class CreateJobRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    department: str = ""
    location: str = ""
    description: str = ""
    core_skills: List[SkillExtraction] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)


class AnalyzeJobRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=20_000)


class UpdateCandidateStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(new|screening|interviewing|offered|hired|rejected)$")


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------

class RankingWeightsRequest(BaseModel):
    skill_weight: float = Field(default=0.40, ge=0.0, le=1.0)
    experience_weight: float = Field(default=0.25, ge=0.0, le=1.0)
    redrob_weight: float = Field(default=0.25, ge=0.0, le=1.0)
    education_weight: float = Field(default=0.10, ge=0.0, le=1.0)
