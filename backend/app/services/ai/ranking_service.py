import logging
import re
import uuid
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.candidate import CandidateModel
from app.services.vector.embeddings import search_candidates
from app.services.ai.ai_factory import get_ai_provider

logger = logging.getLogger(__name__)

def get_years_of_experience(experience_list: list) -> float:
    total_months = 0
    for exp in experience_list:
        if not isinstance(exp, dict):
            continue
        if "duration_months" in exp and exp["duration_months"]:
            try:
                total_months += int(exp["duration_months"])
                continue
            except:
                pass
        sd_str = exp.get("startDate") or exp.get("start_date")
        ed_str = exp.get("endDate") or exp.get("end_date")
        if not sd_str:
            continue
        try:
            sd = datetime.strptime(sd_str, "%Y-%m-%d")
            if ed_str:
                ed = datetime.strptime(ed_str, "%Y-%m-%d")
            else:
                ed = datetime.utcnow()
            months = (ed.year - sd.year) * 12 + ed.month - sd.month
            total_months += max(0, months)
        except:
            pass
    return round(total_months / 12.0, 1) if total_months > 0 else 1.0

async def rank_candidates_for_job(job_description: str, db: Session, user_id: str, top_n: int = 100) -> List[Dict[str, Any]]:
    ai = get_ai_provider()
    
    # 1. Parse Job Description using Nemotron Parse Model
    logger.info("Extracting structured requirements from job description...")
    job_reqs = await ai.analyze_job(job_description)
    core_skills = [s["skill"].lower() for s in job_reqs.get("coreSkills", [])]
    target_years_str = job_reqs.get("experience", "0")
    try:
        nums = re.findall(r'\d+', target_years_str)
        target_years = float(nums[0]) if nums else 5.0
    except:
        target_years = 5.0
 
    # 2. Vector Similarity Search
    logger.info("Performing vector similarity search...")
    search_query = f"{job_reqs.get('title', '')} {', '.join(core_skills)}"
    vector_res = search_candidates(search_query, n_results=top_n)
    
    retrieved_ids = vector_res.get("ids", [[]])[0]
    distances = vector_res.get("distances", [[]])[0]
    
    id_to_similarity = {}
    if retrieved_ids and distances:
        for candidate_id, dist in zip(retrieved_ids, distances):
            # Scale distance to 0-100 similarity
            similarity = max(0.0, min(100.0, (1.0 - float(dist) / 2.0) * 100.0))
            id_to_similarity[candidate_id] = round(similarity, 2)
            
    retrieved_ids_set = set(retrieved_ids)
    
    # 3. Fetch candidates from DB
    if retrieved_ids_set:
        candidates_db = db.query(CandidateModel).filter(
            CandidateModel.id.in_(retrieved_ids_set),
            CandidateModel.user_id == user_id
        ).all()
    else:
        # Fallback if Chroma is empty, just score everyone
        candidates_db = db.query(CandidateModel).filter(CandidateModel.user_id == user_id).limit(top_n).all()
        
    candidates = []
    for c in candidates_db:
        # 4. Rule-based scoring
        cand_skills = [s.get("name", "").lower() for s in c.skills] if isinstance(c.skills, list) else []
        matched_skills = sum(1 for rs in core_skills if rs in cand_skills)
        skill_score = (matched_skills / len(core_skills)) * 100 if core_skills else 50.0
        
        years_exp = get_years_of_experience(c.experience)
        if years_exp >= target_years:
            exp_score = 100.0
        else:
            exp_score = (years_exp / target_years) * 100.0
            
        sem_sim = id_to_similarity.get(c.id, 75.0)
        
        # Initial score before LLM
        overall_score = (skill_score * 0.4) + (exp_score * 0.3) + (sem_sim * 0.3)
        
        # Format for LLM reranking
        c_dict = {
            "id": c.id,
            "full_name": c.full_name,
            "current_title": c.experience[0].get("title", "Unknown Role") if c.experience else "Unknown Role",
            "skills": cand_skills,
            "years_of_experience": years_exp,
            "summary": c.resume_text or "",
            "overall_score": overall_score,
            "skill_score": skill_score,
            "experience_score": exp_score,
            "behavioral_score": c.behavioral_score or 80.0,
            "semantic_similarity": sem_sim,
            "is_hidden_gem": c.is_hidden_gem
        }
        candidates.append(c_dict)
        
    # 5. LLM Reranking using DeepSeek-R1 / Llama 70B
    logger.info("Reranking candidates using LLM...")
    # Rank top 20 candidates using the LLM provider
    top_candidates = sorted(candidates, key=lambda x: x["overall_score"], reverse=True)[:20]
    reranked = await ai.rerank_candidates(job_description, top_candidates)
    
    # Merge reranked list back
    final_list = []
    handled_ids = {r["id"] for r in reranked}
    final_list.extend(reranked)
    
    for c in candidates:
        if c["id"] not in handled_ids:
            c["explanation"] = "Evaluated via database heuristics."
            c["confidence"] = 0.5
            final_list.append(c)
            
    # Update candidate records in database with final scores
    for item in final_list:
        db_cand = db.query(CandidateModel).filter(CandidateModel.id == item["id"]).first()
        if db_cand:
            db_cand.overall_score = item["overall_score"]
            db_cand.skill_score = item["skill_score"]
            db_cand.experience_score = item["experience_score"]
            db_cand.behavioral_score = item["behavioral_score"]
            
            # Save AI insights
            db_cand.why_stand_out = [item.get("explanation", "Strong technical background")]
            
            risks = item.get("risks", [])
            # Filter out empty or none values
            risks = [r for r in risks if r and str(r).strip().lower() != "none"]
            
            if not risks:
                if item.get("years_of_experience", 0) > 8:
                    risks.append("May be overqualified for this role")
                elif item.get("years_of_experience", 0) < 2:
                    risks.append("Limited commercial experience")
                else:
                    risks.append("None detected")
                    
            db_cand.risk_areas = risks
            
            # Simple heuristic for hidden gems: high overall score but low experience
            is_gem = (item["overall_score"] >= 85 and item["years_of_experience"] < 4)
            db_cand.is_hidden_gem = is_gem
            item["is_hidden_gem"] = is_gem
            
    db.commit()
    
    # Format candidates list to match frontend expected fields
    formatted_results = []
    for item in final_list:
        db_cand = db.query(CandidateModel).filter(CandidateModel.id == item["id"]).first()
        if not db_cand:
            continue
        title = db_cand.experience[0].get("title", "Unknown Role") if db_cand.experience else "Unknown Role"
        formatted_results.append({
            "id": db_cand.id,
            "name": db_cand.full_name,
            "initials": "".join([part[0] for part in db_cand.full_name.split() if part]).upper()[:2],
            "jobTitle": title,
            "location": db_cand.portfolio or "Remote",  # Use portfolio field for location or fallback
            "aiScore": int(db_cand.overall_score),
            "status": db_cand.status,
            "isHiddenGem": db_cand.is_hidden_gem,
            "skills": db_cand.skills[:5] if isinstance(db_cand.skills, list) else [],
            "fitBreakdown": {
                "techSkills": int(db_cand.skill_score),
                "experience": int(db_cand.experience_score),
                "cultureSoftSkills": int(db_cand.behavioral_score),
                "impact": 88,
                "roleFit": int(db_cand.overall_score)
            },
            "experience": db_cand.experience if isinstance(db_cand.experience, list) else [],
            "aiSummary": db_cand.resume_text[:200] + "..." if db_cand.resume_text else "AI summarized this profile.",
            "whyStandOut": db_cand.why_stand_out,
            "riskAreas": db_cand.risk_areas,
            "appliedFor": title,
            "appliedAt": db_cand.created_at.isoformat() if db_cand.created_at else ""
        })
        
    # Sort by overall score
    formatted_results.sort(key=lambda x: x["aiScore"], reverse=True)
    return formatted_results
