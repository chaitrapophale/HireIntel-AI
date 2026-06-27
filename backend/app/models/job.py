from sqlalchemy import Column, String, JSON
from app.core.database import Base
import uuid

class JobModel(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=True)
    title = Column(String, nullable=False)
    department = Column(String)
    location = Column(String)
    description = Column(String)
    
    # AI extracted criteria
    core_skills = Column(JSON)
    soft_skills = Column(JSON)
    status = Column(String, default="open") # open, draft, closed
