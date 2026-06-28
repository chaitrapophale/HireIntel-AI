from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Union

class CandidateUploadSchema(BaseModel):
    # Identity
    id: Optional[str] = None
    full_name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: Optional[str] = None
    # Profile content
    skills: Optional[Union[str, List[Any]]] = None
    experience: Optional[Union[str, List[Any]]] = None
    education: Optional[Union[str, List[Any]]] = None
    projects: Optional[Union[str, List[Any]]] = None
    resume_text: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
    # AI scores — validated as non-negative floats
    overall_score: float = Field(default=0.0, ge=0.0)
    skill_score: float = Field(default=0.0, ge=0.0)
    experience_score: float = Field(default=0.0, ge=0.0)
    behavioral_score: float = Field(default=0.0, ge=0.0)
    # Flags
    is_hidden_gem: bool = False
    status: str = "new"
