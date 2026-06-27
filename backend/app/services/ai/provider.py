from abc import ABC, abstractmethod
from typing import Dict, Any, List

class AIProvider(ABC):
    @abstractmethod
    async def analyze_job(self, description: str) -> Dict[str, Any]:
        """Extract structured requirements from a job description."""
        pass
        
    @abstractmethod
    async def analyze_resume(self, resume_text: str) -> Dict[str, Any]:
        """Extract structured fields from a raw resume."""
        pass
        
    @abstractmethod
    async def rerank_candidates(self, job_desc: str, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """LLM-based reranking of top candidate profiles."""
        pass
