# api/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import SessionLocal
from models.user import User
from auth.auth_utils import hash_password, verify_password, create_access_token
from auth.auth_utils import get_current_user

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class RegisterInput(BaseModel):
    name: str
    email: str
    phone_number: str
    password: str

class LoginInput(BaseModel):
    email: str
    password: str


class UpdateProfileInput(BaseModel):
    name: str
    email: str
    phone_number: str

@router.post("/register")
def register(data: RegisterInput, db: Session = Depends(get_db)):
    name = data.name.strip()
    email = data.email.strip().lower()
    phone_number = data.phone_number.strip()
    password = data.password

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(phone_number) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    existing_phone = db.query(User).filter(User.phone_number == phone_number).first()
    if existing_phone:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    # Determine admin status by email domain: emails ending with '@aiassistant.in' are admins
    is_admin_flag = False
    try:
        if isinstance(email, str) and email.endswith('@aiassistant.in'):
            is_admin_flag = True
    except Exception:
        is_admin_flag = False

    user = User(
        name=name,
        email=email,
        phone_number=phone_number,
        hashed_password=hash_password(password),
        is_admin=is_admin_flag
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "User registered successfully"}

@router.post("/login")
def login(data: LoginInput, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid password")

    token = create_access_token({"sub": user.email})

    # Return user info along with token so frontend can store it
    user_info = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone_number": user.phone_number,
        "is_admin": bool(user.is_admin)
    }
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_info
    }


@router.get("/users")
def get_users(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only admins may list users
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    users = db.query(User).all()
    return {"users": [{"id": u.id, "name": u.name, "email": u.email, "is_admin": bool(u.is_admin)} for u in users]}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only admins may delete users
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin self-delete
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


class AdminToggleInput(BaseModel):
    is_admin: bool

@router.post("/users/{user_id}/admin-toggle")
def toggle_admin(user_id: int, payload: AdminToggleInput, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only admins may toggle admin status
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent admin from demoting themselves
    if user.id == current_user.id and not payload.is_admin:
        raise HTTPException(status_code=400, detail="Cannot remove admin privilege from yourself")

    user.is_admin = bool(payload.is_admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "is_admin": bool(user.is_admin)}


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "is_admin": bool(current_user.is_admin)
    }


def _update_user_profile(payload: UpdateProfileInput, current_user: User, db: Session):
    name = payload.name.strip()
    email = payload.email.strip().lower()
    phone_number = payload.phone_number.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Name is required")
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")
    if len(phone_number) < 8:
        raise HTTPException(status_code=400, detail="Invalid phone number")

    # Re-load user in this request session to avoid cross-session attach errors
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    email_taken = db.query(User).filter(User.email == email, User.id != db_user.id).first()
    if email_taken:
        raise HTTPException(status_code=400, detail="Email already registered")

    phone_taken = db.query(User).filter(User.phone_number == phone_number, User.id != db_user.id).first()
    if phone_taken:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    db_user.name = name
    db_user.email = email
    db_user.phone_number = phone_number
    db.commit()
    db.refresh(db_user)

    return {
        "id": db_user.id,
        "name": db_user.name,
        "email": db_user.email,
        "phone_number": db_user.phone_number,
        "is_admin": bool(db_user.is_admin)
    }


@router.put("/me")
def update_me_put(payload: UpdateProfileInput, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _update_user_profile(payload, current_user, db)


@router.post("/me")
def update_me_post(payload: UpdateProfileInput, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _update_user_profile(payload, current_user, db)


@router.get("/admin/stats")
def admin_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only admins
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    from models.recommendations import DiabetesRecommendation

    total_users = db.query(User).count()
    diabetes_recs = db.query(DiabetesRecommendation).count()

    return {
        "total_users": total_users,
        "total_recommendations": diabetes_recs,
        "diabetes_recommendations": diabetes_recs
    }


@router.get("/users/{user_id}/recommendations")
def get_user_recommendations(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Only admins
    if not getattr(current_user, 'is_admin', False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    from models.recommendations import DiabetesRecommendation

    dia_rows = db.query(DiabetesRecommendation).filter(DiabetesRecommendation.user_id == user_id).order_by(DiabetesRecommendation.created_at.desc()).all()

    def serialize(rows):
        out = []
        for r in rows:
            try:
                created = r.created_at.isoformat() if r.created_at else None
            except Exception:
                created = str(r.created_at)
            out.append({
                "id": r.id,
                "risk_score": getattr(r, 'risk_score', None),
                "risk_level": getattr(r, 'risk_level', None),
                "recommendations": getattr(r, 'recommendations', None),
                "created_at": created
            })
        return out

    return {
        "diabetes": serialize(dia_rows)
    }
