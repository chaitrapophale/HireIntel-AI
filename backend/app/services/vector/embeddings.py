import os
import logging
import httpx
from typing import Any
from app.core.config import settings

try:
    from chromadb.api.types import EmbeddingFunction, Documents, Embeddings  # type: ignore
except ImportError:
    EmbeddingFunction = object
    Documents = Any
    Embeddings = Any

logger = logging.getLogger(__name__)

def get_nvidia_embeddings(texts: list[str], input_type: str = "passage") -> list[list[float]]:
    """Calls NVIDIA's embeddings API explicitly using httpx."""
    api_key = settings.NVIDIA_API_KEY_EMBED or settings.NVIDIA_API_KEY
    if not api_key:
        logger.warning("No NVIDIA_API_KEY_EMBED or NVIDIA_API_KEY, using dummy embeddings")
        return [[0.1] * 1024 for _ in texts]
        
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    embeddings = []
    url = f"{settings.NVIDIA_BASE_URL}/embeddings"
    
    # Process in batches of 10 to avoid payload limits
    batch_size = 10
    with httpx.Client() as client:
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            payload = {
                "input": batch,
                "model": settings.NVIDIA_EMBED_MODEL,
                "input_type": input_type,
                "encoding_format": "float"
            }
            try:
                response = client.post(url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                data = response.json()
                
                batch_embeddings = []
                for item in data.get("data", []):
                    batch_embeddings.append(item["embedding"])
                    
                if len(batch_embeddings) < len(batch):
                    missing_count = len(batch) - len(batch_embeddings)
                    batch_embeddings.extend([[0.1] * 1024 for _ in range(missing_count)])
                    
                embeddings.extend(batch_embeddings)
            except Exception as e:
                logger.error(f"NVIDIA Embedding API error: {e}")
                # Return dummy embeddings for the batch on error
                embeddings.extend([[0.1] * 1024 for _ in batch])
                
    return embeddings

class NvidiaEmbeddingFunction(EmbeddingFunction):
    def __init__(self, input_type: str = "passage"):
        self.input_type = input_type
        
    def __call__(self, input: Documents) -> Embeddings:
        return get_nvidia_embeddings(input, input_type=self.input_type)

_chroma_client = None
_candidates_collection = None
_CHROMADB_AVAILABLE = False

def _get_collection():
    global _chroma_client, _candidates_collection, _CHROMADB_AVAILABLE
    if _candidates_collection is not None:
        return _candidates_collection
    try:
        import chromadb  # type: ignore
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIRECTORY)
        ef = NvidiaEmbeddingFunction(input_type="passage")
        _candidates_collection = _chroma_client.get_or_create_collection(
            name="candidates_v2",
            embedding_function=ef,
        )
        _CHROMADB_AVAILABLE = True
        return _candidates_collection
    except Exception as e:
        logger.error(f"ChromaDB initialization failed: {e}")
        return None

def generate_embedding_doc(candidate_data: dict) -> str:
    """Creates a semantic text representation for embedding."""
    title = candidate_data.get("current_title", "")
    summary = candidate_data.get("summary", "")
    
    skills_raw = candidate_data.get("skills", [])
    skills = []
    for s in skills_raw:
        if isinstance(s, dict):
            skills.append(s.get("name", ""))
        elif isinstance(s, str):
            skills.append(s)
    skills_str = ", ".join(skills)
    
    exp_list = candidate_data.get("experience", [])
    exp_summary = " ".join([f"{e.get('title','')} at {e.get('company','')}" for e in exp_list])
    
    return f"Title: {title}. Summary: {summary}. Skills: {skills_str}. Experience: {exp_summary}."

def add_candidates_to_vector_db(candidates_data: list[dict]):
    collection = _get_collection()
    if collection is None:
        return
        
    ids = []
    documents = []
    metadatas = []
    
    for c in candidates_data:
        ids.append(c["id"])
        doc = generate_embedding_doc(c)
        documents.append(doc)
        metadatas.append({
            "title": c.get("current_title", ""),
            "years_of_experience": c.get("years_of_experience", 0),
            "location": c.get("location", "")
        })
        
    # Manually fetch embeddings with passage input type
    embeddings = get_nvidia_embeddings(documents, input_type="passage")
    
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids,
        embeddings=embeddings
    )

def search_candidates(query_text: str, n_results: int = 10):
    collection = _get_collection()
    if collection is None:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        
    # Manually fetch embeddings with query input type
    query_embeddings = get_nvidia_embeddings([query_text], input_type="query")
    
    return collection.query(
        query_embeddings=query_embeddings,
        n_results=n_results
    )

def delete_candidate_from_vector_db(candidate_id: str):
    """Remove a single candidate from ChromaDB by ID."""
    collection = _get_collection()
    if collection is None:
        return
    try:
        collection.delete(ids=[candidate_id])
        logger.info(f"Deleted candidate {candidate_id} from vector DB")
    except Exception as e:
        logger.warning(f"Could not delete candidate {candidate_id} from vector DB: {e}")

