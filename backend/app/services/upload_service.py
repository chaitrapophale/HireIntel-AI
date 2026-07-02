import json
import logging
import io
import uuid
import math
import pandas as pd
from datetime import datetime
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.models.candidate import CandidateModel
from app.schemas.candidate import CandidateUploadSchema
from app.services.vector.embeddings import add_candidates_to_vector_db

logger = logging.getLogger(__name__)

# --- HACKATHON RANKING LOGIC ---

def is_honeypot(c):
    skills = c.get("skills", [])
    history = c.get("career_history", [])
    education = c.get("education", [])
    profile = c.get("profile", {})
    
    # 1. Expert/advanced skill with 0 duration
    for sk in skills:
        if sk.get("duration_months") == 0 and sk.get("proficiency") in ["expert", "advanced"]:
            return True
            
    # 2. Education anomalies
    for edu in education:
        degree = edu.get("degree", "").lower()
        field = edu.get("field_of_study", "").lower()
        if "ph.d" in degree and "mba" in field:
            return True
        if "b.e" in degree and "history" in field:
            return True
        if "b.tech" in degree and "fine arts" in field:
            return True
            
        # Grad year vs experience anomaly
        ey = edu.get("end_year")
        total_exp = profile.get("years_of_experience", 0)
        if ey and total_exp > (2026 - ey) + 3:
            return True
            
    # 3. Title vs description mismatches
    for exp in history:
        title = exp.get("title", "").lower()
        desc = exp.get("description", "").lower()
        
        if "qa" in desc or "test automation" in desc or "test engineering" in desc:
            if "mobile" in title or "backend" in title or "full-stack" in title or "data" in title:
                if "entirely in qa" in desc or "entirely in test" in desc or "entirely in automation" in desc:
                    return True
                    
        if "frontend" in desc or "react" in desc:
            if "devops" in title or "cloud" in title or "infrastructure" in title:
                if "limited backend" in desc or "limited to frontend" in desc or "strong on the frontend" in desc:
                    return True
                    
        if "devops" in desc or "kubernetes" in desc or "terraform" in desc or "aws" in desc:
            if "dotnet" in title or "python" in title or "java" in title:
                if "haven't done much application" in desc or "ops side" in desc:
                    return True
                    
    return False

