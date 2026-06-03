from datetime import date, datetime

from app.core.time_rules import (
    app_today,
    auto_checkout_time,
    standard_checkin_time,
    standard_checkout_time,
)
from app.models.attendance import Attendance
from app.models.request import Request
from sqlalchemy import and_, extract
from sqlalchemy.orm import Session


def compute_worked_hours(check_in: datetime, check_out: datetime) -> float:
    delta_hours = (check_out - check_in).total_seconds() / 3600
    return round(max(delta_hours, 0), 2)


def auto_checkout_open_records(db: Session, user_id: int | None = None) -> int:
    today = app_today()
    query = db.query(Attendance).filter(
        Attendance.check_in_time.isnot(None),
        Attendance.check_out_time.is_(None),
        Attendance.date < today,
    )
    if user_id is not None:
        query = query.filter(Attendance.user_id == user_id)

    open_rows = query.all()
    updated = 0
    for row in open_rows:
        row.check_out_time = auto_checkout_time()
        row.is_early_checkout = auto_checkout_time() < standard_checkout_time()
        row.worked_hours = compute_worked_hours(
            datetime.combine(row.date, row.check_in_time),
            datetime.combine(row.date, row.check_out_time),
        )
        row.remark = "system override"
        updated += 1

    if updated:
        db.commit()
    return updated


def validate_checkout_time(db: Session, user_id: int, target_date: date, requested_dt: datetime) -> tuple[bool, str | None]:
    if requested_dt.time() >= standard_checkout_time():
        return True, None

    approved_permission = (
        db.query(Request)
        .filter(
            Request.user_id == user_id,
            Request.date == target_date,
            Request.type.in_(["permission", "flexible"]),
            Request.status == "approved",
        )
        .first()
    )
    if approved_permission:
        return True, None

    return False, "Early checkout requires an approved permission request."


def is_late_checkin(checkin_dt: datetime) -> bool:
    return checkin_dt.time() > standard_checkin_time()


def is_early_checkout(checkout_dt: datetime) -> bool:
    return checkout_dt.time() < standard_checkout_time()


def month_stats(db: Session, user_id: int, year: int, month: int) -> dict:
    rows = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user_id,
            extract("year", Attendance.date) == year,
            extract("month", Attendance.date) == month,
        )
        .all()
    )

    total_worked_days = sum(1 for r in rows if r.check_in_time and r.check_out_time)
    total_late_days = sum(1 for r in rows if r.is_late)
    total_ot_hours = round(
        sum(
            max(
                (
                    datetime.combine(r.date, r.check_out_time)
                    - datetime.combine(r.date, standard_checkout_time())
                ).total_seconds()
                / 3600,
                0,
            )
            for r in rows
            if r.check_out_time
        ),
        2,
    )

    return {
        "total_worked_days": total_worked_days,
        "total_late_days": total_late_days,
        "total_ot_hours": total_ot_hours,
    }
