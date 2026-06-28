import os
import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin SDK
cred_path = os.getenv("FIREBASE_CREDENTIALS")
if cred_path and os.path.exists(cred_path):
    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
else:
    # If no credentials file provided, try default initialization with project ID
    if not firebase_admin._apps:
        try:
            project_id = os.getenv("FIREBASE_PROJECT_ID", "hireintel-ai-aa784")
            firebase_admin.initialize_app(options={"projectId": project_id})
        except Exception as e:
            print(f"Warning: Failed to initialize Firebase Admin automatically: {e}")

security = HTTPBearer()

def verify_firebase_token(token: str) -> dict:
    """Verifies a Firebase ID token and returns the decoded token."""
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