def calculate_score(c):
    profile = c.get("profile", {})
    history = c.get("career_history", [])
    skills = c.get("skills", [])
    signals = c.get("redrob_signals", {})
    
    # --- 1. TITLE SCORE (0 to 1) ---
    curr_title = profile.get("current_title", "").lower()
    headline = profile.get("headline", "").lower()
    
    is_eng = any(w in curr_title or w in headline for w in ["engineer", "developer", "scientist", "programmer", "architect", "lead", "cto"])
    is_aiml = any(w in curr_title or w in headline for w in ["ai", "ml", "machine learning", "data scientist", "data science", "nlp", "vision", "deep learning", "applied scientist"])
    
    is_trap = any(w in curr_title or w in headline for w in ["marketing", "recruiter", "sales", "accountant", "writer", "copywriter", "civil", "mechanical", "graphic", "designer", "operations manager", "project manager"])
    
    if is_trap and not is_aiml:
        return 0.0
        
    title_score = 0.0
    if is_aiml:
        title_score = 1.0
    elif is_eng:
        title_score = 0.7
    else:
        title_score = 0.2
        
    # --- 2. LOCATION SCORE (0 to 1) ---
    loc = profile.get("location", "").lower()
    country = profile.get("country", "").lower()
    willing_relocate = signals.get("willing_to_relocate", False)
    
    is_in_target = "noida" in loc or "pune" in loc or "delhi" in loc or "ncr" in loc or "gurgaon" in loc
    tier1_cities = ["bangalore", "bengaluru", "mumbai", "hyderabad", "chennai", "kolkata", "ahmedabad"]
    is_in_tier1 = any(c in loc for c in tier1_cities)
    
    location_score = 0.0
    if is_in_target:
        location_score = 1.0
    elif is_in_tier1 and country == "india":
        if willing_relocate:
            location_score = 0.95
        else:
            location_score = 0.2
    elif country == "india" and willing_relocate:
        location_score = 0.8
    elif willing_relocate:
        location_score = 0.4
    else:
        location_score = 0.0
        
    if location_score < 0.2:
        return 0.0

    # --- 3. EXPERIENCE SCORE (0 to 1) ---
    total_exp = profile.get("years_of_experience", 0)
    
    if 6.0 <= total_exp <= 8.0:
        exp_score = 1.0
    elif 5.0 <= total_exp < 6.0 or 8.0 < total_exp <= 9.0:
        exp_score = 0.85
    elif 4.0 <= total_exp < 5.0 or 9.0 < total_exp <= 11.0:
        exp_score = 0.5
    else:
        exp_score = 0.1
        
    aiml_exp_years = 0.0
    for exp in history:
        t = exp.get("title", "").lower()
        d = exp.get("description", "").lower()
        job_is_aiml = any(w in t for w in ["ai", "ml", "machine learning", "nlp", "vision", "deep learning", "data scientist", "research scientist", "applied scientist"])
        job_is_aiml = job_is_aiml or any(w in d for w in ["llm", "rag", "embeddings", "vector search", "pytorch", "transformers", "recommender", "ranking", "fine-tuning"])
        if job_is_aiml:
            dur = exp.get("duration_months", 0)
            aiml_exp_years += dur / 12.0
            
    if aiml_exp_years >= 4.0:
        aiml_exp_score = 1.0
    elif 2.0 <= aiml_exp_years < 4.0:
        aiml_exp_score = 0.7
    elif 0.5 <= aiml_exp_years < 2.0:
        aiml_exp_score = 0.3
    else:
        aiml_exp_score = 0.0
        
    combined_exp_score = 0.4 * exp_score + 0.6 * aiml_exp_score
    
    # --- 4. SKILLS SCORE (0 to 1) ---
    core_skills = {
        "llms": 3.0, "large language models": 3.0, "rag": 3.0, "retrieval-augmented generation": 3.0,
        "fine-tuning": 3.0, "embeddings": 3.0, "vector search": 3.0, "vector database": 3.0,
        "recommender systems": 3.0, "recommendation engine": 3.0, "ranking": 3.0, "information retrieval": 3.0,
        "pytorch": 2.0, "transformers": 2.0, "nlp": 2.0, "deep learning": 2.0, "neural networks": 2.0,
        "python": 1.0, "machine learning": 1.0, "data science": 1.0, "data scientist": 1.0
    }
    
    matched_skills_val = 0.0
    for sk in skills:
        sk_name = sk.get("name", "").lower()
        if sk_name in core_skills:
            prof = sk.get("proficiency", "beginner")
            prof_mult = {"expert": 1.5, "advanced": 1.2, "intermediate": 0.8, "beginner": 0.3}.get(prof, 0.5)
            matched_skills_val += core_skills[sk_name] * prof_mult
            
    skills_score = min(1.0, matched_skills_val / 15.0)
    
    # --- 5. BEHAVIORAL MULTIPLIER (0 to 1) ---
    open_to_work = signals.get("open_to_work_flag", False)
    open_mult = 1.0 if open_to_work else 0.85
    
    resp_rate = signals.get("recruiter_response_rate", 0.0)
    if resp_rate >= 0.7:
        resp_mult = 1.0
    elif resp_rate >= 0.4:
        resp_mult = 0.85
    elif resp_rate >= 0.15:
        resp_mult = 0.6
    else:
        resp_mult = 0.25
        
    act_date = signals.get("last_active_date", "")
    if act_date.startswith("2026"):
        active_mult = 1.0
    elif act_date.startswith("2025"):
        active_mult = 0.85
    else:
        active_mult = 0.1
        
    notice = signals.get("notice_period_days", 90)
    if notice <= 30:
        notice_mult = 1.0
    elif notice <= 60:
        notice_mult = 0.9
    elif notice <= 90:
        notice_mult = 0.7
    else:
        notice_mult = 0.35
        
    gh_score = signals.get("github_activity_score", -1)
    gh_mult = 1.05 if gh_score > 50 else 1.0
    
    behavior_mult = open_mult * resp_mult * active_mult * notice_mult * gh_mult
    
    final_score = (0.25 * title_score + 0.15 * location_score + 0.25 * combined_exp_score + 0.35 * skills_score) * behavior_mult
    return round(final_score, 4)

