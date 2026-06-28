import json
import logging
import io
import uuid
import math
import pandas as pd
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.models.candidate import CandidateModel
from app.schemas.candidate import CandidateUploadSchema
from app.services.vector.embeddings import add_candidates_to_vector_db

logger = logging.getLogger(__name__)

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
                    "level": sk.get("proficiency", sk.get("level", "advanced")),
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
    recruiter_response_rate = redrob.get("recruiter_response_rate", 0.8)
    
    overall_score = float(row.get("score") or row.get("overall_score") or 0.0)
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
        "behavioral_score": float(row.get("behavioral_score") or recruiter_response_rate * 100),
        "is_hidden_gem": bool(row.get("is_hidden_gem", False)),
        "status": str(row.get("status") or "new")
    }

async def process_dataset_upload(file: UploadFile, db: Session, user_id: str):
    content = await file.read()
    filename = file.filename.lower()
    
    try:
        # 1. Read file
        if filename.endswith(".jsonl") or filename.endswith(".ndjson"):
            # JSON Lines format: one JSON object per line
            text = content.decode("utf-8")
            records = []
            for line in text.splitlines():
                line = line.strip()
                if line:
                    try:
                        records.append(json.loads(line))
                    except json.JSONDecodeError as e:
                        logger.warning(f"Skipping malformed JSONL line: {e}")
        elif filename.endswith(".json"):
            try:
                # Try raw json loads first to handle nested formats
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
            
        imported = 0
        failed = 0
        duplicates = 0
        
        candidates_to_embed = []
        
        for row in records:
            # Clean and map
            try:
                mapped = map_row_to_candidate_data(row)
                
                # 2. Validate schema using Pydantic
                CandidateUploadSchema(**mapped)
            except Exception as e:
                logger.warning(f"Validation failed for row {row.get('name', 'Unknown')}: {e}")
                failed += 1
                continue
                
            # Check duplicate email
            email = mapped["email"]
            if email:
                existing = db.query(CandidateModel).filter(CandidateModel.email == email).first()
                if existing:
                    duplicates += 1
                    continue
            
            # Check duplicate ID
            id_val = mapped["id"]
            if id_val:
                existing = db.query(CandidateModel).filter(CandidateModel.id == id_val).first()
                if existing:
                    duplicates += 1
                    continue
            
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
                status=mapped["status"]
            )
            db.add(cand)
            imported += 1
            
            # Extract attributes for embedding
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
            
        db.commit()
        
        # 5. Generate embeddings & Store in ChromaDB
        if candidates_to_embed:
            add_candidates_to_vector_db(candidates_to_embed)

        # 6. Build a plain-text preview of the first 5 successfully imported candidates
        preview_lines = []
        preview_count = 0
        for row in records:
            if preview_count >= 5:
                break
            try:
                mapped = map_row_to_candidate_data(row)
                if not mapped.get("full_name"):
                    continue
                skills_str = ", ".join([s["name"] for s in (mapped.get("skills") or [])[:5]]) or "N/A"
                exp_items = mapped.get("experience") or []
                latest_role = exp_items[0]["title"] if exp_items else "N/A"
                score = mapped.get("overall_score", 0)
                line = (
                    f"• {mapped['full_name']} | {latest_role} | "
                    f"Score: {score:.0f} | Skills: {skills_str}"
                )
                preview_lines.append(line)
                preview_count += 1
            except Exception:
                continue

        remaining = max(0, imported - 5)
        if remaining > 0:
            preview_lines.append(f"  … and {remaining} more candidates.")
        preview_text = "\n".join(preview_lines) if preview_lines else "No preview available."

        return {
            "total": len(records),
            "imported": imported,
            "failed": failed,
            "duplicates": duplicates,
            "preview_text": preview_text,
        }

    except Exception as e:
        logger.error(f"Dataset upload failed: {e}")
        db.rollback()
        raise ValueError(f"Failed to process file: {str(e)}")
