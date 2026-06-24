import json
import os
import sys

# Add the backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, Base, SessionLocal
from app.models.candidate import CandidateModel
from app.services.embeddings import add_candidates_to_vector_db

DATASET_PATH = r"C:\Jayani all files\Projects Jayani\[PUB] India_runs_data_and_ai_challenge\[PUB] India_runs_data_and_ai_challenge\India_runs_data_and_ai_challenge\sample_candidates.json"

def seed_database():
    print("Creating SQLite tables...")
    Base.metadata.create_all(bind=engine)
    
    print(f"Reading dataset from {DATASET_PATH}...")
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    candidates_list = data if isinstance(data, list) else data.get("candidates", [])
    if not candidates_list:
        print("No candidates found in the JSON file.")
        return

    print(f"Found {len(candidates_list)} candidates. Seeding SQLite...")
    
    db = SessionLocal()
    for c in candidates_list:
        # Check if exists
        existing = db.query(CandidateModel).filter(CandidateModel.id == c["candidate_id"]).first()
        if not existing:
            profile = c.get("profile", {})
            db_candidate = CandidateModel(
                id=c["candidate_id"],
                name=profile.get("anonymized_name", "Unknown"),
                headline=profile.get("headline", ""),
                summary=profile.get("summary", ""),
                location=profile.get("location", ""),
                country=profile.get("country", ""),
                years_of_experience=profile.get("years_of_experience", 0.0),
                current_title=profile.get("current_title", ""),
                current_company=profile.get("current_company", ""),
                career_history=c.get("career_history", []),
                education=c.get("education", []),
                skills=c.get("skills", []),
                certifications=c.get("certifications", []),
                languages=c.get("languages", []),
                redrob_signals=c.get("redrob_signals", {}),
                github_score=c.get("redrob_signals", {}).get("github_activity_score", -1),
                profile_completeness=c.get("redrob_signals", {}).get("profile_completeness_score", 0),
            )
            db.add(db_candidate)
    
    db.commit()
    db.close()
    print("SQLite seed complete.")

    print("Seeding ChromaDB (Vector Store)...")
    add_candidates_to_vector_db(candidates_list)
    print("ChromaDB seed complete. We are now ready for Semantic Search!")

if __name__ == "__main__":
    seed_database()
