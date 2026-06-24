from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import os
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

from app.core.database import get_db
from app.models.job import JobModel
from app.schemas.schemas import JobResponse

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
def get_jobs(db: Session = Depends(get_db)):
    jobs = db.query(JobModel).all()
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
def analyze_job_description(request: AnalyzeRequest):
    """
    Extract structured data from a raw job description.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    
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
        parser = JsonOutputParser()
        prompt = PromptTemplate(
            template="Extract the following information from the job description and return ONLY a valid JSON object matching this schema: {{\"title\": \"str\", \"department\": \"str\", \"coreSkills\": [{{\"skill\": \"str\", \"level\": \"expert|advanced|intermediate\"}}], \"softSkills\": [\"str\"], \"experience\": \"str\", \"location\": \"str\"}}.\n\nJob Description:\n{jd}\n",
            input_variables=["jd"]
        )
        chain = prompt | llm | parser
        res = chain.invoke({"jd": request.description})
        return res
    except Exception as e:
        print("Error in AI extraction:", e)
        raise HTTPException(status_code=500, detail="Failed to extract job details")
