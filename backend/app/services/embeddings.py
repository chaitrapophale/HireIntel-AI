import os
from dotenv import load_dotenv

load_dotenv()

CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")

# Lazy-load chromadb so the server starts even if it's not installed yet
_chroma_client = None
_candidates_collection = None
_CHROMADB_AVAILABLE = False

def _get_collection():
    """Lazily initialize ChromaDB. Returns None if chromadb is not installed."""
    global _chroma_client, _candidates_collection, _CHROMADB_AVAILABLE
    if _candidates_collection is not None:
        return _candidates_collection
    try:
        import chromadb  # noqa: PLC0415
        from chromadb.utils import embedding_functions  # noqa: PLC0415
        _chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)
        sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="all-MiniLM-L6-v2"
        )
        _candidates_collection = _chroma_client.get_or_create_collection(
            name="candidates",
            embedding_function=sentence_transformer_ef,
        )
        _CHROMADB_AVAILABLE = True
        return _candidates_collection
    except Exception as e:
        print(f"[embeddings] ChromaDB not available: {e}. Semantic search disabled.")
        return None

def add_candidates_to_vector_db(candidates_data: list[dict]):
    """
    Takes a list of candidate dictionaries and inserts them into ChromaDB.
    """
    ids = []
    documents = []
    metadatas = []
    
    for c in candidates_data:
        candidate_id = c["candidate_id"]
        
        # Build a semantic string representing the candidate's core value proposition
        profile = c.get("profile", {})
        title = profile.get("current_title", "")
        summary = profile.get("summary", "")
        skills = ", ".join([s["name"] for s in c.get("skills", [])])
        
        # This string is what we will embed and search against
        semantic_doc = f"Title: {title}. Summary: {summary}. Skills: {skills}."
        
        ids.append(candidate_id)
        documents.append(semantic_doc)
        
        # Store metadata for quick filtering (e.g. only search candidates in 'India')
        metadatas.append({
            "title": title,
            "years_of_experience": profile.get("years_of_experience", 0),
            "location": profile.get("location", "")
        })
        
    # Batch add to ChromaDB
    collection = _get_collection()
    if collection is None:
        return  # chromadb not available, skip silently
    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

def search_candidates(query_text: str, n_results: int = 10):
    """
    Searches ChromaDB using semantic similarity.
    Returns empty results if chromadb is not installed.
    """
    collection = _get_collection()
    if collection is None:
        return {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
    results = collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results
