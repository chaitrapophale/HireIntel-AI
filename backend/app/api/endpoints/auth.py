from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.user import User
from app.core.security import (
    create_access_token,
    create_temp_token,
    verify_temp_token,
    get_current_user
)
from pydantic import BaseModel
from typing import Optional
import pyotp
import os

router = APIRouter()

class LoginRequest(BaseModel):
    id_token: str
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    require_2fa: Optional[bool] = False
    temp_token: Optional[str] = None
    user: dict

class Verify2FARequest(BaseModel):
    temp_token: str
    code: str

class Enable2FARequest(BaseModel):
    code: str

class Disable2FARequest(BaseModel):
    code: str

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    email = req.email
    name = req.name or "User"
    picture = req.picture or ""
    google_id = None

    if req.id_token != "dev_fallback":
        try:
            from app.core.firebase import verify_firebase_token
            decoded = verify_firebase_token(req.id_token)
            email = decoded.get("email") or email
            name = decoded.get("name") or name
            picture = decoded.get("picture") or picture
            google_id = decoded.get("uid")
        except Exception as e:
            # Fallback for developer environment if Firebase is not configured
            # but an email was provided in the request.
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Firebase validation failed: {str(e)}"
                )
    else:
        # Developer fallback defaults
        if not email:
            email = "sarah@globaltech.com"
            name = "Sarah Jenkins"

    # Normalize email
    email = email.lower().strip()

    # Find or create local user record
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            google_id=google_id,
            profile_picture=picture,
            role="admin"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update google_id and profile picture if they changed
        if google_id and not user.google_id:
            user.google_id = google_id
        if picture and not user.profile_picture:
            user.profile_picture = picture
        db.commit()
        db.refresh(user)

    # Check if 2FA (TOTP) is enabled for the user
    if user.is_totp_enabled:
        temp_token = create_temp_token(user.id)
        return {
            "require_2fa": True,
            "temp_token": temp_token,
            "user": {"name": user.name, "email": user.email, "picture": user.profile_picture, "role": user.role}
        }

    # Issue full access token immediately if 2FA is disabled
    access_token = create_access_token(subject=user.id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "require_2fa": False,
        "user": {"name": user.name, "email": user.email, "picture": user.profile_picture, "role": user.role}
    }

@router.get("/me")
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# ══════════════════════════════════════════════════════════════
# TWO-FACTOR AUTHENTICATION (2FA) ENDPOINTS
# ══════════════════════════════════════════════════════════════

@router.get("/2fa/setup")
def setup_2fa(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generates a new TOTP secret and returns provisioning URI for QR code setup."""
    # Generate random base32 secret
    secret = pyotp.random_base32()
    
    # Save the secret temporarily on the user record.
    # Note: 2FA is not considered enabled until they verify the first code.
    current_user.totp_secret = secret
    db.commit()

    # Generate Google Authenticator provisioning URI
    provisioning_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.email,
        issuer_name="HireIntel AI"
    )

    return {
        "secret": secret,
        "provisioning_uri": provisioning_uri
    }

@router.post("/2fa/enable")
def enable_2fa(
    req: Enable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verifies the initial setup code and activates 2FA for the user."""
    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA setup has not been initialized. Please call /2fa/setup first."
        )

    totp = pyotp.TOTP(current_user.totp_secret)
    if totp.verify(req.code):
        current_user.is_totp_enabled = True
        db.commit()
        return {"success": True, "message": "Google Authenticator 2FA enabled successfully."}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Please check your Authenticator app and try again."
        )

@router.post("/2fa/verify", response_model=TokenResponse)
def verify_2fa(req: Verify2FARequest, db: Session = Depends(get_db)):
    """Verifies a 2FA challenge code during the login process."""
    user_id = verify_temp_token(req.temp_token)
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session or 2FA has not been setup for this user."
        )

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(req.code):
        # 2FA code is valid — issue the final access token
        access_token = create_access_token(subject=user.id)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "require_2fa": False,
            "user": {"name": user.name, "email": user.email, "picture": user.profile_picture, "role": user.role}
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid 2FA code. Please check your Authenticator app."
        )

@router.post("/2fa/disable")
def disable_2fa(
    req: Disable2FARequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disables 2FA for the user (requires a valid verification code)."""
    if not current_user.is_totp_enabled or not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this user."
        )

    totp = pyotp.TOTP(current_user.totp_secret)
    if totp.verify(req.code):
        current_user.is_totp_enabled = False
        current_user.totp_secret = None
        db.commit()
        return {"success": True, "message": "Google Authenticator 2FA disabled successfully."}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code. Failed to disable 2FA."
        )
