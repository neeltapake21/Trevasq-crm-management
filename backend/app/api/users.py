from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import hash_password, normalize_email
from backend.app.models.entities import AdminUser
from backend.app.schemas import UserResponse, UserCreate
from backend.app.api.deps import get_current_user, require_roles
from backend.app.services.activity_service import log_activity

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin"]))
):
    users = db.query(AdminUser).order_by(AdminUser.created_at.desc()).all()
    return users

@router.post("", response_model=UserResponse)
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin"]))
):
    email = normalize_email(user_in.email)
    existing = db.query(AdminUser).filter(AdminUser.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    if user_in.role not in ("admin", "marketing_manager", "analyst"):
        raise HTTPException(status_code=400, detail="Invalid role specified")

    user = AdminUser(
        name=user_in.name,
        email=email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    log_activity(
        db=db,
        action="user_created",
        entity_type="admin_user",
        entity_id=str(user.id),
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"role": user.role, "email": user.email}
    )

    return user
