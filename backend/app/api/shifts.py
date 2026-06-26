from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    get_current_user,
    get_db,
    require_roles,
)
from app.models.hris import ShiftSchedule
from app.models.shift.models import ShiftMaster
from app.models.user import User

router = APIRouter(prefix="/api/shifts", tags=["shifts"])


# ─── Schemas ────────────────────────────────────────────────────────

class ShiftMasterCreate(BaseModel):
    shift_code: str
    shift_name: str
    shift_type: str
    start_time: str
    end_time: str
    break_start_time: str | None = None
    break_end_time: str | None = None
    working_hours: float | None = None
    late_tolerance_minutes: int | None = 0
    early_leave_tolerance_minutes: int | None = 0
    is_active: bool = True


class ShiftMasterUpdate(BaseModel):
    shift_name: str | None = None
    shift_type: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    break_start_time: str | None = None
    break_end_time: str | None = None
    working_hours: float | None = None
    late_tolerance_minutes: int | None = None
    early_leave_tolerance_minutes: int | None = None
    is_active: bool | None = None


class ScheduleCreate(BaseModel):
    user_id: int
    shift_id: int | None = None
    shift_name: str
    work_date: str
    start_time: str
    end_time: str
    location: str | None = None
    is_rest_day: bool = False
    is_public_holiday: bool = False
    schedule_status: str = "Planned"
    remarks: str | None = None


class ScheduleUpdate(BaseModel):
    shift_id: int | None = None
    shift_name: str | None = None
    work_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    location: str | None = None
    is_rest_day: bool | None = None
    is_public_holiday: bool | None = None
    schedule_status: str | None = None
    remarks: str | None = None
    is_active: bool | None = None


def parse_time(value: str | None):
    if not value:
        return None
    parts = value.split(":")
    return datetime.strptime(f"{parts[0]}:{parts[1]}", "%H:%M").time()


# ─── Shift Master CRUD ──────────────────────────────────────────────

@router.get("")
def list_shifts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    shifts = db.query(ShiftMaster).order_by(ShiftMaster.shift_code).all()
    return shifts


