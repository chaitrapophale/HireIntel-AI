"""
AI Ranking Service — HireIntel AI

Holistic candidate scoring engine that evaluates:
  1. Semantic Skill Match  (via ChromaDB + SentenceTransformers)
  2. Experience Signal     (years, career trajectory)
  3. Redrob Platform Signals (responsiveness, activity, GitHub score)
  4. Education Pedigree    (tier weighting)
  5. Hidden Gem Detection  (high potential, non-obvious backgrounds)

Returns a normalized score (0–1) plus human-readable reasoning.
"""

from __future__ import annotations
import re
import json
from typing import Any, Optional
from app.services.embeddings import search_candidates


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def _skill_overlap_score(candidate_skills: list[dict], required_skills: list[str]) -> float:
    """
    Calculates how many of the required skills appear in the candidate's profile.
    Gives bonus weight for 'expert' / 'advanced' proficiency.
    """
    if not required_skills:
        return 0.5  # neutral if no requirements

    proficiency_weights = {"beginner": 0.5, "intermediate": 0.75, "advanced": 0.9, "expert": 1.0}
    req_lower = [r.lower().strip() for r in required_skills]

    matched = 0.0
    for skill in candidate_skills:
        name = skill.get("name", "").lower()
        if any(req in name or name in req for req in req_lower):
            weight = proficiency_weights.get(skill.get("proficiency", "intermediate"), 0.75)
            matched += weight

    return _clamp(matched / len(required_skills))


def _experience_score(years: float, target_years: float = 5.0) -> float:
    """
    Non-linear score — peaks around target_years and slightly diminishes for
    very over-qualified candidates, incentivising fresh talent.
    """
    if years <= 0:
        return 0.1
    if years <= target_years:
        return _clamp(years / target_years)
    else:
        # Diminishing returns after target
        return _clamp(1.0 - (years - target_years) * 0.015)


def _redrob_signal_score(signals: dict[str, Any]) -> float:
    """
    Combines platform engagement signals into a single behavioural score.
    """
    weights = {
        "profile_completeness_score":  (0.15, 0, 100),
        "recruiter_response_rate":     (0.20, 0, 1),
        "interview_completion_rate":   (0.20, 0, 1),
        "offer_acceptance_rate":       (0.10, 0, 1),
        "github_activity_score":       (0.15, 0, 100),
        "saved_by_recruiters_30d":     (0.10, 0, 30),   # normalised against 30
        "connection_count":            (0.10, 0, 500),
    }

    total = 0.0
    for key, (w, lo, hi) in weights.items():
        raw = signals.get(key, lo)
        if raw is None or raw < 0:
            raw = lo
        normalized = _clamp((raw - lo) / (hi - lo) if hi != lo else 0)
        total += w * normalized

    return _clamp(total)


def _education_tier_score(education: list[dict]) -> float:
    tier_map = {"tier_1": 1.0, "tier_2": 0.75, "tier_3": 0.55, "tier_4": 0.40, "unknown": 0.35}
    if not education:
        return 0.4
    best = max(tier_map.get(e.get("tier", "unknown"), 0.35) for e in education)
    return best


def _hidden_gem_check(
    skill_score: float,
    redrob_score: float,
    years: float,
    signals: dict[str, Any],
    education: list[dict],
) -> bool:
    """
    Hidden gem: high potential candidate who would likely be filtered out by
    naive keyword matching but shows genuine promise.
    """
    has_tier1 = any(e.get("tier") == "tier_1" for e in education)
    high_github = signals.get("github_activity_score", -1) >= 70
    active_and_responsive = (
        signals.get("recruiter_response_rate", 0) >= 0.65
        and signals.get("interview_completion_rate", 0) >= 0.7
    )
    non_obvious_title = years < 5  # junior who punches above their weight

    return (
        not has_tier1
        and skill_score >= 0.6
        and redrob_score >= 0.6
        and (high_github or active_and_responsive or non_obvious_title)
    )


# ---------------------------------------------------------------------------
# Core ranking function
# ---------------------------------------------------------------------------

