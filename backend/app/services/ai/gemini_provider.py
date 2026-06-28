import json
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("google-generativeai not installed. Gemini provider will not work.")

from app.services.ai.provider import AIProvider


class GeminiProvider(AIProvider):
    """
    AI provider backed by Google Gemini (gemini-2.5-flash).
    Falls back to mock responses if API key is missing or calls fail.
    """

    MODEL_NAME = "gemini-2.5-flash"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key
        if GEMINI_AVAILABLE and api_key:
            genai.configure(api_key=api_key)
            self._model = genai.GenerativeModel(self.MODEL_NAME)
        else:
            self._model = None
            if not api_key:
                logger.warning("GEMINI_API_KEY not set. Using mock fallback responses.")

    # ──────────────────────────────────────────────
    # Internal helpers
    # ──────────────────────────────────────────────

    def _extract_json(self, text: str) -> Any:
        if not text:
            return None

        # Strip thinking / preamble
        text = text.strip()
        if "```json" in text:
            try:
                part = text.split("```json")[1].split("```")[0].strip()
                return json.loads(part)
            except Exception:
                pass
        if "```" in text:
            try:
                part = text.split("```")[1].strip()
                return json.loads(part)
            except Exception:
                pass

        # Direct parse
        try:
            return json.loads(text)
        except Exception:
            pass

        # Brace / bracket search
        first_brace = text.find("{")
        first_bracket = text.find("[")
        start = -1
        end_char = ""
        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            start, end_char = first_brace, "}"
        elif first_bracket != -1:
            start, end_char = first_bracket, "]"
        if start != -1:
            last = text.rfind(end_char)
            if last > start:
                try:
                    return json.loads(text[start : last + 1])
                except Exception as e:
                    logger.error(f"JSON extraction fallback failed: {e}")

        logger.error(f"Could not extract JSON from Gemini response: {text[:200]}")
        return None

    async def _generate(self, prompt: str) -> str:
        """Send a prompt to Gemini and return raw text."""
        if self._model is None:
            raise RuntimeError("Gemini model not initialised (missing API key or package).")
        response = self._model.generate_content(prompt)
        return response.text

    # ──────────────────────────────────────────────
    # Public provider methods
    # ──────────────────────────────────────────────

    async def analyze_job(self, description: str) -> Dict[str, Any]:
        prompt = (
            "You are an expert technical recruiter. "
            "Extract the following from the job description and output ONLY valid JSON "
            "matching this exact structure — no markdown, no preamble:\n"
            '{"title":"str","department":"str","coreSkills":[{"skill":"str","level":"expert|advanced|intermediate"}],'
            '"softSkills":["str"],"experience":"str","location":"str"}\n\n'
            f"Job Description:\n{description}"
        )
        try:
            text = await self._generate(prompt)
            result = self._extract_json(text)
            if result:
                return result
        except Exception as e:
            logger.error(f"Gemini analyze_job error: {e}")

        # Graceful fallback
        return {
            "title": "Software Engineer",
            "department": "Engineering",
            "coreSkills": [{"skill": "Python", "level": "intermediate"}],
            "softSkills": ["Communication"],
            "experience": "3+ years",
            "location": "Remote",
        }

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        prompt = (
            "Extract candidate details from this resume. "
            "Output ONLY valid JSON matching this schema — no markdown, no preamble:\n"
            '{"name":"str","email":"str","phone":"str","summary":"str","location":"str",'
            '"years_of_experience":float,"current_title":"str",'
            '"skills":[{"name":"str","level":"expert|advanced|intermediate"}],'
            '"experience":[{"title":"str","company":"str","years":float,"description":"str"}],'
            '"education":[{"degree":"str","school":"str"}]}\n\n'
            f"Resume:\n{resume_text}"
        )
        try:
            text = await self._generate(prompt)
            result = self._extract_json(text)
            if result:
                return result
        except Exception as e:
            logger.error(f"Gemini analyze_resume error: {e}")
        return {}

    async def rerank_candidates(
        self, job_desc: str, candidates: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        if not candidates:
            return []

        summaries = ""
        for i, c in enumerate(candidates):
            summaries += (
                f"Candidate {i}:\n"
                f"  Name: {c.get('full_name', '')}\n"
                f"  Title: {c.get('current_title', '')}\n"
                f"  Skills: {c.get('skills', [])}\n"
                f"  Experience: {c.get('years_of_experience', 0)} years\n"
                f"  Summary: {c.get('summary', '')[:300]}\n\n"
            )

        prompt = (
            "You are a Senior Technical Recruiter. "
            "Rank these candidates against the job description.\n"
            "For each candidate provide: overall_score (0-100), skills_score (0-100), "
            "experience_score (0-100), behavioral_score (0-100), explanation (2-3 sentences), "
            "confidence (0.0-1.0), and risks (list of strings, e.g. skills gaps, overqualification).\n"
            "Output ONLY a valid JSON array — no markdown, no preamble:\n"
            '[{"index":int,"overall_score":float,"skills_score":float,"experience_score":float,'
            '"behavioral_score":float,"explanation":"str","confidence":float,"risks":["str"]}]\n\n'
            f"Job Description:\n{job_desc}\n\n"
            f"Candidates:\n{summaries}"
        )

        try:
            text = await self._generate(prompt)
            ranks = self._extract_json(text)

            if isinstance(ranks, list):
                ranked = []
                handled = set()
                for r in ranks:
                    if not isinstance(r, dict):
                        continue
                    idx = r.get("index")
                    if idx is not None and 0 <= idx < len(candidates) and idx not in handled:
                        handled.add(idx)
                        c = dict(candidates[idx])
                        c["overall_score"] = float(r.get("overall_score", c.get("overall_score", 0)))
                        c["skill_score"] = float(r.get("skills_score", c.get("skill_score", 0)))
                        c["experience_score"] = float(r.get("experience_score", c.get("experience_score", 0)))
                        c["behavioral_score"] = float(r.get("behavioral_score", c.get("behavioral_score", 0)))
                        c["explanation"] = r.get("explanation", "")
                        c["confidence"] = float(r.get("confidence", 0.7))
                        c["risks"] = r.get("risks", [])
                        ranked.append(c)

                # Append any candidates the LLM missed
                for i, c in enumerate(candidates):
                    if i not in handled:
                        cp = dict(c)
                        cp["explanation"] = "Evaluated via database heuristics."
                        cp["confidence"] = 0.5
                        ranked.append(cp)

                return ranked
        except Exception as e:
            logger.error(f"Gemini rerank_candidates error: {e}")

        # Fallback — preserve heuristic scores
        for c in candidates:
            c["explanation"] = "Evaluated via heuristics (Gemini API fallback)."
            c["confidence"] = 0.5
        return candidates
