"""
ai_factory.py
─────────────
Returns the active AI provider based on DEFAULT_AI_PROVIDER setting.

Priority:
  1. GeminiProvider  (if GEMINI_API_KEY is set and DEFAULT_AI_PROVIDER == "gemini")
  2. NvidiaProvider  (fallback)
"""

import logging
from app.core.config import settings
from app.services.ai.provider import AIProvider

logger = logging.getLogger(__name__)


def get_ai_provider() -> AIProvider:
    use_gemini = (
        settings.DEFAULT_AI_PROVIDER.lower() == "gemini"
        and settings.GEMINI_API_KEY
    )

    if use_gemini:
        try:
            from app.services.ai.gemini_provider import GeminiProvider
            logger.info("AI provider: Google Gemini (gemini-1.5-flash)")
            return GeminiProvider(api_key=settings.GEMINI_API_KEY)
        except Exception as e:
            logger.warning(f"Failed to load GeminiProvider ({e}), falling back to NVIDIA.")

    from app.services.ai.nvidia_provider import NvidiaProvider
    logger.info("AI provider: NVIDIA NIM")
    return NvidiaProvider()
