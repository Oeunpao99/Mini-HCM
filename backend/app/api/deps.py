from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.user import User

security = HTTPBearer()

ROLE_ALIASES = {
    "employee": "staff",
    "manager": "line_manager",
    "admin": "management_hr",
}

STAFF_ROLE = "staff"
LINE_MANAGER_ROLE = "line_manager"
DEPARTMENT_HEAD_ROLE = "department_head"
MANAGEMENT_HR_ROLE = "management_hr"
PAYROLL_OFFICER_ROLE = "payroll_officer"
PEOPLE_ACCESS_ROLES = {
    LINE_MANAGER_ROLE,
    DEPARTMENT_HEAD_ROLE,
    MANAGEMENT_HR_ROLE,
    PAYROLL_OFFICER_ROLE,
}


def normalize_role(role: str | None) -> str | None:
    if role is None:
        return None
    return ROLE_ALIASES.get(role, role)


def can_manage_people(user: User) -> bool:
    return normalize_role(user.role) in PEOPLE_ACCESS_ROLES


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: str):
    normalized_roles = {normalize_role(role) for role in roles}

    def wrapper(user: User = Depends(get_current_user)) -> User:
        if normalize_role(user.role) not in normalized_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return user

    return wrapper


def scoped_user_ids(db: Session, user: User, include_self: bool = False) -> list[int]:
    role = normalize_role(user.role)

    if role in {MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE}:
        ids = [row.id for row in db.query(User.id).all()]
    elif role == DEPARTMENT_HEAD_ROLE:
        if not user.department:
            ids = []
        else:
            ids = [
                row.id
                for row in db.query(User.id)
                .filter(User.department == user.department)
                .all()
            ]
    elif role == LINE_MANAGER_ROLE:
        ids = [
            row.id
            for row in db.query(User.id)
            .filter(User.manager_id == user.id)
            .all()
        ]
    else:
        ids = []

    if include_self and user.id not in ids:
        ids.append(user.id)

    return ids


def ensure_user_in_scope(db: Session, actor: User, target_user_id: int) -> None:
    if target_user_id == actor.id:
        return

    if target_user_id not in scoped_user_ids(db, actor):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