def generate_reasoning(c, rank):
    profile = c.get("profile", {})
    skills = c.get("skills", [])
    signals = c.get("redrob_signals", {})
    
    exp = profile.get("years_of_experience", 0)
    title = profile.get("current_title", "Engineer")
    loc = profile.get("location", "Remote")
    notice = signals.get("notice_period_days", 0)
    willing_relocate = signals.get("willing_to_relocate", False)
    
    core_skills_list = ["llms", "rag", "fine-tuning", "embeddings", "vector search", "recommender systems", "ranking", "pytorch", "transformers", "nlp"]
    cand_skills = [sk.get("name") for sk in skills if sk.get("name", "").lower() in core_skills_list]
    skills_str = ", ".join(cand_skills[:3]) if cand_skills else "applied ML"
    
    if "noida" in loc.lower() or "pune" in loc.lower():
        loc_text = f"based in {loc}"
    elif willing_relocate:
        loc_text = f"willing to relocate from {loc}"
    else:
        loc_text = f"located in {loc}"
        
    resp_rate = int(signals.get("recruiter_response_rate", 0) * 100)
    gh_score = signals.get("github_activity_score", -1)
    
    gh_text = f"strong GitHub activity ({gh_score})" if gh_score > 50 else ""
    
    if rank <= 10:
        reason = f"Top match with {exp} years experience as a {title} with deep expertise in {skills_str}. {loc_text.capitalize()} with an excellent {resp_rate}% response rate."
        if gh_text:
            reason += f" Demonstrates {gh_text}."
        if notice > 60:
            reason += f" Note: notice period is {notice} days."
    elif rank <= 30:
        reason = f"Highly qualified {title} offering {exp} years of background, focusing on {skills_str}. {loc_text.capitalize()}; response rate is {resp_rate}%."
        if gh_text:
            reason += f" Active developer profile ({gh_text})."
        if notice > 60:
            reason += f" Notice period: {notice} days."
    elif rank <= 60:
        reason = f"Solid fit with {exp} years as {title}, showing competent skills in {skills_str}. {loc_text.capitalize()} with {resp_rate}% recruiter response rate."
        if notice > 60:
            reason += f" Notice period: {notice} days."
    else:
        reason = f"Capable technical profile: {exp} years of work experience as {title}. Proficient in {skills_str} and {loc_text}."
        if notice > 60:
            reason += f" Notice period of {notice} days."
            
    return reason


def clean_nan(val):
    if pd.isna(val) or val is None:
        return None
    return val

def clean_recursive(v):
    if isinstance(v, float) and math.isnan(v):
        return None
    if isinstance(v, list):
        return [clean_recursive(item) for item in v]
    if isinstance(v, dict):
        return {k: clean_recursive(val) for k, val in v.items()}
    return v


_VALID_SKILL_LEVELS = {"expert", "advanced", "intermediate"}

def _normalise_skill_level(level: str) -> str:
    """Map any incoming skill level string to one of expert|advanced|intermediate."""
    lvl = (level or "").lower().strip()
    if lvl in _VALID_SKILL_LEVELS:
        return lvl
    if lvl in ("senior", "proficient", "high"):
        return "expert"
    if lvl in ("mid", "medium", "moderate"):
        return "advanced"
    return "intermediate"


