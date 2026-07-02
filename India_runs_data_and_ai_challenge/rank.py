import json
import gzip
import csv
import re
import argparse
from datetime import datetime

def parse_date(d_str):
    if not d_str:
        return None
    try:
        return datetime.strptime(d_str, "%Y-%m-%d")
    except:
        return None

def is_honeypot(c):
    skills = c.get("skills", [])
    history = c.get("career_history", [])
    education = c.get("education", [])
    signals = c.get("redrob_signals", {})
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
        
    # If location score is extremely low, candidate is virtually unhirable
    if location_score < 0.2:
        return 0.0

    # --- 3. EXPERIENCE SCORE (0 to 1) ---
    total_exp = profile.get("years_of_experience", 0)
    
    # Target: 5 to 9 years (ideally 6-8)
    if 6.0 <= total_exp <= 8.0:
        exp_score = 1.0
    elif 5.0 <= total_exp < 6.0 or 8.0 < total_exp <= 9.0:
        exp_score = 0.85
    elif 4.0 <= total_exp < 5.0 or 9.0 < total_exp <= 11.0:
        exp_score = 0.5
    else:
        exp_score = 0.1
        
    # AI/ML years of experience
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
            prof_mult = {"expert": 1.5, "advanced": 1.2, "intermediate": 0.8, "beginner": 0.3}[prof]
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
    profile = c["profile"]
    skills = c["skills"]
    signals = c["redrob_signals"]
    
    exp = profile.get("years_of_experience", 0)
    title = profile.get("current_title", "Engineer")
    loc = profile.get("location", "Remote")
    notice = signals.get("notice_period_days", 0)
    willing_relocate = signals.get("willing_to_relocate", False)
    
    core_skills_list = ["llms", "rag", "fine-tuning", "embeddings", "vector search", "recommender systems", "ranking", "pytorch", "transformers", "nlp"]
    cand_skills = [sk["name"] for sk in skills if sk["name"].lower() in core_skills_list]
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
    
    # Vary the phrasing depending on candidate attributes and rank to avoid templates
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

def main():
    parser = argparse.ArgumentParser(description="Rank candidates for Redrob Challenge.")
    parser.add_argument("--candidates", required=True, help="Path to candidates jsonl or jsonl.gz file.")
    parser.add_argument("--out", required=True, help="Path to write the submission CSV.")
    args = parser.parse_args()
    
    candidates = []
    
    # Handle gzipped input file transparently
    if args.candidates.endswith(".gz"):
        with gzip.open(args.candidates, "rt", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    candidates.append(json.loads(line))
    else:
        with open(args.candidates, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    candidates.append(json.loads(line))
                    
    print(f"Loaded {len(candidates)} candidates.")
    
    # Filter and score candidates
    valid_scored = []
    for c in candidates:
        if is_honeypot(c):
            continue
        score = calculate_score(c)
        if score > 0.0:
            valid_scored.append((score, c))
            
    # Sort: score descending, then candidate_id ascending for deterministic tie-breaking
    valid_scored.sort(key=lambda x: (-x[0], x[1]["candidate_id"]))
    
    # Build Top 100
    top_100 = valid_scored[:100]
    
    # Write to CSV
    with open(args.out, "w", encoding="utf-8", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])
        
        for i, (score, c) in enumerate(top_100):
            rank = i + 1
            reasoning = generate_reasoning(c, rank)
            writer.writerow([c["candidate_id"], rank, score, reasoning])
            
    print(f"Successfully wrote top 100 ranked candidates to {args.out}.")

if __name__ == "__main__":
    main()
