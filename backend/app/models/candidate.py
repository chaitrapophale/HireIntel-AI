from sqlalchemy import Column, String, Float, Boolean, JSON, DateTime, func
from app.core.database import Base
import uuid

class CandidateModel(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    education = Column(JSON, default=list)
    experience = Column(JSON, default=list)
    skills = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    
    resume_text = Column(String, nullable=True)
    github = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    portfolio = Column(String, nullable=True)
    
    embedding_id = Column(String, nullable=True, index=True)
    
    # AI Scores
    overall_score = Column(Float, default=0.0)
    skill_score = Column(Float, default=0.0)
    experience_score = Column(Float, default=0.0)
    education_score = Column(Float, default=0.0)
    behavioral_score = Column(Float, default=0.0)
    
    # AI Insights
    why_stand_out = Column(JSON, default=list)
    risk_areas = Column(JSON, default=list)
    
    is_hidden_gem = Column(Boolean, default=False)
    status = Column(String, default="new") # new, screening, interviewing, offered, hired, rejected
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