def map_row_to_candidate_data(row: dict) -> dict:
    row = {k: clean_recursive(v) for k, v in row.items()}
    profile = row.get("profile") or {}
    
    # Map name
    full_name = ""
    if "full_name" in row and row["full_name"]:
        full_name = str(row["full_name"]).strip()
    elif "name" in row and row["name"]:
        full_name = str(row["name"]).strip()
    elif isinstance(profile, dict) and profile.get("anonymized_name"):
        full_name = str(profile.get("anonymized_name")).strip()
    elif isinstance(profile, dict) and profile.get("name"):
        full_name = str(profile.get("name")).strip()
        
    email = clean_nan(row.get("email"))
    if not email and isinstance(profile, dict):
        email = clean_nan(profile.get("email"))
        
    phone = clean_nan(row.get("phone"))
    if not phone and isinstance(profile, dict):
        phone = clean_nan(profile.get("phone"))
        
    github = clean_nan(row.get("github"))
    if not github and isinstance(profile, dict):
        github = clean_nan(profile.get("github"))
        
    linkedin = clean_nan(row.get("linkedin"))
    if not linkedin and isinstance(profile, dict):
        linkedin = clean_nan(profile.get("linkedin"))
        
    portfolio = clean_nan(row.get("portfolio"))
    if not portfolio and isinstance(profile, dict):
        portfolio = clean_nan(profile.get("portfolio"))

    resume_text = clean_nan(row.get("resume_text"))
    if not resume_text and isinstance(profile, dict):
        resume_text = clean_nan(profile.get("summary"))

    # Parse skills
    skills_raw = row.get("skills")
    skills = []
    if isinstance(skills_raw, list):
        for sk in skills_raw:
            if isinstance(sk, dict):
                skills.append({
                    "name": sk.get("name", ""),
                    "level": _normalise_skill_level(sk.get("proficiency", sk.get("level", "intermediate"))),
                    "verified": sk.get("verified", True)
                })
            elif isinstance(sk, str):
                skills.append({
                    "name": sk,
                    "level": "advanced",
                    "verified": False
                })
    elif isinstance(skills_raw, str) and skills_raw:
        skills = [{"name": s.strip(), "level": "advanced", "verified": False} for s in skills_raw.split(",")]

    # Parse experience
    exp_raw = row.get("career_history") or row.get("experience")
    experience = []
    if isinstance(exp_raw, list):
        for ex in exp_raw:
            if isinstance(ex, dict):
                experience.append({
                    "id": ex.get("id") or str(uuid.uuid4()),
                    "title": ex.get("title", "Unknown Role"),
                    "company": ex.get("company", "Unknown Company"),
                    "startDate": ex.get("start_date") or ex.get("startDate") or "N/A",
                    "endDate": ex.get("end_date") or ex.get("endDate") or None,
                    "description": ex.get("description", "")
                })
    elif isinstance(exp_raw, str) and exp_raw:
        experience.append({
            "id": str(uuid.uuid4()),
            "title": "Professional Experience",
            "company": "Company",
            "startDate": "N/A",
            "endDate": None,
            "description": exp_raw
        })

    # Parse education
    edu_raw = row.get("education")
    education = []
    if isinstance(edu_raw, list):
        for ed in edu_raw:
            if isinstance(ed, dict):
                education.append({
                    "degree": ed.get("degree", "B.S."),
                    "school": ed.get("institution") or ed.get("school", "Unknown University"),
                    "field_of_study": ed.get("field_of_study", ""),
                    "tier": ed.get("tier", "unknown")
                })
    elif isinstance(edu_raw, str) and edu_raw:
        education.append({
            "degree": edu_raw,
            "school": "Unknown University",
            "field_of_study": "",
            "tier": "unknown"
        })

    # Parse projects
    proj_raw = row.get("projects")
    projects = []
    if isinstance(proj_raw, list):
        for pr in proj_raw:
            if isinstance(pr, dict):
                projects.append({
                    "name": pr.get("name", ""),
                    "description": pr.get("description", "")
                })
            elif isinstance(pr, str):
                projects.append({
                    "name": pr,
                    "description": ""
                })
    elif isinstance(proj_raw, str) and proj_raw:
        projects = [{"name": p.strip(), "description": ""} for p in proj_raw.split(",")]

    candidate_id = row.get("candidate_id") or row.get("id") or str(uuid.uuid4())
    
    redrob = row.get("redrob_signals") or {}
    github_score = redrob.get("github_activity_score", 0.0)
    profile_completeness = redrob.get("profile_completeness_score", 80.0)
    # Calculate hackathon score directly from row
    hackathon_score = calculate_score(row)
    # Generate reasoning (use rank 100 as placeholder, actual rank computed during export)
    reasoning = generate_reasoning(row, 100)
    
    overall_score = float(row.get("score") or row.get("overall_score") or hackathon_score * 100)
    # If the score is computed by the heuristic, map it 0-100 scale for consistency in the UI
    if "score" not in row and "overall_score" not in row:
        overall_score = hackathon_score * 100

    skill_score = float(row.get("skill_score") or 0.0)
    experience_score = float(row.get("experience_score") or 0.0)
    
    return {
        "id": candidate_id,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "skills": skills,
        "experience": experience,
        "education": education,
        "projects": projects,
        "resume_text": resume_text,
        "github": github,
        "linkedin": linkedin,
        "portfolio": portfolio,
        "overall_score": overall_score,
        "skill_score": skill_score,
        "experience_score": experience_score,
        "behavioral_score": float(row.get("behavioral_score") or redrob.get("recruiter_response_rate", 0.8) * 100),
        "is_hidden_gem": bool(row.get("is_hidden_gem", False)),
        "status": str(row.get("status") or "new"),
        "_hackathon_raw_score": hackathon_score, # Passed temporarily to filter
        "_hackathon_reasoning": reasoning
    }

