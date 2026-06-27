from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict, Union

class CandidateUploadSchema(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: Optional[Union[str, List[Any]]] = None
    experience: Optional[Union[str, List[Any]]] = None
    education: Optional[Union[str, List[Any]]] = None
    projects: Optional[Union[str, List[Any]]] = None
    resume_text: Optional[str] = None
    github: Optional[str] = None
    linkedin: Optional[str] = None
    portfolio: Optional[str] = None
