from datetime import datetime
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import extract
from sqlalchemy.orm import Session

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    ensure_user_in_scope,
    get_current_user,
    get_db,
    normalize_role,
    scoped_user_ids,
)
from app.core.time_rules import app_now, app_today, checkin_window, to_app_datetime
from app.models.attendance import Attendance
from app.models.company_location import CompanyLocation
from app.models.location_alert import LocationAlert
from app.models.user import User
from app.schemas.attendance import (
    AttendanceRecordOut,
    CheckInOutRequest,
    MonthlyAttendanceOut,
)
from app.services.attendance_service import (
    auto_checkout_open_records,
    compute_worked_hours,
    is_early_checkout,
    is_late_checkin,
    month_stats,
    validate_checkout_time,
)
from app.services.geo import haversine_distance_meters

router = APIRouter(prefix="/api/attendance", tags=["attendance"])


def validate_location_or_alert(
    db: Session,
    user: User,
    latitude: float,
    longitude: float,
    action_type: str,
) -> float:
    location = db.query(CompanyLocation).filter(CompanyLocation.id == 1).first()
    if not location:
        raise HTTPException(status_code=500, detail="Company location is not configured")

    distance = haversine_distance_meters(
        latitude,
        longitude,
        float(location.latitude),
        float(location.longitude),
    )

    if distance > location.radius_meters:
        alert = LocationAlert(
            user_id=user.id,
            date=app_today(),
            latitude=latitude,
            longitude=longitude,
            distance_meters=round(distance, 2),
            action_type=action_type,
            message="Outside allowed company radius",
        )
        db.add(alert)
        db.commit()
        raise HTTPException(status_code=400, detail="You are outside company premises.")

    return distance


def log_location_alert(
    db: Session,
    user: User,
    latitude: float | None,
    longitude: float | None,
    action_type: str,
    message: str,
    distance_meters: float | None = None,
) -> None:
    alert = LocationAlert(
        user_id=user.id,
        date=app_today(),
        latitude=latitude,
        longitude=longitude,
        distance_meters=round(distance_meters, 2) if distance_meters is not None else None,
        action_type=action_type,
        message=message,
    )
    db.add(alert)


