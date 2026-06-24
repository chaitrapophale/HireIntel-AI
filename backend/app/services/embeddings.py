import chromadb
from chromadb.utils import embedding_functions
import os
from dotenv import load_dotenv

load_dotenv()

CHROMA_PERSIST_DIRECTORY = os.getenv("CHROMA_PERSIST_DIRECTORY", "./chroma_db")

# Initialize ChromaDB client
chroma_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIRECTORY)

# Default embedding function uses all-MiniLM-L6-v2 which runs locally and is extremely fast
# No API key required for this! Perfect for initial semantic matching.
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Create or get collection
candidates_collection = chroma_client.get_or_create_collection(
    name="candidates",
    embedding_function=sentence_transformer_ef
)

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
    candidates_collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

def search_candidates(query_text: str, n_results: int = 10):
    """
    Searches ChromaDB using semantic similarity.
    """
    results = candidates_collection.query(
        query_texts=[query_text],
        n_results=n_results
    )
    return results
