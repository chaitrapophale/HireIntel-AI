"""
Embeddings Service — HireIntel AI
Fixes applied:
  - collection.add() replaced with upsert() to handle re-uploads without crash
  - Structured logging replacing print()
  - Public API renamed to upsert_candidates_to_vector_db for clarity
"""
from __future__ import annotations

import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")

_chroma_client = None
_candidates_collection = None


def _get_collection():
    """Lazily initialize ChromaDB. Returns None if chromadb is not installed."""
    global _chroma_client, _candidates_collection
    if _candidates_collection is not None:
        return _candidates_collection
    try:
        import chromadb
        from chromadb.utils import embedding_functions

        _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)
        sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _candidates_collection = _chroma_client.get_or_create_collection(
            name="candidates",
            embedding_function=sentence_transformer_ef,
        )
        logger.info("ChromaDB collection 'candidates' initialized at %s", CHROMA_PERSIST_DIRECTORY)
        return _candidates_collection
    except Exception as e:
        logger.warning("ChromaDB not available: %s. Semantic search disabled.", e)
        return None


def upsert_candidates_to_vector_db(candidates_data: list[dict]) -> None:
    """
    Upsert candidate documents into ChromaDB.
    Uses upsert() instead of add() so re-uploading the same candidate
    does not crash with a duplicate ID error.
    """
    if not candidates_data:
        return

    ids = []
    documents = []
    metadatas = []

    for c in candidates_data:
        candidate_id = c["candidate_id"]
        profile = c.get("profile", {})
        title = profile.get("current_title", "")
        summary = profile.get("summary", "")
        skills = ", ".join([s["name"] for s in c.get("skills", []) if isinstance(s, dict)])

        semantic_doc = f"Title: {title}. Summary: {summary}. Skills: {skills}."

        ids.append(candidate_id)
        documents.append(semantic_doc)
        metadatas.append(
            {
                "title": title,
                "years_of_experience": float(profile.get("years_of_experience", 0)),
                "location": profile.get("location", ""),
            }
        )

    collection = _get_collection()
    if collection is None:
        logger.warning("ChromaDB unavailable — skipping vector upsert for %d candidates", len(ids))
        return

    # upsert is idempotent — safe for re-uploads
    collection.upsert(documents=documents, metadatas=metadatas, ids=ids)
    logger.info("Upserted %d candidates into ChromaDB", len(ids))


# Keep old name as alias for backward compatibility
add_candidates_to_vector_db = upsert_candidates_to_vector_db


def search_candidates(query_text: str, n_results: int = 10) -> dict:
    """
    Search ChromaDB using semantic similarity.
    Returns empty results if ChromaDB is unavailable or collection is empty.
    """
    collection = _get_collection()
    if collection is None:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

    try:
        count = collection.count()
        if count == 0:
            return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}

        actual_n = min(n_results, count)
        results = collection.query(query_texts=[query_text], n_results=actual_n)
        return results
    except Exception as e:
        logger.warning("ChromaDB search failed: %s", e)
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