@router.post("/flex-checkin")
def flexible_check_in(
    payload: CheckInOutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Flexible scan-based check-in.

    - Allows check-in outside the normal check-in window
    - If latitude/longitude are provided, logs outside-office scans
    - Marks the attendance row as a flexible scan
    - Late flexible check-ins require manager approval
    """
    auto_checkout_open_records(db, user.id)

    now = to_app_datetime(payload.timestamp)
    today = now.date()

    existing = db.query(Attendance).filter(Attendance.user_id == user.id, Attendance.date == today).first()
    if existing and existing.check_in_time and not existing.check_out_time:
        raise HTTPException(status_code=400, detail="Already checked in. Please checkout first.")

    if existing and existing.check_in_time and existing.check_out_time:
        raise HTTPException(status_code=400, detail="Attendance already completed for today.")

    # Flexible check-in is allowed outside the office, but the location is logged.
    if payload.latitude is not None and payload.longitude is not None:
        location = db.query(CompanyLocation).filter(CompanyLocation.id == 1).first()
        if location:
            distance = haversine_distance_meters(
                payload.latitude,
                payload.longitude,
                float(location.latitude),
                float(location.longitude),
            )
            if distance > location.radius_meters:
                log_location_alert(
                    db,
                    user,
                    payload.latitude,
                    payload.longitude,
                    "flex_checkin",
                    "Flexible check-in outside allowed company radius",
                    distance,
                )
        else:
            log_location_alert(
                db,
                user,
                payload.latitude,
                payload.longitude,
                "flex_checkin",
                "Flexible check-in without configured company location",
                0,
            )

    row = existing or Attendance(user_id=user.id, date=today)
    row.check_in_time = now.time().replace(microsecond=0)
    row.check_in_lat = payload.latitude
    row.check_in_lon = payload.longitude
    row.is_late = is_late_checkin(now)
    row.flexible_scan = True
    
    # NEW: Mark as pending manager approval for late flexible scans
    if row.is_late and row.flexible_scan:
        row.manager_approved = None  # NULL = pending
        row.needs_approval_reason = "Late flexible check-in"
        row.requires_manager_approval = True
        
    if not payload.latitude or not payload.longitude:
        row.remark = (row.remark or "") + "flexible scan (no location)"

    if not existing:
        db.add(row)
    db.commit()
    db.refresh(row)

    return {
        "message": "Flexible check-in successful", 
        "attendance_id": row.id, 
        "is_late": row.is_late,
        "requires_approval": row.requires_manager_approval if hasattr(row, 'requires_manager_approval') else False
    }


@router.post("/checkin")
def check_in(
    payload: CheckInOutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auto_checkout_open_records(db, user.id)

    now = to_app_datetime(payload.timestamp)
    start, end = checkin_window()
    if now.time() < start or now.time() > end:
        raise HTTPException(status_code=400, detail="Check-in is not allowed at this time.")

    today = now.date()
    existing = db.query(Attendance).filter(Attendance.user_id == user.id, Attendance.date == today).first()
    if existing and existing.check_in_time and not existing.check_out_time:
        raise HTTPException(status_code=400, detail="Already checked in. Please checkout first.")

    if existing and existing.check_in_time and existing.check_out_time:
        raise HTTPException(status_code=400, detail="Attendance already completed for today.")

    if payload.latitude is None or payload.longitude is None:
        raise HTTPException(status_code=400, detail="Location permission is required for check-in.")

    validate_location_or_alert(db, user, payload.latitude, payload.longitude, "checkin")

    row = existing or Attendance(user_id=user.id, date=today)
    row.check_in_time = now.time().replace(microsecond=0)
    row.check_in_lat = payload.latitude
    row.check_in_lon = payload.longitude
    row.is_late = is_late_checkin(now)
    
    # Normal check-in doesn't require approval
    row.requires_manager_approval = False
    row.manager_approved = True  # Auto-approved

    if not existing:
        db.add(row)
    db.commit()
    db.refresh(row)

    return {"message": "Check-in successful", "attendance_id": row.id, "is_late": row.is_late}


@router.post("/checkout")
def check_out(
    payload: CheckInOutRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    now = to_app_datetime(payload.timestamp)
    today = now.date()

    row = db.query(Attendance).filter(Attendance.user_id == user.id, Attendance.date == today).first()
    if not row or not row.check_in_time:
        raise HTTPException(status_code=400, detail="No check-in found for today.")

    ok, err = validate_checkout_time(db, user.id, today, now)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    if payload.latitude is not None and payload.longitude is not None:
        validate_location_or_alert(db, user, payload.latitude, payload.longitude, "checkout")
    else:
        row.remark = (row.remark or "") + " checkout scan (no location)"

    row.check_out_time = now.time().replace(microsecond=0)
    row.check_out_lat = payload.latitude
    row.check_out_lon = payload.longitude
    row.is_early_checkout = is_early_checkout(now)
    row.worked_hours = compute_worked_hours(
        datetime.combine(today, row.check_in_time),
        datetime.combine(today, row.check_out_time),
    )

    db.commit()
    db.refresh(row)

    return {
        "message": "Check-out updated" if row.check_out_time else "Check-out successful",
        "attendance_id": row.id,
        "is_early_checkout": row.is_early_checkout,
        "worked_hours": float(row.worked_hours or 0),
    }


@router.get("/daily", response_model=AttendanceRecordOut | None)
def daily_record(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auto_checkout_open_records(db, user.id)
    row = db.query(Attendance).filter(Attendance.user_id == user.id, Attendance.date == app_today()).first()
    return row


@router.get("/monthly", response_model=MonthlyAttendanceOut)
def monthly_record(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auto_checkout_open_records(db, user.id)
    rows = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user.id,
            extract("year", Attendance.date) == year,
            extract("month", Attendance.date) == month,
        )
        .order_by(Attendance.date.asc())
        .all()
    )
    stats = month_stats(db, user.id, year, month)
    return MonthlyAttendanceOut(records=rows, **stats)


@router.get("/monthly/export")
def monthly_record_export(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    auto_checkout_open_records(db, user.id)
    rows = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user.id,
            extract("year", Attendance.date) == year,
            extract("month", Attendance.date) == month,
        )
        .order_by(Attendance.date.asc())
        .all()
    )
    stats = month_stats(db, user.id, year, month)

    workbook = Workbook()
    sheet = workbook.active
    sheet.title = f"Attendance-{year}-{month:02d}"

    headers = [
        "Date",
        "Check In",
        "Check Out",
        "Late",
        "Early Checkout",
        "Worked Hours",
        "Check In Lat",
        "Check In Lon",
        "Check Out Lat",
        "Check Out Lon",
        "Requires Approval",
        "Manager Approved",
        "Remark",
    ]
    sheet.append(headers)

    for row in rows:
        sheet.append(
            [
                row.date.isoformat(),
                row.check_in_time.isoformat() if row.check_in_time else "",
                row.check_out_time.isoformat() if row.check_out_time else "",
                "Y" if row.is_late else "N",
                "Y" if row.is_early_checkout else "N",
                float(row.worked_hours) if row.worked_hours is not None else "",
                float(row.check_in_lat) if row.check_in_lat is not None else "",
                float(row.check_in_lon) if row.check_in_lon is not None else "",
                float(row.check_out_lat) if row.check_out_lat is not None else "",
                float(row.check_out_lon) if row.check_out_lon is not None else "",
                "Y" if hasattr(row, 'requires_manager_approval') and row.requires_manager_approval else "N",
                "Y" if hasattr(row, 'manager_approved') and row.manager_approved else "N" if hasattr(row, 'manager_approved') and row.manager_approved is not None else "Pending",
                row.remark or "",
            ]
        )

    summary_sheet = workbook.create_sheet("Summary")
    summary_sheet.append(["Metric", "Value"])
    summary_sheet.append(["Total Worked Days", stats["total_worked_days"]])
    summary_sheet.append(["Total Late Days", stats["total_late_days"]])
    summary_sheet.append(["Total OT Hours", stats["total_ot_hours"]])
    
    # Add approval stats
    pending_approvals = sum(1 for row in rows if hasattr(row, 'requires_manager_approval') and row.requires_manager_approval and row.manager_approved is None)
    summary_sheet.append(["Pending Manager Approvals", pending_approvals])

    output = BytesIO()
    workbook.save(output)
    output.seek(0)

    filename = f"attendance_{year}_{month:02d}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ==================== LINE MANAGER ENDPOINTS ====================

@router.post("/manager-approval/{attendance_id}")
def manager_approve_attendance(
    attendance_id: int,
    approve: bool,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Line Manager endpoint to approve/reject attendance records"""
    
    role = normalize_role(current_user.role)
    if role not in [LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE]:
        raise HTTPException(status_code=403, detail="Only line managers can approve attendance")
    
    attendance = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not attendance:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    ensure_user_in_scope(db, current_user, attendance.user_id)
    
    if approve:
        attendance.manager_approved = True
        attendance.manager_approved_at = app_now()
        attendance.manager_approved_by = current_user.id
        attendance.requires_manager_approval = False
        message = "Attendance approved"
    else:
        attendance.manager_approved = False
        message = "Attendance rejected"
    
    db.commit()
    
    return {"message": message, "attendance_id": attendance_id}


@router.get("/pending-approvals")
def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get attendance records pending line manager approval"""
    
    role = normalize_role(current_user.role)
    if role not in [LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = db.query(Attendance).filter(
        Attendance.manager_approved.is_(None),  # Not yet approved/rejected
        Attendance.requires_manager_approval == True,  # Needs approval
    )
    
    user_ids = scoped_user_ids(db, current_user, include_self=True)
    query = query.filter(Attendance.user_id.in_(user_ids))
    
    pending = query.order_by(Attendance.date.desc()).all()
    
    # Add employee details to response
    result = []
    for record in pending:
        result.append({
            "id": record.id,
            "date": record.date.isoformat(),
            "check_in_time": record.check_in_time.isoformat() if record.check_in_time else None,
            "employee_name": record.user.name if record.user else "",
            "employee_id": record.user.id,
            "is_late": record.is_late,
            "flexible_scan": record.flexible_scan,
            "needs_approval_reason": record.needs_approval_reason if hasattr(record, 'needs_approval_reason') else "Flexible scan",
            "check_in_lat": float(record.check_in_lat) if record.check_in_lat is not None else None,
            "check_in_lon": float(record.check_in_lon) if record.check_in_lon is not None else None,
        })
    
    return {"pending_approvals": result, "count": len(result)}


@router.get("/team-attendance")
def get_team_attendance(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Line Manager endpoint to view team attendance"""
    
    role = normalize_role(current_user.role)
    if role not in [LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    user_ids = scoped_user_ids(db, current_user, include_self=True)
    
    # Get attendance records for team
    attendance_records = (
        db.query(Attendance)
        .filter(
            Attendance.user_id.in_(user_ids),
            extract("year", Attendance.date) == year,
            extract("month", Attendance.date) == month,
        )
        .order_by(Attendance.date.asc(), Attendance.user_id)
        .all()
    )
    
    # Group by user
    team_attendance = {}
    for record in attendance_records:
        user = db.query(User).filter(User.id == record.user_id).first()
        if user.email not in team_attendance:
            team_attendance[user.email] = {
                "user_id": user.id,
                "user_name": user.name if user else "",
                "records": []
            }
        team_attendance[user.email]["records"].append({
            "date": record.date.isoformat(),
            "check_in": record.check_in_time.isoformat() if record.check_in_time else None,
            "check_out": record.check_out_time.isoformat() if record.check_out_time else None,
            "is_late": record.is_late,
            "worked_hours": float(record.worked_hours) if record.worked_hours else 0,
            "requires_approval": record.requires_manager_approval if hasattr(record, 'requires_manager_approval') else False,
            "approved": record.manager_approved if hasattr(record, 'manager_approved') else None,
        })
    
    return {"team_attendance": team_attendance, "year": year, "month": month}


# ==================== SWAP ATTENDANCE ENDPOINTS ====================

@router.post("/create-from-swap")
def create_attendance_from_swap(
    swap_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """Server-side creation of attendance records when a swap is accepted"""
    
    from app.models.swap_request import SwapRequest  # Import here to avoid circular
    
    # Check authorization
    role = normalize_role(admin_user.role)
    if role not in [LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    if swap.status != "approved":
        raise HTTPException(status_code=400, detail="Swap has not been approved yet")
    
    # Check if attendance already created
    if hasattr(swap, 'attendance_created') and swap.attendance_created:
        raise HTTPException(status_code=400, detail="Attendance already recorded for this swap")
    
    # Create attendance for the person taking the shift
    new_attendance = Attendance(
        user_id=swap.receiving_user_id,  # Person taking the shift
        date=swap.swap_date,
        check_in_time=swap.original_shift_start.time() if hasattr(swap.original_shift_start, 'time') else swap.original_shift_start,
        check_out_time=swap.original_shift_end.time() if hasattr(swap.original_shift_end, 'time') else swap.original_shift_end,
        worked_hours=compute_worked_hours(
            datetime.combine(swap.swap_date, swap.original_shift_start.time() if hasattr(swap.original_shift_start, 'time') else swap.original_shift_start),
            datetime.combine(swap.swap_date, swap.original_shift_end.time() if hasattr(swap.original_shift_end, 'time') else swap.original_shift_end),
        ),
        flexible_scan=False,
        requires_manager_approval=False,
        manager_approved=True,  # Auto-approved for swaps
        remark=f"Attendance from approved swap #{swap_id}"
    )
    
    db.add(new_attendance)
    
    # Mark original attendance as swapped (if exists)
    original_attendance = db.query(Attendance).filter(
        Attendance.user_id == swap.requesting_user_id,
        Attendance.date == swap.swap_date
    ).first()
    
    if original_attendance:
        original_attendance.swapped_out = True
        original_attendance.remark = (original_attendance.remark or "") + f" [Swapped to user {swap.receiving_user_id}]"
    
    # Update swap record
    swap.attendance_created = True
    swap.attendance_created_at = app_now()
    swap.attendance_created_by = admin_user.id
    swap.attendance_id = new_attendance.id
    
    db.commit()
    db.refresh(new_attendance)
    
    return {
        "message": "Attendance created from swap",
        "attendance_id": new_attendance.id,
        "swap_id": swap_id,
        "user_id": swap.receiving_user_id
    }


@router.delete("/swap-attendance/{swap_id}")
def revert_swap_attendance(
    swap_id: int,
    db: Session = Depends(get_db),
    admin_user: User = Depends(get_current_user),
):
    """Revert attendance created from a swap (if swap is cancelled)"""
    
    from app.models.swap_request import SwapRequest
    
    role = normalize_role(admin_user.role)
    if role not in [LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    swap = db.query(SwapRequest).filter(SwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    # Find and delete attendance created from this swap
    attendance = db.query(Attendance).filter(Attendance.id == swap.attendance_id).first() if hasattr(swap, 'attendance_id') and swap.attendance_id else None
    
    if attendance:
        # Restore original attendance if it was swapped out
        original_attendance = db.query(Attendance).filter(
            Attendance.user_id == swap.requesting_user_id,
            Attendance.date == swap.swap_date
        ).first()
        
        if original_attendance:
            original_attendance.swapped_out = False
            original_attendance.remark = original_attendance.remark.replace(f" [Swapped to user {swap.receiving_user_id}]", "") if original_attendance.remark else ""
        
        db.delete(attendance)
    
    # Update swap record
    swap.attendance_created = False
    swap.attendance_created_at = None
    swap.attendance_created_by = None
    swap.attendance_id = None
    swap.status = "cancelled"
    
    db.commit()
    
    return {"message": "Swap attendance reverted successfully"}
