from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel, Field
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser, PydanticOutputParser

from app.core.database import get_db
from app.core.firebase import get_current_user
from app.models.job import JobModel
from app.schemas.schemas import JobResponse

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
def get_jobs(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    jobs = db.query(JobModel).filter(JobModel.user_id == user_id).all()
    result = []
    for j in jobs:
        result.append({
            "id": j.id,
            "title": j.title,
            "department": j.department or "",
            "location": j.location or "",
            "description": j.description or "",
            "core_skills": j.core_skills or [],
            "soft_skills": j.soft_skills or [],
            "status": j.status or "open"
        })
    return result

class AnalyzeRequest(BaseModel):
    description: str

@router.post("/analyze")
async def analyze_job_description(request: AnalyzeRequest, user_id: str = Depends(get_current_user)):
    """
    Extract structured data from a raw job description.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
    class SkillExt(BaseModel):
        skill: str
        level: str
    class JobExtraction(BaseModel):
        title: str
        department: str
        coreSkills: List[SkillExt] = Field(default_factory=list)
        softSkills: List[str] = Field(default_factory=list)
        experience: str
        location: str

    # Fallback/mock if no API key is provided
    if not api_key:
        return {
            "title": "Extracted Job Title",
            "department": "Engineering",
            "coreSkills": [
                {"skill": "React", "level": "expert"},
                {"skill": "TypeScript", "level": "advanced"}
            ],
            "softSkills": ["Communication", "Leadership"],
            "experience": "5+ years",
            "location": "Remote"
        }
        
    try:
        llm = ChatOpenAI(temperature=0, model="gpt-4o-mini", api_key=api_key)
        parser = PydanticOutputParser(pydantic_object=JobExtraction)
        prompt = PromptTemplate(
            template="Extract the following information from the job description.\n\n{format_instructions}\n\nJob Description:\n{jd}\n",
            input_variables=["jd"],
            partial_variables={"format_instructions": parser.get_format_instructions()}
        )
        chain = prompt | llm | parser
        res = await chain.ainvoke({"jd": request.description})
        return res.model_dump()
    except Exception as e:
        print("Error in AI extraction:", e)
        raise HTTPException(status_code=500, detail="Failed to extract job details")
