import json
import logging
import httpx
from typing import Dict, Any, List
from app.core.config import settings
from app.services.ai.provider import AIProvider

logger = logging.getLogger(__name__)

class NvidiaProvider(AIProvider):
    def __init__(self):
        self.parse_key = settings.NVIDIA_API_KEY_PARSE or settings.NVIDIA_API_KEY
        self.rank_key = settings.NVIDIA_API_KEY or settings.NVIDIA_API_KEY_PARSE
        self.base_url = settings.NVIDIA_BASE_URL
        self.parse_model = settings.NVIDIA_PARSE_MODEL
        self.rank_model = settings.NVIDIA_RANK_MODEL
        
        if not self.parse_key and not self.rank_key:
            logger.warning("NVIDIA API keys not set. AI provider will use dummy fallback responses.")
            
    async def _call_llm(self, messages: List[Dict[str, str]], model: str, temperature: float = 0.1) -> str:
        api_key = self.parse_key if model == self.parse_model else self.rank_key
        if not api_key:
            raise ValueError("NVIDIA API key for this model is not configured.")
            
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload, timeout=60.0)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
            
    def _extract_json(self, text: str) -> Any:
        if not text:
            return None
            
        # Strip thinking block
        if "<think>" in text:
            text = text.split("</think>")[-1].strip()
            
        text = text.strip()
        
        # Strip markdown fences wrapping the whole text
        if text.startswith("```json"):
            text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
        elif text.startswith("```"):
            text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
        text = text.strip()

        # Try direct parse
        try:
            return json.loads(text)
        except Exception:
            pass

        # Try to find nested json codeblocks
        if "```json" in text:
            try:
                parts = text.split("```json")
                json_part = parts[1].split("```")[0].strip()
                return json.loads(json_part)
            except Exception:
                pass
                
        if "```" in text:
            try:
                parts = text.split("```")
                json_part = parts[1].strip()
                return json.loads(json_part)
            except Exception:
                pass

        # Fallback to search of bounds
        first_brace = text.find("{")
        first_bracket = text.find("[")
        
        start_idx = -1
        end_char = ""
        
        if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
            start_idx = first_brace
            end_char = "}"
        elif first_bracket != -1:
            start_idx = first_bracket
            end_char = "]"
            
        if start_idx != -1:
            last_idx = text.rfind(end_char)
            if last_idx != -1 and last_idx > start_idx:
                try:
                    return json.loads(text[start_idx:last_idx + 1])
                except Exception as e:
                    logger.error(f"Regex fallback JSON parsing failed: {e}")
                    
        logger.error(f"Failed to extract JSON from text: {text}")
        return None

    async def analyze_job(self, description: str) -> Dict[str, Any]:
        prompt = (
            "You are an expert technical recruiter. Extract the following from the job description "
            "and output ONLY valid JSON matching this exact structure: "
            "{\"title\": \"str\", \"department\": \"str\", \"coreSkills\": [{\"skill\": \"str\", \"level\": \"expert|advanced|intermediate\"}], \"softSkills\": [\"str\"], \"experience\": \"str\", \"location\": \"str\"}\n\n"
            f"Job Description:\n{description}"
        )
        
        messages = [{"role": "user", "content": prompt}]
        try:
            content = await self._call_llm(messages, self.parse_model)
            res = self._extract_json(content)
            if res:
                return res
        except Exception as e:
            logger.error(f"NVIDIA API Error in analyze_job: {e}")
            
        # Mock fallback if key missing or call fails
        return {
            "title": "Extracted Title",
            "department": "Engineering",
            "coreSkills": [{"skill": "Python", "level": "expert"}],
            "softSkills": ["Communication"],
            "experience": "3+ years",
            "location": "Remote"
        }

    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        prompt = (
            "Extract candidate details from this resume. Output ONLY valid JSON matching this schema: "
            "{\"name\":\"str\", \"email\":\"str\", \"phone\":\"str\", \"summary\":\"str\", \"location\":\"str\", \"years_of_experience\": float, \"current_title\":\"str\", "
            "\"skills\":[{\"name\":\"str\", \"level\":\"expert|advanced|intermediate\"}], "
            "\"experience\":[{\"title\":\"str\", \"company\":\"str\", \"years\": float, \"description\":\"str\"}], "
            "\"education\":[{\"degree\":\"str\", \"school\":\"str\"}]}\n\n"
            f"Resume:\n{resume_text}"
        )
        
        messages = [{"role": "user", "content": prompt}]
        try:
            content = await self._call_llm(messages, self.parse_model)
            res = self._extract_json(content)
            if res:
                return res
        except Exception as e:
            logger.error(f"NVIDIA API Error in analyze_resume: {e}")
            
        return {}
            
    async def rerank_candidates(self, job_desc: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not candidates:
            return []
            
        candidate_summaries = ""
        for i, c in enumerate(candidates):
            candidate_summaries += (
                f"Candidate {i}:\n"
                f"Name: {c.get('full_name', '')}\n"
                f"Title: {c.get('current_title', '')}\n"
                f"Skills: {c.get('skills', [])}\n"
                f"Exp: {c.get('years_of_experience', 0)} years\n"
                f"Summary: {c.get('summary', '')}\n\n"
            )
            
        prompt = (
            "You are a Senior Technical Recruiter. Based on the job description below, evaluate the candidates and rank them.\n"
            "Evaluate each candidate and provide: overall_score (0-100), skills_score (0-100), experience_score (0-100), behavioral_score (0-100), an explanation, a confidence score (0.0-1.0), and a list of risk areas (e.g. skills gaps, lack of relevant project work, potential overqualification, etc.).\n"
            "Output ONLY a valid JSON array of candidate evaluation records matching this format:\n"
            "[{\"index\": int, \"overall_score\": float, \"skills_score\": float, \"experience_score\": float, \"behavioral_score\": float, \"explanation\": \"str\", \"confidence\": float, \"risks\": [\"str\"]}]\n\n"
            f"Job Description:\n{job_desc}\n\n"
            f"Candidates:\n{candidate_summaries}"
        )
        
        messages = [{"role": "user", "content": prompt}]
        try:
            content = await self._call_llm(messages, self.rank_model, temperature=0.2)
            ranks = self._extract_json(content)
            
            if isinstance(ranks, list):
                ranked_candidates = []
                handled = set()
                
                for rank_info in ranks:
                    if not isinstance(rank_info, dict):
                        continue
                    idx = rank_info.get("index")
                    if idx is not None and 0 <= idx < len(candidates) and idx not in handled:
                        handled.add(idx)
                        c = dict(candidates[idx])
                        c["overall_score"] = float(rank_info.get("overall_score", c.get("overall_score", 0.0)))
                        c["skill_score"] = float(rank_info.get("skills_score", c.get("skill_score", 0.0)))
                        c["experience_score"] = float(rank_info.get("experience_score", c.get("experience_score", 0.0)))
                        c["behavioral_score"] = float(rank_info.get("behavioral_score", c.get("behavioral_score", 0.0)))
                        c["explanation"] = rank_info.get("explanation", "")
                        c["confidence"] = float(rank_info.get("confidence", 0.0))
                        c["risks"] = rank_info.get("risks", [])
                        ranked_candidates.append(c)
                
                # Append any candidates missed by LLM
                for i, c in enumerate(candidates):
                    if i not in handled:
                        c_copy = dict(c)
                        c_copy["explanation"] = "Evaluated via database heuristics."
                        c_copy["confidence"] = 0.5
                        ranked_candidates.append(c_copy)
                        
                return ranked_candidates
        except Exception as e:
            logger.error(f"NVIDIA API Error in rerank_candidates: {e}")
            
        # Fallback if API fails or isn't set: preserve database heuristics
        for c in candidates:
            c["explanation"] = "Evaluated via database heuristics (NVIDIA API fallback)."
            c["confidence"] = 0.5
        return candidates
