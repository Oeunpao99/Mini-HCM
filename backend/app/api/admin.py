from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    PAYROLL_OFFICER_ROLE,
    get_db,
    require_roles,
    normalize_role,
    scoped_user_ids,
)
from app.models.attendance import Attendance
from app.models.location_alert import LocationAlert
from app.models.user import User
from app.schemas.attendance import AttendanceRecordOut

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/users")
def visible_users(
    db: Session = Depends(get_db),
    user=Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE)),
):
    user_ids = scoped_user_ids(db, user, include_self=True)
    rows = db.query(User).filter(User.id.in_(user_ids)).order_by(User.name.asc()).all()
    return [
        {
            "id": row.id,
            "emp_code": row.emp_code,
            "name": row.name,
            "email": row.email,
            "role": normalize_role(row.role),
            "department": row.department,
            "manager_id": row.manager_id,
        }
        for row in rows
    ]


@router.get("/all-attendance", response_model=list[AttendanceRecordOut])
def all_attendance(
    db: Session = Depends(get_db),
    user=Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE)),
):
    user_ids = scoped_user_ids(db, user, include_self=True)
    return (
        db.query(Attendance)
        .filter(Attendance.user_id.in_(user_ids))
        .order_by(Attendance.date.desc())
        .all()
    )


@router.get("/location-alerts")
def location_alerts(
    db: Session = Depends(get_db),
    user=Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE)),
):
    user_ids = scoped_user_ids(db, user, include_self=True)
    rows = (
        db.query(LocationAlert)
        .filter(LocationAlert.user_id.in_(user_ids))
        .order_by(LocationAlert.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "date": r.date,
            "latitude": float(r.latitude),
            "longitude": float(r.longitude),
            "distance_meters": float(r.distance_meters),
            "action_type": r.action_type,
            "message": r.message,
            "created_at": r.created_at,
        }
        for r in rows
    ]