def score_candidate(
    candidate: dict[str, Any],
    required_skills: list[str],
    target_years: float = 5.0,
    weights: Optional[dict[str, float]] = None,
) -> dict[str, Any]:
    """
    Produces a holistic fit score and breakdown for a single candidate.

    Returns
    -------
    {
        "candidate_id": str,
        "score": float,           # 0–1 composite
        "skill_score": float,
        "experience_score": float,
        "redrob_score": float,
        "education_score": float,
        "is_hidden_gem": bool,
        "reasoning": str,
    }
    """
    if weights is None:
        weights = {
            "skill":      0.40,
            "experience": 0.25,
            "redrob":     0.25,
            "education":  0.10,
        }

    profile   = candidate.get("profile", {})
    skills    = candidate.get("skills", [])
    education = candidate.get("education", [])
    signals   = candidate.get("redrob_signals", {})
    years     = float(profile.get("years_of_experience", 0))

    skill_score   = _skill_overlap_score(skills, required_skills)
    exp_score     = _experience_score(years, target_years)
    redrob_score  = _redrob_signal_score(signals)
    edu_score     = _education_tier_score(education)

    composite = (
        weights["skill"]      * skill_score
        + weights["experience"] * exp_score
        + weights["redrob"]     * redrob_score
        + weights["education"]  * edu_score
    )
    composite = _clamp(composite)

    is_gem = _hidden_gem_check(skill_score, redrob_score, years, signals, education)

    # Human-readable one-line reasoning (matches submission format)
    title = profile.get("current_title", "Unknown role")
    yrs_fmt = f"{years:.1f}"
    matched_skills = sum(
        1 for s in skills
        if any(r.lower() in s.get("name", "").lower() for r in required_skills)
    )
    resp_rate = signals.get("recruiter_response_rate", 0)
    reasoning = (
        f"{title} with {yrs_fmt} yrs; "
        f"{matched_skills} core skills matched; "
        f"response rate {resp_rate:.2f}."
    )
    if is_gem:
        reasoning += " ⭐ Hidden Gem flagged."

    return {
        "candidate_id":    candidate.get("candidate_id", ""),
        "score":           round(composite, 4),
        "skill_score":     round(skill_score, 4),
        "experience_score": round(exp_score, 4),
        "redrob_score":    round(redrob_score, 4),
        "education_score": round(edu_score, 4),
        "is_hidden_gem":   is_gem,
        "reasoning":       reasoning,
    }


def rank_candidates(
    candidates: list[dict[str, Any]],
    required_skills: list[str],
    target_years: float = 5.0,
    top_n: int = 100,
) -> list[dict[str, Any]]:
    """
    Rank a list of raw candidate dicts, returning the top N results sorted by score.
    """
    scored = [score_candidate(c, required_skills, target_years) for c in candidates]
    scored.sort(key=lambda x: x["score"], reverse=True)

    # Assign ranks
    for i, item in enumerate(scored[:top_n], start=1):
        item["rank"] = i

    return scored[:top_n]


async def semantic_search_and_rank(
    job_description: str,
    required_skills: list[str],
    all_candidates_from_db: list[dict[str, Any]],
    top_n: int = 100,
) -> list[dict[str, Any]]:
    """
    Two-stage ranking pipeline:
      Stage 1 — Semantic retrieval via ChromaDB (fast, broad recall)
      Stage 2 — Holistic scoring on the semantic matches

    Falls back to scoring all_candidates_from_db if vector store is empty.
    """
    # Stage 1: semantic retrieval — get top 500 semantically similar candidates
    try:
        results = search_candidates(job_description, n_results=min(500, len(all_candidates_from_db)))
        retrieved_ids = set(results.get("ids", [[]])[0])

        # Filter our in-memory candidates to only those retrieved
        semantic_pool = [c for c in all_candidates_from_db if c.get("candidate_id") in retrieved_ids]
        if not semantic_pool:
            semantic_pool = all_candidates_from_db
    except Exception:
        # If Chroma not yet seeded, fall back to full set
        semantic_pool = all_candidates_from_db

    # Stage 2: holistic scoring
    return rank_candidates(semantic_pool, required_skills, top_n=top_n)