async def process_dataset_upload(file: UploadFile, db: Session, user_id: str):
    filename = file.filename.lower()
    
    imported = 0
    failed = 0
    duplicates = 0
    total = 0
    
    candidates_to_embed = []
    preview_lines = []
    
    try:
        def process_row(row):
            nonlocal imported, failed, duplicates, total
            total += 1
            if is_honeypot(row):
                failed += 1
                return
            
            try:
                mapped = map_row_to_candidate_data(row)
                
                if mapped.get("_hackathon_raw_score", 1.0) == 0.0:
                    failed += 1
                    return
                
                validation_mapped = {k: v for k, v in mapped.items() if not k.startswith("_")}
                CandidateUploadSchema(**validation_mapped)
                
                email = mapped.get("email")
                if email and db.query(CandidateModel).filter(CandidateModel.email == email).first():
                    duplicates += 1
                    return
                    
                id_val = mapped.get("id")
                if id_val and db.query(CandidateModel).filter(CandidateModel.id == id_val).first():
                    duplicates += 1
                    return
                
                reasoning_str = mapped.get("_hackathon_reasoning", "")
                
                cand = CandidateModel(
                    id=mapped["id"],
                    user_id=user_id,
                    full_name=mapped["full_name"],
                    email=mapped["email"],
                    phone=mapped["phone"],
                    skills=mapped["skills"],
                    experience=mapped["experience"],
                    education=mapped["education"],
                    projects=mapped["projects"],
                    resume_text=mapped["resume_text"],
                    github=mapped["github"],
                    linkedin=mapped["linkedin"],
                    portfolio=mapped["portfolio"],
                    overall_score=mapped["overall_score"],
                    skill_score=mapped["skill_score"],
                    experience_score=mapped["experience_score"],
                    behavioral_score=mapped["behavioral_score"],
                    is_hidden_gem=mapped["is_hidden_gem"],
                    status=mapped["status"],
                    why_stand_out=[reasoning_str] if reasoning_str else []
                )
                db.add(cand)
                imported += 1
                
                profile = row.get("profile") or {}
                current_title = profile.get("current_title")
                if not current_title and mapped["experience"]:
                    current_title = mapped["experience"][0]["title"]
                years_of_experience = profile.get("years_of_experience")
                if years_of_experience is None:
                    years_of_experience = 0.0
                location = profile.get("location") or clean_nan(row.get("location")) or "Remote"
                summary = profile.get("summary") or mapped["resume_text"] or ""
                
                candidates_to_embed.append({
                    "id": cand.id,
                    "current_title": current_title or "Unknown Title",
                    "summary": summary,
                    "skills": mapped["skills"],
                    "experience": mapped["experience"],
                    "years_of_experience": float(years_of_experience),
                    "location": location
                })
                
                if len(preview_lines) < 5 and mapped.get("full_name"):
                    skills_str = ", ".join([s["name"] for s in (mapped.get("skills") or [])[:5]]) or "N/A"
                    exp_items = mapped.get("experience") or []
                    latest_role = exp_items[0]["title"] if exp_items else "N/A"
                    score = mapped.get("overall_score", 0)
                    line = f"• {mapped['full_name']} | {latest_role} | Score: {score:.0f} | Skills: {skills_str}"
                    preview_lines.append(line)
                    
                if imported % 500 == 0:
                    db.commit()
                    if candidates_to_embed:
                        add_candidates_to_vector_db(candidates_to_embed)
                        candidates_to_embed.clear()
            except Exception as e:
                logger.warning(f"Validation failed for row {row.get('name', 'Unknown')}: {e}")
                failed += 1

        if filename.endswith(".jsonl") or filename.endswith(".ndjson"):
            for line in file.file:
                line = line.strip()
                if line:
                    try:
                        row = json.loads(line.decode("utf-8"))
                        process_row(row)
                    except Exception as e:
                        logger.warning(f"Skipping malformed JSONL line: {e}")
                        failed += 1
        else:
            content = await file.read()
            if filename.endswith(".json"):
                try:
                    raw_data = json.loads(content.decode("utf-8"))
                    if isinstance(raw_data, list):
                        records = raw_data
                    elif isinstance(raw_data, dict) and "candidates" in raw_data:
                        records = raw_data["candidates"]
                    else:
                        records = [raw_data]
                except Exception:
                    df = pd.read_json(io.BytesIO(content))
                    records = df.to_dict(orient="records")
            elif filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(content))
                records = df.to_dict(orient="records")
            elif filename.endswith(".xlsx") or filename.endswith(".xls"):
                df = pd.read_excel(io.BytesIO(content))
                records = df.to_dict(orient="records")
            else:
                raise ValueError(f"Unsupported file format. Supported: .jsonl, .json, .csv, .xlsx, .xls. File: {filename}")
                
            for row in records:
                process_row(row)
                
        db.commit()
        if candidates_to_embed:
            add_candidates_to_vector_db(candidates_to_embed)

        remaining = max(0, imported - 5)
        if remaining > 0:
            preview_lines.append(f"  … and {remaining} more candidates.")
        preview_text = "\n".join(preview_lines) if preview_lines else "No preview available."

        return {
            "total": total,
            "imported": imported,
            "failed": failed,
            "duplicates": duplicates,
            "preview_text": preview_text,
        }

    except Exception as e:
        logger.error(f"Dataset upload failed: {e}")
        db.rollback()
        raise ValueError(f"Failed to process file: {str(e)}")
