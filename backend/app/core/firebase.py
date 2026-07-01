import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Initialize Firebase Admin SDK
# ---------------------------------------------------------------------------
# On Cloud Run with no service account JSON, Firebase Admin uses
# Application Default Credentials (ADC). The project ID must be set
# explicitly because the metadata server may not expose it in all regions.
# ---------------------------------------------------------------------------
_firebase_ready = False

if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_CREDENTIALS")
    project_id = os.getenv("FIREBASE_PROJECT_ID", "hireintel-ai-aa784")
    try:
        if cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {"projectId": project_id})
        else:
            # Cloud Run: use ADC (service account attached to the Cloud Run service)
            firebase_admin.initialize_app(options={"projectId": project_id})
        _firebase_ready = True
    except Exception as e:
        print(f"Warning: Firebase Admin SDK init failed: {e}")
else:
    _firebase_ready = True

security = HTTPBearer()

def verify_firebase_token(token: str) -> dict:
    """Verifies a Firebase ID token and returns the decoded token."""
    if not _firebase_ready:
        raise HTTPException(
            status_code=401,
            detail="Firebase Admin SDK is not configured. Set FIREBASE_CREDENTIALS or ensure ADC is available.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """FastAPI dependency to extract the user ID (UID) from the Bearer token."""
    token = credentials.credentials
    decoded_token = verify_firebase_token(token)
    uid = decoded_token.get("uid")
    if not uid:
        raise HTTPException(
            status_code=401,
            detail="Token does not contain a valid user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return uid
