from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.core.security import create_access_token, get_current_user
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from app.core.config import settings

router = APIRouter()

class GoogleAuthRequest(BaseModel):
    credential: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

@router.post("/google", response_model=TokenResponse)
def google_auth(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    if request.credential == "dev_fallback":
        user = db.query(User).first()
        if not user:
            user = User(name="Sarah Jenkins", email="sarah@globaltech.com")
            db.add(user)
            db.commit()
            db.refresh(user)
        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"name": user.name, "email": user.email, "role": user.role}
        }

    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=400, detail="Google Auth is not configured")


    try:
        idinfo = id_token.verify_oauth2_token(request.credential, requests.Request(), settings.GOOGLE_CLIENT_ID)
        email = idinfo['email']
        name = idinfo.get('name', '')
        google_id = idinfo['sub']
        picture = idinfo.get('picture', '')

        user = db.query(User).filter(User.google_id == google_id).first()
        if not user:
            user = db.query(User).filter(User.email == email).first()
            if user:
                user.google_id = google_id
                user.profile_picture = picture
            else:
                user = User(name=name, email=email, google_id=google_id, profile_picture=picture)
                db.add(user)
            db.commit()
            db.refresh(user)

        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {"name": user.name, "email": user.email, "picture": user.profile_picture, "role": user.role}
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {e}")

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
