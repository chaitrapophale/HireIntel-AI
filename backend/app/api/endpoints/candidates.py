from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.core.database import get_db
from app.models.candidate import CandidateModel
from app.schemas.schemas import CandidateResponse
from app.services.ai_ranking import rank_candidates, semantic_search_and_rank

router = APIRouter()

@router.get("/", response_model=List[CandidateResponse])
def get_candidates(db: Session = Depends(get_db)):
    db_candidates = db.query(CandidateModel).all()
    # Format to match schema
    result = []
    for c in db_candidates:
        result.append({
            "candidate_id": c.id,
            "profile": {
                "anonymized_name": c.name,
                "headline": c.headline or "",
                "summary": c.summary or "",
                "location": c.location or "",
                "country": c.country or "",
                "years_of_experience": c.years_of_experience or 0.0,
                "current_title": c.current_title or "",
                "current_company": c.current_company or ""
            },
            "career_history": c.career_history or [],
            "education": c.education or [],
            "skills": c.skills or [],
            "redrob_signals": c.redrob_signals or {},
            "github_score": c.github_score or 0.0,
            "profile_completeness": c.profile_completeness or 0.0,
            "is_hidden_gem": c.is_hidden_gem or False
        })
    return result

@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    c = db.query(CandidateModel).filter(CandidateModel.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return {
        "candidate_id": c.id,
        "profile": {
            "anonymized_name": c.name,
            "headline": c.headline or "",
            "summary": c.summary or "",
            "location": c.location or "",
            "country": c.country or "",
            "years_of_experience": c.years_of_experience or 0.0,
            "current_title": c.current_title or "",
            "current_company": c.current_company or ""
        },
        "career_history": c.career_history or [],
        "education": c.education or [],
        "skills": c.skills or [],
        "redrob_signals": c.redrob_signals or {},
        "github_score": c.github_score or 0.0,
        "profile_completeness": c.profile_completeness or 0.0,
        "is_hidden_gem": c.is_hidden_gem or False
    }

@router.post("/rank")
async def rank_all_candidates(request: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Given a job description and required skills, return ranked candidates.
    """
    job_description = request.get("job_description", "")
    required_skills = request.get("required_skills", [])
    
    # Get all from DB
    candidates = get_candidates(db)
    
    # Rank them
    ranked = await semantic_search_and_rank(job_description, required_skills, candidates)
    return ranked

@router.post("/upload")
def upload_resume(request: Dict[str, Any], db: Session = Depends(get_db)):
    """
    Simulate uploading a resume text, parsing it via LLM, and storing the candidate.
    """
    resume_text = request.get("resume_text", "")
    if not resume_text:
        raise HTTPException(status_code=400, detail="No resume text provided")
        
    api_key = os.getenv("OPENAI_API_KEY")
    import uuid
    import json
    from langchain_openai import ChatOpenAI
    from langchain.prompts import PromptTemplate
    from langchain_core.output_parsers import JsonOutputParser
    
    cand_id = f"CAND_{str(uuid.uuid4())[:8]}"
    
    # Fallback mock parsing
    if not api_key:
        parsed_data = {
            "name": "Alex Applicant",
            "headline": "Experienced Software Engineer",
            "summary": "Full stack engineer with a passion for AI.",
            "location": "San Francisco",
            "country": "USA",
            "years_of_experience": 4.5,
            "current_title": "Software Engineer",
            "current_company": "TechCorp",
            "skills": [{"name": "Python", "proficiency": "advanced"}],
            "experience": [{"title": "Software Engineer", "company": "TechCorp"}],
            "education": [{"degree": "BS CS", "tier": "tier_1"}]
        }
    else:
        try:
            llm = ChatOpenAI(temperature=0, model="gpt-4o-mini", api_key=api_key)
            parser = JsonOutputParser()
            prompt = PromptTemplate(
                template="Extract candidate details from the following resume. Return ONLY JSON matching this schema: {{\"name\":\"str\", \"headline\":\"str\", \"summary\":\"str\", \"location\":\"str\", \"country\":\"str\", \"years_of_experience\":\"float\", \"current_title\":\"str\", \"current_company\":\"str\", \"skills\":[{{\"name\":\"str\", \"proficiency\":\"beginner|intermediate|advanced|expert\"}}], \"experience\":[{{\"title\":\"str\", \"company\":\"str\", \"years\":\"float\"}}], \"education\":[{{\"degree\":\"str\", \"tier\":\"tier_1|tier_2|tier_3|unknown\"}}]}}.\n\nResume:\n{resume}\n",
                input_variables=["resume"]
            )
            chain = prompt | llm | parser
            parsed_data = chain.invoke({"resume": resume_text})
        except Exception as e:
            print("Error parsing resume:", e)
            raise HTTPException(status_code=500, detail="Failed to parse resume")
            
    # Save to SQLite
    db_cand = CandidateModel(
        id=cand_id,
        name=parsed_data.get("name", "Unknown"),
        headline=parsed_data.get("headline", ""),
        summary=parsed_data.get("summary", ""),
        location=parsed_data.get("location", ""),
        country=parsed_data.get("country", ""),
        years_of_experience=parsed_data.get("years_of_experience", 0.0),
        current_title=parsed_data.get("current_title", ""),
        current_company=parsed_data.get("current_company", ""),
        career_history=parsed_data.get("experience", []),
        education=parsed_data.get("education", []),
        skills=parsed_data.get("skills", []),
        redrob_signals={"profile_completeness_score": 85},
        github_score=75.0,
        profile_completeness=85.0,
        is_hidden_gem=False
    )
    db.add(db_cand)
    db.commit()
    db.refresh(db_cand)
    
    # Add to ChromaDB
    try:
        from app.services.embeddings import add_candidates_to_vector_db
        add_candidates_to_vector_db([{
            "candidate_id": cand_id,
            "profile": {
                "current_title": db_cand.current_title,
                "summary": db_cand.summary,
                "years_of_experience": db_cand.years_of_experience,
                "location": db_cand.location
            },
            "skills": db_cand.skills
        }])
    except Exception as e:
        print("Vector DB error:", e)
        
    return {"message": "Candidate parsed and stored successfully", "candidate_id": cand_id}