@router.post("")
def create_shift(
    payload: ShiftMasterCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    existing = db.query(ShiftMaster).filter(ShiftMaster.shift_code == payload.shift_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Shift code already exists")
    shift = ShiftMaster(
        shift_code=payload.shift_code,
        shift_name=payload.shift_name,
        shift_type=payload.shift_type,
        start_time=parse_time(payload.start_time),
        end_time=parse_time(payload.end_time),
        break_start_time=parse_time(payload.break_start_time),
        break_end_time=parse_time(payload.break_end_time),
        working_hours=payload.working_hours,
        late_tolerance_minutes=payload.late_tolerance_minutes,
        early_leave_tolerance_minutes=payload.early_leave_tolerance_minutes,
        is_active=payload.is_active,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.put("/{shift_id}")
def update_shift(
    shift_id: int,
    payload: ShiftMasterUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    shift = db.query(ShiftMaster).filter(ShiftMaster.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if payload.shift_name is not None:
        shift.shift_name = payload.shift_name
    if payload.shift_type is not None:
        shift.shift_type = payload.shift_type
    if payload.start_time is not None:
        shift.start_time = parse_time(payload.start_time)
    if payload.end_time is not None:
        shift.end_time = parse_time(payload.end_time)
    if payload.break_start_time is not None:
        shift.break_start_time = parse_time(payload.break_start_time)
    if payload.break_end_time is not None:
        shift.break_end_time = parse_time(payload.break_end_time)
    if "working_hours" in payload.model_fields_set:
        shift.working_hours = payload.working_hours
    if payload.late_tolerance_minutes is not None:
        shift.late_tolerance_minutes = payload.late_tolerance_minutes
    if payload.early_leave_tolerance_minutes is not None:
        shift.early_leave_tolerance_minutes = payload.early_leave_tolerance_minutes
    if payload.is_active is not None:
        shift.is_active = payload.is_active
    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/{shift_id}")
def delete_shift(
    shift_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    shift = db.query(ShiftMaster).filter(ShiftMaster.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return {"message": "Shift deleted"}


# ─── Schedule Assignment CRUD ───────────────────────────────────────

@router.get("/schedules")
def list_schedules(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    schedules = (
        db.query(ShiftSchedule)
        .order_by(ShiftSchedule.work_date.desc())
        .all()
    )
    result = []
    for s in schedules:
        result.append({
            "id": s.id,
            "user_id": s.user_id,
            "employee_name": s.user.name if s.user else "",
            "employee_code": s.user.emp_code if s.user else "",
            "department": s.user.department if s.user else "",
            "shift_id": s.shift_id,
            "shift_name": s.shift_name,
            "work_date": s.work_date.isoformat(),
            "start_time": s.start_time.isoformat() if s.start_time else None,
            "end_time": s.end_time.isoformat() if s.end_time else None,
            "location": s.location,
            "is_rest_day": s.is_rest_day,
            "is_public_holiday": s.is_public_holiday,
            "schedule_status": s.schedule_status,
            "remarks": s.remarks,
            "is_active": s.is_active,
        })
    return result


@router.post("/schedules")
def create_schedule(
    payload: ScheduleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    work_date = datetime.strptime(payload.work_date, "%Y-%m-%d").date()
    existing = db.query(ShiftSchedule).filter(
        ShiftSchedule.user_id == payload.user_id,
        ShiftSchedule.work_date == work_date,
        ShiftSchedule.is_active == True,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Employee already has a schedule on this date")

    schedule = ShiftSchedule(
        user_id=payload.user_id,
        shift_id=payload.shift_id,
        shift_name=payload.shift_name,
        work_date=work_date,
        start_time=parse_time(payload.start_time),
        end_time=parse_time(payload.end_time),
        location=payload.location,
        is_rest_day=payload.is_rest_day,
        is_public_holiday=payload.is_public_holiday,
        schedule_status=payload.schedule_status,
        remarks=payload.remarks,
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return {
        "id": schedule.id,
        "user_id": schedule.user_id,
        "shift_id": schedule.shift_id,
        "shift_name": schedule.shift_name,
        "work_date": schedule.work_date.isoformat(),
        "start_time": schedule.start_time.isoformat() if schedule.start_time else None,
        "end_time": schedule.end_time.isoformat() if schedule.end_time else None,
        "location": schedule.location,
        "is_rest_day": schedule.is_rest_day,
        "is_public_holiday": schedule.is_public_holiday,
        "schedule_status": schedule.schedule_status,
        "remarks": schedule.remarks,
        "is_active": schedule.is_active,
    }


@router.put("/schedules/{schedule_id}")
def update_schedule(
    schedule_id: int,
    payload: ScheduleUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    schedule = db.query(ShiftSchedule).filter(ShiftSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if payload.shift_id is not None:
        schedule.shift_id = payload.shift_id
    if payload.shift_name is not None:
        schedule.shift_name = payload.shift_name
    if payload.work_date is not None:
        next_date = datetime.strptime(payload.work_date, "%Y-%m-%d").date()
        existing = db.query(ShiftSchedule).filter(
            ShiftSchedule.id != schedule_id,
            ShiftSchedule.user_id == schedule.user_id,
            ShiftSchedule.work_date == next_date,
            ShiftSchedule.is_active == True,
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Employee already has a schedule on this date")
        schedule.work_date = next_date
    if payload.start_time is not None:
        schedule.start_time = parse_time(payload.start_time)
    if payload.end_time is not None:
        schedule.end_time = parse_time(payload.end_time)
    if payload.location is not None:
        schedule.location = payload.location
    if payload.is_rest_day is not None:
        schedule.is_rest_day = payload.is_rest_day
    if payload.is_public_holiday is not None:
        schedule.is_public_holiday = payload.is_public_holiday
    if payload.schedule_status is not None:
        schedule.schedule_status = payload.schedule_status
    if payload.remarks is not None:
        schedule.remarks = payload.remarks
    if payload.is_active is not None:
        schedule.is_active = payload.is_active
    db.commit()
    db.refresh(schedule)
    return {"message": "Schedule updated"}


@router.delete("/schedules/{schedule_id}")
def delete_schedule(
    schedule_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    schedule = db.query(ShiftSchedule).filter(ShiftSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted"}


# ─── Dashboard Stats ────────────────────────────────────────────────

@router.get("/stats")
def shift_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    today = date.today()
    total_active = db.query(ShiftMaster).filter(ShiftMaster.is_active == True).count()
    today_assignments = db.query(ShiftSchedule).filter(
        ShiftSchedule.work_date == today,
        ShiftSchedule.is_active == True,
    ).count()
    from sqlalchemy import cast, String
    night_count = db.query(ShiftSchedule).filter(
        ShiftSchedule.work_date == today,
        ShiftSchedule.is_active == True,
        cast(ShiftSchedule.start_time, String) >= "18:00",
    ).count()
    conflicts = db.query(ShiftSchedule).filter(
        ShiftSchedule.work_date == today,
        ShiftSchedule.is_active == True,
    ).count()

    return {
        "total_active_shifts": total_active,
        "today_assignments": today_assignments,
        "night_shift_count": night_count,
        "schedule_conflicts": 0,
    }
