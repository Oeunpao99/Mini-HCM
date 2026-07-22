import json
from io import BytesIO
from pathlib import Path
from uuid import uuid4
from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from PIL import Image, UnidentifiedImageError
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    PAYROLL_OFFICER_ROLE,
    STAFF_ROLE,
    get_current_user,
    get_db,
    normalize_role,
    require_roles,
    scoped_user_ids,
)
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.app_setting import AppSetting
from app.models.attendance.models import Attendance
from app.models.hris import (
    CareerDevelopment,
    CompetencyAssessment,
    EmployeeHistory,
    EmployeeMovementRequest,
    EmployeeProfile,
    KpiMonitoring,
    KpiPlan,
    KpiRecord,
    PayrollRecord,
    PerformanceImprovementPlan,
    PerformanceReview,
    PublicHoliday,
    ScheduleChange,
    ShiftSchedule,
    TrainingPlan,
    TrainingRecord,
)
from app.models.request import Request
from app.models.user import User
from app.schemas.hris import (
    CompetencyAssessmentIn,
    EmployeeCreateIn,
    EmployeeHistoryIn,
    HrisLookupSettingsIn,
    EmployeeMovementRequestIn,
    EmployeeMovementReviewIn,
    HrisEmployeeProfileIn,
    KpiRecordIn,
    PayrollGenerateIn,
    PayrollRecordIn,
    PayrollStatusIn,
    PerformanceReviewIn,
    PublicHolidayIn,
    ScheduleChangeIn,
    SelfProfileUpdateIn,
    ShiftScheduleIn,
    TrainingPlanIn,
    TrainingRecordIn,
)

router = APIRouter(prefix="/api/hris", tags=["hris"])

HRIS_ROLES = (LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE)
PAYROLL_ROLES = (MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE)
USER_ROLES = {"staff", "line_manager", "department_head", "management_hr", "payroll_officer"}
PAYROLL_STATUSES = {"draft", "submitted", "approved", "rejected", "paid"}
PAYROLL_EDITABLE_STATUSES = {"draft", "rejected"}
MOVEMENT_TYPES = {
    "promotion",
    "transfer",
    "sub_department_change",
    "job_grade_change",
    "salary_increase",
    "salary_change",
    "contract_change",
    "status_change",
}
MOVEMENT_STATUSES = {"pending", "approved", "rejected"}
HRIS_LOOKUP_SETTING_KEY = "hris_lookup_settings"
DEFAULT_HRIS_LOOKUPS = {
    "departments": ["Human Resources", "Operations", "Finance", "Sales", "IT", "Developer"],
    "sub_departments": ["Recruitment", "Payroll", "Administration", "Support", "AI", "Web Developer"],
    "positions": ["HR Officer", "Senior HR Officer", "Accountant", "Team Lead", "Staff"],
    "job_grades": ["G1", "G2", "G3", "G4", "M1"],
    "employment_statuses": ["active", "on_leave", "inactive", "resigned"],
}
STANDARD_DAILY_HOURS = Decimal("8")
STANDARD_MONTHLY_DAYS = Decimal("22")
OVERTIME_MULTIPLIER = Decimal("1.50")
NSSF_RATE = Decimal("0.02")
TAX_RATE = Decimal("0.05")
TAX_EXEMPTION_THRESHOLD = Decimal("1200.00")


def _money(value) -> float:
    return float(value or 0)


def _scope_ids(db: Session, actor: User, include_self: bool = False) -> list[int]:
    return scoped_user_ids(db, actor, include_self=include_self)


def _ensure_target_in_scope(db: Session, actor: User, user_id: int) -> None:
    if normalize_role(actor.role) in {MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE}:
        return
    if user_id not in _scope_ids(db, actor, include_self=True):
        raise HTTPException(status_code=403, detail="Employee is outside your HRIS scope")


def _profile_payload(profile: EmployeeProfile) -> dict:
    user = profile.user
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "emp_code": user.emp_code,
        "name": user.name,
        "email": user.email,
        "department": user.department,
        "role": normalize_role(user.role),
        "phone": profile.phone,
        "address": profile.address,
        "position": profile.position,
        "sub_department": profile.sub_department,
        "job_grade": profile.job_grade,
        "contract_type": profile.contract_type,
        "contract_start_date": profile.contract_start_date,
        "contract_end_date": profile.contract_end_date,
        "basic_salary": _money(profile.basic_salary),
        "bank_account": profile.bank_account,
        "profile_photo": profile.profile_photo,
        "status": profile.employment_status,
    }


def _self_profile_payload(profile: EmployeeProfile | None) -> dict | None:
    if not profile:
        return None
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "phone": profile.phone,
        "personal_email": profile.personal_email,
        "address": profile.address,
        "permanent_address": profile.permanent_address,
        "emergency_contact_name": profile.emergency_contact_name,
        "emergency_contact_relation": profile.emergency_contact_relation,
        "emergency_contact_phone": profile.emergency_contact_phone,
        "profile_photo": profile.profile_photo,
        "position": profile.position,
        "sub_department": profile.sub_department,
        "job_grade": profile.job_grade,
        "contract_type": profile.contract_type,
        "contract_start_date": profile.contract_start_date,
        "contract_end_date": profile.contract_end_date,
        "basic_salary": _money(profile.basic_salary),
        "bank_account": profile.bank_account,
        "status": profile.employment_status,
    }


def _save_profile_photo(content: bytes, user_id: int) -> tuple[str, Path]:
    if not content:
        raise HTTPException(status_code=422, detail="Choose a profile photo to upload")
    if len(content) > settings.profile_photo_max_bytes:
        raise HTTPException(status_code=413, detail="Profile photo must be 5 MB or smaller")

    try:
        image = Image.open(BytesIO(content))
        image_format = image.format
        if image_format not in {"JPEG", "PNG"}:
            raise HTTPException(status_code=422, detail="Profile photos must be JPEG or PNG images")
        if not image.width or not image.height or image.width * image.height > settings.profile_photo_max_pixels:
            raise HTTPException(status_code=422, detail="Profile photo dimensions are too large")
        image.verify()
        image = Image.open(BytesIO(content))
        image.load()
    except HTTPException:
        raise
    except (Image.DecompressionBombError, OSError, UnidentifiedImageError) as exc:
        raise HTTPException(status_code=422, detail="Upload a valid JPEG or PNG image") from exc

    extension = "jpg" if image_format == "JPEG" else "png"
    filename = f"{user_id}-{uuid4().hex}.{extension}"
    photo_directory = Path(settings.media_dir) / "profile-photos"
    photo_directory.mkdir(parents=True, exist_ok=True)
    destination = photo_directory / filename

    if image_format == "JPEG":
        image.convert("RGB").save(destination, format="JPEG", quality=90, optimize=True)
    else:
        image.save(destination, format="PNG", optimize=True)

    return f"/api/media/profile-photos/{filename}", destination


def _delete_previous_profile_photo(previous_photo: str | None, destination: Path) -> None:
    if not previous_photo or not previous_photo.startswith("/api/media/profile-photos/"):
        return
    previous_path = destination.parent / Path(previous_photo).name
    if previous_path != destination and previous_path.is_file():
        previous_path.unlink()


def _movement_payload(row: EmployeeMovementRequest) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "employee_code": row.user.emp_code if row.user else None,
        "requested_by": row.requested_by,
        "requested_by_name": row.requester.name if row.requester else None,
        "reviewed_by": row.reviewed_by,
        "reviewed_by_name": row.reviewer.name if row.reviewer else None,
        "movement_type": row.movement_type,
        "effective_date": row.effective_date,
        "current_position": row.current_position,
        "proposed_position": row.proposed_position,
        "current_department": row.current_department,
        "proposed_department": row.proposed_department,
        "current_sub_department": row.current_sub_department,
        "proposed_sub_department": row.proposed_sub_department,
        "current_job_grade": row.current_job_grade,
        "proposed_job_grade": row.proposed_job_grade,
        "current_salary": _money(row.current_salary),
        "proposed_salary": _money(row.proposed_salary),
        "current_contract_type": row.current_contract_type,
        "proposed_contract_type": row.proposed_contract_type,
        "current_status": row.current_status,
        "proposed_status": row.proposed_status,
        "reason": row.reason,
        "status": row.status,
        "review_remarks": row.review_remarks,
        "reviewed_at": row.reviewed_at,
        "created_at": row.created_at,
    }


def _movement_description(row: EmployeeMovementRequest) -> str:
    changes = []
    if row.proposed_position and row.proposed_position != row.current_position:
        changes.append(f"position from {row.current_position or '-'} to {row.proposed_position}")
    if row.proposed_department and row.proposed_department != row.current_department:
        changes.append(f"department from {row.current_department or '-'} to {row.proposed_department}")
    if row.proposed_sub_department and row.proposed_sub_department != row.current_sub_department:
        changes.append(f"subdepartment from {row.current_sub_department or '-'} to {row.proposed_sub_department}")
    if row.proposed_job_grade and row.proposed_job_grade != row.current_job_grade:
        changes.append(f"job grade from {row.current_job_grade or '-'} to {row.proposed_job_grade}")
    if row.proposed_salary is not None and Decimal(row.proposed_salary or 0) != Decimal(row.current_salary or 0):
        changes.append(f"salary from ${_money(row.current_salary):,.2f} to ${_money(row.proposed_salary):,.2f}")
    if row.proposed_contract_type and row.proposed_contract_type != row.current_contract_type:
        changes.append(f"contract from {row.current_contract_type or '-'} to {row.proposed_contract_type}")
    if row.proposed_status and row.proposed_status != row.current_status:
        changes.append(f"status from {row.current_status or '-'} to {row.proposed_status}")
    summary = "; ".join(changes) or "Movement approved"
    if row.reason:
        return f"{summary}. Reason: {row.reason}"
    return summary


def _next_emp_code(db: Session) -> str:
    codes = [row.emp_code for row in db.query(User.emp_code).filter(User.emp_code.like("EMP%")).all()]
    numbers = []
    for code in codes:
        suffix = str(code or "")[3:]
        if suffix.isdigit():
            numbers.append(int(suffix))
    return f"EMP{(max(numbers, default=0) + 1):03d}"


def _clean_text(value: str | None) -> str:
    return str(value or "").strip()


def _unique_clean_list(values: list[str] | None) -> list[str]:
    seen = set()
    result = []
    for value in values or []:
        cleaned = _clean_text(value)
        key = cleaned.lower()
        if not cleaned or key in seen:
            continue
        seen.add(key)
        result.append(cleaned)
    return result


def _lookup_payload(db: Session) -> dict:
    setting = db.query(AppSetting).filter(AppSetting.key == HRIS_LOOKUP_SETTING_KEY).first()
    payload = DEFAULT_HRIS_LOOKUPS.copy()
    if setting:
        try:
            saved = json.loads(setting.value)
            if isinstance(saved, dict):
                payload.update(saved)
        except json.JSONDecodeError:
            pass
    return {key: _unique_clean_list(payload.get(key)) for key in DEFAULT_HRIS_LOOKUPS}


def _payroll_payload(row: PayrollRecord) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_name": row.user.name,
        "department": row.user.department,
        "period_year": row.period_year,
        "period_month": row.period_month,
        "basic_salary": _money(row.basic_salary),
        "overtime_amount": _money(row.overtime_amount),
        "allowances": _money(row.allowances),
        "bonus": _money(row.bonus),
        "benefits": _money(row.benefits),
        "salary_adjustment": _money(row.salary_adjustment),
        "tax_deduction": _money(row.tax_deduction),
        "nssf_deduction": _money(row.nssf_deduction),
        "other_deductions": _money(row.other_deductions),
        "gross_pay": _money(row.gross_pay),
        "net_pay": _money(row.net_pay),
        "status": row.status,
    }


def _history_payload(row: EmployeeHistory) -> dict:
    return {
        "id": row.id,
        "event_type": row.event_type,
        "title": row.title,
        "description": row.description,
        "effective_date": row.effective_date,
    }


def _performance_payload(row: PerformanceReview) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "department": row.user.department if row.user else None,
        "position": row.user.profile.position if row.user and row.user.profile else None,
        "review_period": row.review_period,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "reviewer_id": row.reviewer_id,
        "reviewer_name": row.reviewer.name if row.reviewer else None,
        "score": _money(row.total_score) if row.total_score else None,
        "rating": row.performance_rating,
        "comments": row.manager_comments,
        "status": row.review_status,
        "kpi_score": _money(row.kpi_score) if row.kpi_score else None,
        "kpi_weight": _money(row.kpi_weight) if row.kpi_weight else None,
        "competency_score": _money(row.competency_score) if row.competency_score else None,
        "behavior_score": _money(row.behavior_score) if row.behavior_score else None,
        "attendance_score": _money(row.attendance_score) if row.attendance_score else None,
        "total_score": _money(row.total_score) if row.total_score else None,
        "performance_rating": row.performance_rating,
        "self_assessment": row.self_assessment,
        "manager_comments": row.manager_comments,
        "strengths": row.strengths,
        "improvement_areas": row.improvement_areas,
        "development_action_plan": row.development_action_plan,
        "promotion_recommendation": row.promotion_recommendation,
        "salary_increment_recommendation": row.salary_increment_recommendation,
        "pip_required": row.pip_required,
        "review_status": row.review_status or "Draft",
        "final_decision": row.final_decision,
        "remarks": row.remarks,
        "reviewed_at": row.created_at,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _training_payload(row: TrainingRecord) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "title": row.title,
        "provider": row.provider,
        "start_date": row.training_date,
        "end_date": row.end_date,
        "status": row.status,
        "score": float(row.score) if row.score is not None else None,
        "created_at": row.created_at,
    }


def _apply_payroll_totals(row: PayrollRecord) -> None:
    gross = (
        Decimal(row.basic_salary or 0)
        + Decimal(row.overtime_amount or 0)
        + Decimal(row.allowances or 0)
        + Decimal(row.bonus or 0)
        + Decimal(row.benefits or 0)
        + Decimal(row.salary_adjustment or 0)
    )
    deductions = (
        Decimal(row.tax_deduction or 0)
        + Decimal(row.nssf_deduction or 0)
        + Decimal(row.other_deductions or 0)
    )
    row.gross_pay = gross
    row.net_pay = gross - deductions


def _cents(value: Decimal) -> Decimal:
    return Decimal(value or 0).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _calculate_nssf(basic_salary: Decimal) -> Decimal:
    return _cents(Decimal(basic_salary or 0) * NSSF_RATE)


def _calculate_tax(gross_pay: Decimal) -> Decimal:
    gross = Decimal(gross_pay or 0)
    if gross < TAX_EXEMPTION_THRESHOLD:
        return Decimal("0.00")
    return _cents(gross * TAX_RATE)


def _attendance_overtime_amount(db: Session, user_id: int, year: int, month: int, basic_salary: Decimal) -> Decimal:
    _, last_day = monthrange(year, month)
    start_date = date(year, month, 1)
    end_date = date(year, month, last_day)
    rows = (
        db.query(Attendance)
        .filter(
            Attendance.user_id == user_id,
            Attendance.date >= start_date,
            Attendance.date <= end_date,
            Attendance.worked_hours.isnot(None),
        )
        .all()
    )
    overtime_hours = sum(
        max(Decimal(row.worked_hours or 0) - STANDARD_DAILY_HOURS, Decimal("0"))
        for row in rows
    )
    if overtime_hours <= 0:
        return Decimal("0.00")
    hourly_rate = Decimal(basic_salary or 0) / STANDARD_MONTHLY_DAYS / STANDARD_DAILY_HOURS
    return _cents(overtime_hours * hourly_rate * OVERTIME_MULTIPLIER)


def _build_payroll_record(
    db: Session,
    profile: EmployeeProfile,
    year: int,
    month: int,
    allowances: Decimal = Decimal("0"),
    bonus: Decimal = Decimal("0"),
    benefits: Decimal = Decimal("0"),
    salary_adjustment: Decimal = Decimal("0"),
    other_deductions: Decimal = Decimal("0"),
    status: str = "draft",
) -> PayrollRecord:
    basic_salary = Decimal(profile.basic_salary or 0)
    overtime_amount = _attendance_overtime_amount(db, profile.user_id, year, month, basic_salary)
    row = PayrollRecord(
        user_id=profile.user_id,
        period_year=year,
        period_month=month,
        basic_salary=basic_salary,
        overtime_amount=overtime_amount,
        allowances=allowances,
        bonus=bonus,
        benefits=benefits,
        salary_adjustment=salary_adjustment,
        nssf_deduction=_calculate_nssf(basic_salary),
        other_deductions=other_deductions,
        status=status,
    )
    _apply_payroll_totals(row)
    row.tax_deduction = _calculate_tax(Decimal(row.gross_pay or 0))
    _apply_payroll_totals(row)
    return row


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    today = date.today()
    total_employees = db.query(User).filter(User.id.in_(user_ids)).count()
    active_profiles = (
        db.query(EmployeeProfile)
        .filter(EmployeeProfile.user_id.in_(user_ids), func.lower(EmployeeProfile.employment_status) == "active")
        .count()
    )
    present_today = (
        db.query(Attendance)
        .filter(Attendance.user_id.in_(user_ids), Attendance.date == today, Attendance.check_in_time.isnot(None))
        .count()
    )
    late_today = db.query(Attendance).filter(Attendance.user_id.in_(user_ids), Attendance.date == today, Attendance.is_late == True).count()
    pending_requests = (
        db.query(Request).filter(Request.user_id.in_(user_ids), Request.status == "pending").count()
    )
    payroll_total = (
        db.query(func.coalesce(func.sum(PayrollRecord.net_pay), 0))
        .filter(PayrollRecord.user_id.in_(user_ids))
        .scalar()
    )
    training_open = (
        db.query(TrainingRecord)
        .filter(
            TrainingRecord.user_id.in_(user_ids),
            TrainingRecord.status == "Draft",
            TrainingRecord.completion_status.in_(["In Progress", "Not Completed"]),
        )
        .count()
    )
    attendance_rate = round((present_today / total_employees) * 100, 2) if total_employees else 0

    return {
        "total_employees": total_employees,
        "active_profiles": active_profiles,
        "present_today": present_today,
        "late_today": late_today,
        "pending_requests": pending_requests,
        "attendance_rate": attendance_rate,
        "payroll_total": _money(payroll_total),
        "training_open": training_open,
    }


@router.get("/lookup-settings")
def get_lookup_settings(
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    return _lookup_payload(db)


@router.put("/lookup-settings")
def update_lookup_settings(
    payload: HrisLookupSettingsIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    data = {
        "departments": _unique_clean_list(payload.departments),
        "sub_departments": _unique_clean_list(payload.sub_departments),
        "positions": _unique_clean_list(payload.positions),
        "job_grades": _unique_clean_list(payload.job_grades),
        "employment_statuses": _unique_clean_list(payload.employment_statuses),
    }
    setting = db.query(AppSetting).filter(AppSetting.key == HRIS_LOOKUP_SETTING_KEY).first()
    if setting:
        setting.value = json.dumps(data)
    else:
        db.add(AppSetting(key=HRIS_LOOKUP_SETTING_KEY, value=json.dumps(data)))
    db.commit()
    return data


@router.get("/employees")
def employees(
    department: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    query = (
        db.query(EmployeeProfile)
        .join(User, EmployeeProfile.user_id == User.id)
        .filter(EmployeeProfile.user_id.in_(user_ids))
    )
    if department:
        query = query.filter(User.department == department)
    return [_profile_payload(row) for row in query.order_by(User.name.asc()).all()]


@router.get("/my-profile")
def my_profile(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == actor.id).first()
    manager = db.query(User).filter(User.id == actor.manager_id).first() if actor.manager_id else None
    histories = (
        db.query(EmployeeHistory)
        .filter(EmployeeHistory.user_id == actor.id)
        .order_by(EmployeeHistory.effective_date.desc(), EmployeeHistory.created_at.desc())
        .all()
    )
    performance_rows = (
        db.query(PerformanceReview)
        .filter(PerformanceReview.user_id == actor.id)
        .order_by(PerformanceReview.created_at.desc())
        .all()
    )
    payslips = (
        db.query(PayrollRecord)
        .filter(PayrollRecord.user_id == actor.id, PayrollRecord.status.in_(["approved", "paid"]))
        .order_by(PayrollRecord.period_year.desc(), PayrollRecord.period_month.desc())
        .all()
    )
    training_rows = (
        db.query(TrainingRecord)
        .filter(TrainingRecord.user_id == actor.id)
        .order_by(TrainingRecord.training_date.desc(), TrainingRecord.created_at.desc())
        .all()
    )

    return {
        "user": {
            "id": actor.id,
            "emp_code": actor.emp_code,
            "name": actor.name,
            "email": actor.email,
            "role": normalize_role(actor.role),
            "department": actor.department,
            "manager_id": actor.manager_id,
            "created_at": actor.created_at,
        },
        "profile": _self_profile_payload(profile),
        "manager": {
            "id": manager.id,
            "emp_code": manager.emp_code,
            "name": manager.name,
            "email": manager.email,
            "role": normalize_role(manager.role),
            "department": manager.department,
        } if manager else None,
        "history": [_history_payload(row) for row in histories],
        "performance": [_performance_payload(row) for row in performance_rows],
        "payslips": [_payroll_payload(row) for row in payslips],
        "training": [_training_payload(row) for row in training_rows],
    }


@router.patch("/my-profile")
def update_my_profile(
    payload: SelfProfileUpdateIn,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=422, detail="Provide at least one profile field to update")

    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == actor.id).first()
    if not profile:
        profile = EmployeeProfile(user_id=actor.id)
        db.add(profile)

    for field, value in changes.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return {"profile": _self_profile_payload(profile)}


@router.post("/my-profile/photo")
async def upload_my_profile_photo(
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    content = await photo.read(settings.profile_photo_max_bytes + 1)
    profile_photo, destination = _save_profile_photo(content, actor.id)

    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == actor.id).first()
    if not profile:
        profile = EmployeeProfile(user_id=actor.id)
        db.add(profile)
        db.flush()

    previous_photo = profile.profile_photo
    profile.profile_photo = profile_photo
    db.commit()
    db.refresh(profile)

    _delete_previous_profile_photo(previous_photo, destination)

    return {"profile_photo": profile.profile_photo}


@router.post("/employees")
def upsert_employee_profile(
    payload: HrisEmployeeProfileIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    if not db.query(User).filter(User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == payload.user_id).first()
    if not profile:
        profile = EmployeeProfile(user_id=payload.user_id)
        db.add(profile)

    for field, value in payload.model_dump().items():
        if field == "status":
            profile.employment_status = value
        else:
            setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return _profile_payload(profile)


@router.post("/employees/{user_id}/photo")
async def upload_employee_profile_photo(
    user_id: int,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    if not db.query(User).filter(User.id == user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    content = await photo.read(settings.profile_photo_max_bytes + 1)
    profile_photo, destination = _save_profile_photo(content, user_id)

    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user_id)
        db.add(profile)
        db.flush()

    previous_photo = profile.profile_photo
    profile.profile_photo = profile_photo
    db.commit()
    db.refresh(profile)
    _delete_previous_profile_photo(previous_photo, destination)
    return {"profile_photo": profile.profile_photo}


@router.post("/employees/new")
def create_employee(
    payload: EmployeeCreateIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    first_name = _clean_text(payload.first_name)
    last_name = _clean_text(payload.last_name)
    email = _clean_text(payload.email).lower()
    password = _clean_text(payload.password)
    role = normalize_role(payload.role) or STAFF_ROLE

    if not first_name or not last_name:
        raise HTTPException(status_code=400, detail="First name and last name are required")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if not password:
        raise HTTPException(status_code=400, detail="Temporary password is required")
    if role not in USER_ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if db.query(User).filter(func.lower(User.email) == email).first():
        raise HTTPException(status_code=409, detail="Email is already used by another employee")
    if payload.manager_id and not db.query(User).filter(User.id == payload.manager_id).first():
        raise HTTPException(status_code=404, detail="Manager not found")

    user = User(
        emp_code=_next_emp_code(db),
        name=f"{first_name} {last_name}",
        email=email,
        password_hash=get_password_hash(password),
        role=role,
        department=_clean_text(payload.department) or None,
        manager_id=payload.manager_id,
    )
    db.add(user)
    db.flush()

    profile = EmployeeProfile(
        user_id=user.id,
        phone=payload.phone,
        address=payload.address,
        position=payload.position,
        sub_department=payload.sub_department,
        job_grade=payload.job_grade,
        contract_type=payload.contract_type,
        contract_start_date=payload.contract_start_date,
        contract_end_date=payload.contract_end_date,
        basic_salary=payload.basic_salary,
        bank_account=payload.bank_account,
        profile_photo=None,
        employment_status=payload.status,
    )
    db.add(profile)
    db.add(
        EmployeeHistory(
            user_id=user.id,
            event_type="hire",
            title="Employee onboarded",
            description=f"{user.name} joined the {user.department or 'General'} department.",
            effective_date=payload.contract_start_date or date.today(),
        )
    )
    db.commit()
    db.refresh(profile)
    return _profile_payload(profile)


@router.post("/employee-history")
def create_employee_history(
    payload: EmployeeHistoryIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = EmployeeHistory(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "Employee history saved"}


@router.get("/employee-history/{user_id}")
def employee_history(
    user_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, user_id)
    rows = db.query(EmployeeHistory).filter(EmployeeHistory.user_id == user_id).order_by(EmployeeHistory.effective_date.desc()).all()
    return [
        {
            "id": row.id,
            "event_type": row.event_type,
            "title": row.title,
            "description": row.description,
            "effective_date": row.effective_date,
        }
        for row in rows
    ]


@router.post("/movement-requests")
def create_movement_request(
    payload: EmployeeMovementRequestIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    movement_type = _clean_text(payload.movement_type)
    if movement_type not in MOVEMENT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid movement type")

    _ensure_target_in_scope(db, actor, payload.user_id)
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == payload.user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    proposed_position = _clean_text(payload.proposed_position) or None
    proposed_department = _clean_text(payload.proposed_department) or None
    proposed_sub_department = _clean_text(payload.proposed_sub_department) or None
    proposed_job_grade = _clean_text(payload.proposed_job_grade) or None
    proposed_contract_type = _clean_text(payload.proposed_contract_type) or None
    proposed_status = _clean_text(payload.proposed_status) or None
    has_salary = payload.proposed_salary is not None

    if not any([proposed_position, proposed_department, proposed_sub_department, proposed_job_grade, has_salary, proposed_contract_type, proposed_status]):
        raise HTTPException(status_code=400, detail="At least one proposed change is required")

    row = EmployeeMovementRequest(
        user_id=payload.user_id,
        requested_by=actor.id,
        movement_type=movement_type,
        effective_date=payload.effective_date,
        current_position=profile.position,
        proposed_position=proposed_position,
        current_department=profile.user.department,
        proposed_department=proposed_department,
        current_sub_department=profile.sub_department,
        proposed_sub_department=proposed_sub_department,
        current_job_grade=profile.job_grade,
        proposed_job_grade=proposed_job_grade,
        current_salary=profile.basic_salary,
        proposed_salary=payload.proposed_salary if has_salary else None,
        current_contract_type=profile.contract_type,
        proposed_contract_type=proposed_contract_type,
        current_status=profile.employment_status,
        proposed_status=proposed_status,
        reason=payload.reason,
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _movement_payload(row)


@router.get("/movement-requests")
def movement_requests(
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    actor_role = normalize_role(actor.role)
    query = db.query(EmployeeMovementRequest)
    if actor_role != MANAGEMENT_HR_ROLE:
        scoped_ids = _scope_ids(db, actor, include_self=True)
        query = query.filter(
            (EmployeeMovementRequest.user_id.in_(scoped_ids))
            | (EmployeeMovementRequest.requested_by == actor.id)
        )
    return [_movement_payload(row) for row in query.order_by(EmployeeMovementRequest.created_at.desc()).all()]


@router.put("/movement-requests/{request_id}/review")
def review_movement_request(
    request_id: int,
    payload: EmployeeMovementReviewIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    status = _clean_text(payload.status)
    if status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    row = db.query(EmployeeMovementRequest).filter(EmployeeMovementRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Movement request not found")
    if row.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending movement requests can be reviewed")

    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == row.user_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employee profile not found")

    row.status = status
    row.reviewed_by = actor.id
    row.reviewed_at = datetime.now()
    row.review_remarks = payload.review_remarks

    if status == "approved":
        if row.proposed_position:
            profile.position = row.proposed_position
        if row.proposed_department:
            profile.user.department = row.proposed_department
        if row.proposed_sub_department:
            profile.sub_department = row.proposed_sub_department
        if row.proposed_job_grade:
            profile.job_grade = row.proposed_job_grade
        if row.proposed_salary is not None:
            profile.basic_salary = row.proposed_salary
        if row.proposed_contract_type:
            profile.contract_type = row.proposed_contract_type
        if row.proposed_status:
            profile.employment_status = row.proposed_status
        db.add(
            EmployeeHistory(
                user_id=row.user_id,
                event_type=row.movement_type,
                title=f"{row.movement_type.replace('_', ' ').title()} approved",
                description=_movement_description(row),
                effective_date=row.effective_date,
            )
        )

    db.commit()
    db.refresh(row)
    return _movement_payload(row)


@router.get("/payroll")
def payroll_records(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PAYROLL_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    query = db.query(PayrollRecord).filter(PayrollRecord.user_id.in_(user_ids))
    if year:
        query = query.filter(PayrollRecord.period_year == year)
    if month:
        query = query.filter(PayrollRecord.period_month == month)
    return [_payroll_payload(row) for row in query.order_by(PayrollRecord.period_year.desc(), PayrollRecord.period_month.desc()).all()]


@router.get("/my-payslips")
def my_payslips(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = (
        db.query(PayrollRecord)
        .filter(PayrollRecord.user_id == actor.id, PayrollRecord.status.in_(["approved", "paid"]))
        .order_by(PayrollRecord.period_year.desc(), PayrollRecord.period_month.desc())
        .all()
    )
    return [_payroll_payload(row) for row in rows]


@router.post("/payroll")
def create_payroll_record(
    payload: PayrollRecordIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PAYROLL_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    if payload.status not in PAYROLL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payroll status")

    values = payload.model_dump()
    auto_calculate = values.pop("auto_calculate_contributions", True)
    row = (
        db.query(PayrollRecord)
        .filter(
            PayrollRecord.user_id == payload.user_id,
            PayrollRecord.period_year == payload.period_year,
            PayrollRecord.period_month == payload.period_month,
        )
        .first()
    )
    if row and row.status not in PAYROLL_EDITABLE_STATUSES:
        raise HTTPException(status_code=400, detail="Only draft or rejected payroll can be edited")
    if not row:
        row = PayrollRecord()
        db.add(row)

    for field, value in values.items():
        setattr(row, field, value)
    _apply_payroll_totals(row)
    if auto_calculate:
        row.nssf_deduction = _calculate_nssf(Decimal(row.basic_salary or 0))
        row.tax_deduction = _calculate_tax(Decimal(row.gross_pay or 0))
        _apply_payroll_totals(row)
    row.gross_pay = _cents(Decimal(row.gross_pay or 0))
    row.net_pay = _cents(Decimal(row.net_pay or 0))
    row.tax_deduction = _cents(Decimal(row.tax_deduction or 0))
    row.nssf_deduction = _cents(Decimal(row.nssf_deduction or 0))
    db.add(row)
    db.commit()
    db.refresh(row)
    return _payroll_payload(row)


@router.post("/payroll/generate")
def generate_payroll_records(
    payload: PayrollGenerateIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PAYROLL_ROLES)),
):
    if payload.status not in PAYROLL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payroll status")

    user_ids = _scope_ids(db, actor, include_self=True)
    profiles = (
        db.query(EmployeeProfile)
        .join(User, EmployeeProfile.user_id == User.id)
        .filter(EmployeeProfile.user_id.in_(user_ids), func.lower(EmployeeProfile.employment_status) == "active")
        .order_by(User.name.asc())
        .all()
    )
    created = 0
    updated = 0
    skipped = 0

    for profile in profiles:
        existing = (
            db.query(PayrollRecord)
            .filter(
                PayrollRecord.user_id == profile.user_id,
                PayrollRecord.period_year == payload.period_year,
                PayrollRecord.period_month == payload.period_month,
            )
            .first()
        )
        if existing and existing.status not in PAYROLL_EDITABLE_STATUSES:
            skipped += 1
            continue

        calculated = _build_payroll_record(
            db,
            profile,
            payload.period_year,
            payload.period_month,
            allowances=payload.allowances,
            bonus=payload.bonus,
            benefits=payload.benefits,
            salary_adjustment=payload.salary_adjustment,
            other_deductions=payload.other_deductions,
            status=payload.status,
        )

        if existing:
            for field in [
                "basic_salary",
                "overtime_amount",
                "allowances",
                "bonus",
                "benefits",
                "salary_adjustment",
                "tax_deduction",
                "nssf_deduction",
                "other_deductions",
                "gross_pay",
                "net_pay",
                "status",
            ]:
                setattr(existing, field, getattr(calculated, field))
            updated += 1
        else:
            db.add(calculated)
            created += 1

    db.commit()
    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "message": f"Payroll generated: {created} created, {updated} updated, {skipped} skipped",
    }


@router.post("/payroll/{record_id}/status")
def update_payroll_status(
    record_id: int,
    payload: PayrollStatusIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PAYROLL_ROLES)),
):
    status = payload.status.lower()
    if status not in PAYROLL_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid payroll status")

    record = db.query(PayrollRecord).filter(PayrollRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    _ensure_target_in_scope(db, actor, record.user_id)

    actor_role = normalize_role(actor.role)
    allowed = {
        "draft": {"submitted"},
        "rejected": {"submitted"},
        "submitted": {"approved", "rejected"},
        "approved": {"paid"},
        "paid": set(),
    }
    if status not in allowed.get(record.status, set()):
        raise HTTPException(status_code=400, detail=f"Cannot move payroll from {record.status} to {status}")
    if status in {"approved", "rejected"} and actor_role != MANAGEMENT_HR_ROLE:
        raise HTTPException(status_code=403, detail="Only HR management can approve or reject payroll")

    record.status = status
    db.commit()
    db.refresh(record)
    return _payroll_payload(record)


@router.get("/payroll/payslip/{record_id}")
def payslip(
    record_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    record = db.query(PayrollRecord).filter(PayrollRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Payslip not found")
    if record.user_id != actor.id and normalize_role(actor.role) not in {MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE}:
        raise HTTPException(status_code=403, detail="Forbidden")
    if record.user_id == actor.id and record.status not in {"approved", "paid"}:
        raise HTTPException(status_code=403, detail="Payslip is not published yet")
    return _payroll_payload(record)


@router.get("/payroll/bank-export")
def bank_payment_export(
    year: int,
    month: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PAYROLL_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    rows = (
        db.query(PayrollRecord)
        .join(User, PayrollRecord.user_id == User.id)
        .join(EmployeeProfile, EmployeeProfile.user_id == User.id)
        .filter(
            PayrollRecord.user_id.in_(user_ids),
            PayrollRecord.period_year == year,
            PayrollRecord.period_month == month,
            PayrollRecord.status.in_(["approved", "paid"]),
        )
        .order_by(User.emp_code.asc())
        .all()
    )
    lines = ["emp_code,name,bank_account,net_pay"]
    for row in rows:
        profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == row.user_id).first()
        values = [row.user.emp_code, row.user.name, profile.bank_account or "", f"{_money(row.net_pay):.2f}"]
        lines.append(",".join(f'"{str(value).replace(chr(34), chr(34) + chr(34))}"' for value in values))
    return Response("\n".join(lines), media_type="text/csv")


@router.post("/schedules")
def create_schedule(
    payload: ShiftScheduleIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = ShiftSchedule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "Schedule saved"}


@router.post("/schedule-changes")
def create_schedule_change(
    payload: ScheduleChangeIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = ScheduleChange(**payload.model_dump(), changed_by=actor.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "Schedule change recorded"}


@router.post("/performance")
def create_performance_review(
    payload: PerformanceReviewIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    data = payload.model_dump()
    data["total_score"] = data.pop("score", None)
    data["performance_rating"] = data.pop("rating", None)
    data["manager_comments"] = data.pop("comments", None)
    data["review_status"] = data.pop("status", "Draft")
    data["reviewer_id"] = actor.id
    row = PerformanceReview(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _performance_payload(row)


@router.get("/performance")
def performance_reviews(
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    rows = db.query(PerformanceReview).filter(PerformanceReview.user_id.in_(user_ids)).order_by(PerformanceReview.created_at.desc()).all()
    return [_performance_payload(row) for row in rows]


@router.post("/kpis")
def create_kpi(
    payload: KpiRecordIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = KpiRecord(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "KPI saved"}


@router.post("/holidays")
def create_public_holiday(
    payload: PublicHolidayIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    row = PublicHoliday(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "Holiday saved"}


def _next_plan_id(db: Session) -> str:
    last = db.query(TrainingPlan).order_by(TrainingPlan.id.desc()).first()
    num = (last.id + 1) if last else 1
    return f"TP-{num:04d}"


def _training_plan_payload(row: TrainingPlan) -> dict:
    return {
        "id": row.id,
        "plan_id": row.plan_id,
        "title": row.title,
        "category": row.category,
        "training_type": row.training_type,
        "training_year": row.training_year,
        "objective": row.objective,
        "department": row.department,
        "position": row.position,
        "employee_id": row.employee_id,
        "employee_name": row.employee.name if row.employee else None,
        "planned_start_date": row.planned_start_date.isoformat(),
        "planned_end_date": row.planned_end_date.isoformat(),
        "duration": row.duration,
        "trainer": row.trainer,
        "venue": row.venue,
        "estimated_cost": _money(row.estimated_cost) if row.estimated_cost else None,
        "actual_cost": _money(row.actual_cost) if row.actual_cost else None,
        "requested_by": row.requested_by,
        "requester_name": row.requester.name if row.requester else None,
        "approval_status": row.approval_status,
        "training_status": row.training_status,
        "remarks": row.remarks,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _training_record_payload(row: TrainingRecord) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "plan_id": row.plan_id,
        "training_id": row.plan.plan_id if row.plan else None,
        "employee_id": row.user.emp_code if row.user else None,
        "employee_name": row.user.name if row.user else None,
        "department": row.user.department if row.user else None,
        "position": row.user.profile.position if row.user and row.user.profile else None,
        "title": row.title,
        "training_type": row.training_type,
        "category": row.category,
        "provider": row.provider,
        "training_date": row.training_date.isoformat() if row.training_date else None,
        "end_date": row.end_date.isoformat() if row.end_date else None,
        "duration": float(row.duration) if row.duration else None,
        "training_method": row.training_method,
        "attendance_status": row.attendance_status,
        "completion_status": row.completion_status,
        "assessment_result": row.assessment_result,
        "score": float(row.score) if row.score else None,
        "skills_gained": row.skills_gained,
        "certification": row.certification,
        "related_kpi_id": row.related_kpi_id,
        "related_job_role": row.related_job_role,
        "certificate_file": row.certificate_file,
        "feedback_file": row.feedback_file,
        "verified_by": row.verified_by,
        "verifier_name": row.verifier.name if row.verifier else None,
        "status": row.status,
        "remarks": row.remarks,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _competency_payload(row: CompetencyAssessment) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_id": row.user.emp_code if row.user else None,
        "employee_name": row.user.name if row.user else None,
        "department": row.user.department if row.user else None,
        "position": row.user.profile.position if row.user and row.user.profile else None,
        "assessment_id": f"CA-{row.id:04d}",
        "assessment_type": row.assessment_type,
        "assessment_period_start": row.assessment_period_start.isoformat(),
        "assessment_period_end": row.assessment_period_end.isoformat(),
        "assessor_id": row.assessor_id,
        "assessor_name": row.assessor.name if row.assessor else None,
        "assessment_date": row.assessment_date.isoformat(),
        "competency_model": row.competency_model,
        "technical_skills": row.technical_skills,
        "soft_skills": row.soft_skills,
        "behavioral_competency": row.behavioral_competency,
        "technical_score": float(row.technical_score),
        "soft_skills_score": float(row.soft_skills_score),
        "behavioral_score": float(row.behavioral_score),
        "overall_score": float(row.overall_score) if row.overall_score else None,
        "competency_level": row.competency_level,
        "strengths": row.strengths,
        "improvement_areas": row.improvement_areas,
        "development_needs": row.development_needs,
        "training_recommendation_id": row.training_recommendation_id,
        "training_recommendation": row.training_recommendation.plan_id if row.training_recommendation else None,
        "coaching_required": row.coaching_required,
        "career_path_suggestion": row.career_path_suggestion,
        "verified_by": row.verified_by,
        "verifier_name": row.verifier_competency.name if row.verifier_competency else None,
        "approval_status": row.approval_status,
        "remarks": row.remarks,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


# ── Training Plans ──────────────────────────────────────────────


@router.get("/training-plans")
def list_training_plans(
    year: int | None = None,
    status: str | None = None,
    department: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids))
    if year:
        q = q.filter(TrainingPlan.training_year == year)
    if status:
        q = q.filter(TrainingPlan.training_status == status)
    if department:
        q = q.filter(TrainingPlan.department == department)
    return [_training_plan_payload(r) for r in q.order_by(TrainingPlan.created_at.desc()).all()]


@router.post("/training-plans")
def create_training_plan(
    payload: TrainingPlanIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    data = payload.model_dump()
    data["requested_by"] = actor.id
    data["plan_id"] = _next_plan_id(db)
    if data.get("planned_start_date") and data.get("planned_end_date"):
        delta = data["planned_end_date"] - data["planned_start_date"]
        data["duration"] = delta.days
    row = TrainingPlan(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _training_plan_payload(row)


@router.get("/training-plans/{plan_id}")
def get_training_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    row = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Training plan not found")
    return _training_plan_payload(row)


@router.put("/training-plans/{plan_id}")
def update_training_plan(
    plan_id: int,
    payload: TrainingPlanIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    row = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Training plan not found")
    data = payload.model_dump()
    if data.get("planned_start_date") and data.get("planned_end_date"):
        delta = data["planned_end_date"] - data["planned_start_date"]
        data["duration"] = delta.days
    for k, v in data.items():
        setattr(row, k, v)
    row.requested_by = actor.id
    db.commit()
    db.refresh(row)
    return _training_plan_payload(row)


@router.delete("/training-plans/{plan_id}")
def delete_training_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    row = db.query(TrainingPlan).filter(TrainingPlan.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Training plan not found")
    db.delete(row)
    db.commit()
    return {"message": "Training plan deleted"}


# ── Training Records ────────────────────────────────────────────


@router.get("/training-records")
def list_training_records(
    user_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(TrainingRecord).filter(TrainingRecord.user_id.in_(user_ids))
    if user_id:
        _ensure_target_in_scope(db, actor, user_id)
        q = q.filter(TrainingRecord.user_id == user_id)
    if status:
        q = q.filter(TrainingRecord.status == status)
    return [_training_record_payload(r) for r in q.order_by(TrainingRecord.training_date.desc()).all()]


@router.get("/training-records/my")
def my_training_records(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = db.query(TrainingRecord).filter(TrainingRecord.user_id == actor.id).order_by(TrainingRecord.training_date.desc()).all()
    return [_training_record_payload(r) for r in rows]


@router.post("/training-records")
def create_training_record(
    payload: TrainingRecordIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = TrainingRecord(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _training_record_payload(row)


@router.put("/training-records/{record_id}")
def update_training_record(
    record_id: int,
    payload: TrainingRecordIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Training record not found")
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _training_record_payload(row)


@router.delete("/training-records/{record_id}")
def delete_training_record(
    record_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    row = db.query(TrainingRecord).filter(TrainingRecord.id == record_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Training record not found")
    db.delete(row)
    db.commit()
    return {"message": "Training record deleted"}


# ── Competency Assessments ──────────────────────────────────────


@router.get("/competency-assessments")
def list_competency_assessments(
    user_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(CompetencyAssessment).filter(CompetencyAssessment.user_id.in_(user_ids))
    if user_id:
        _ensure_target_in_scope(db, actor, user_id)
        q = q.filter(CompetencyAssessment.user_id == user_id)
    if status:
        q = q.filter(CompetencyAssessment.approval_status == status)
    return [_competency_payload(r) for r in q.order_by(CompetencyAssessment.assessment_date.desc()).all()]


@router.get("/competency-assessments/my")
def my_competency_assessments(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = db.query(CompetencyAssessment).filter(CompetencyAssessment.user_id == actor.id).order_by(CompetencyAssessment.assessment_date.desc()).all()
    return [_competency_payload(r) for r in rows]


@router.post("/competency-assessments")
def create_competency_assessment(
    payload: CompetencyAssessmentIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    data = payload.model_dump()
    ts = Decimal(str(data.get("technical_score", 0)))
    ss = Decimal(str(data.get("soft_skills_score", 0)))
    bs = Decimal(str(data.get("behavioral_score", 0)))
    data["overall_score"] = (ts + ss + bs) / Decimal("3")
    row = CompetencyAssessment(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _competency_payload(row)


@router.put("/competency-assessments/{assessment_id}")
def update_competency_assessment(
    assessment_id: int,
    payload: CompetencyAssessmentIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    row = db.query(CompetencyAssessment).filter(CompetencyAssessment.id == assessment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Competency assessment not found")
    data = payload.model_dump()
    ts = Decimal(str(data.get("technical_score", 0)))
    ss = Decimal(str(data.get("soft_skills_score", 0)))
    bs = Decimal(str(data.get("behavioral_score", 0)))
    data["overall_score"] = (ts + ss + bs) / Decimal("3")
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _competency_payload(row)


@router.delete("/competency-assessments/{assessment_id}")
def delete_competency_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    row = db.query(CompetencyAssessment).filter(CompetencyAssessment.id == assessment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Competency assessment not found")
    db.delete(row)
    db.commit()
    return {"message": "Competency assessment deleted"}


@router.get("/training/dashboard")
def training_dashboard(
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    total_plans = db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids)).count()
    ongoing = db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids), TrainingPlan.training_status == "Ongoing").count()
    completed = db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids), TrainingPlan.training_status == "Completed").count()
    pending = db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids), TrainingPlan.approval_status == "Pending").count()
    participants = db.query(TrainingRecord).filter(TrainingRecord.user_id.in_(user_ids)).count()
    budget = db.query(
        func.coalesce(func.sum(TrainingPlan.estimated_cost), 0),
        func.coalesce(func.sum(TrainingPlan.actual_cost), 0),
    ).filter(TrainingPlan.requested_by.in_(user_ids)).first()
    dept_rows = (
        db.query(TrainingPlan.department, func.count(TrainingPlan.id))
        .filter(TrainingPlan.requested_by.in_(user_ids))
        .group_by(TrainingPlan.department)
        .all()
    )
    upcoming = db.query(TrainingPlan).filter(
        TrainingPlan.requested_by.in_(user_ids),
        TrainingPlan.training_status.in_(["Planned", "Ongoing"]),
        TrainingPlan.planned_start_date >= date.today(),
    ).count()
    return {
        "total_plans": total_plans,
        "ongoing": ongoing,
        "completed": completed,
        "pending_approval": pending,
        "participants": participants,
        "budget_estimated": _money(budget[0]) if budget else "0",
        "budget_actual": _money(budget[1]) if budget else "0",
        "by_department": [{"department": d or "Unassigned", "count": c} for d, c in dept_rows],
        "upcoming": upcoming,
    }


@router.get("/reports")
def reports(
    year: int | None = None,
    month: int | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*HRIS_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    payroll_query = db.query(PayrollRecord).filter(PayrollRecord.user_id.in_(user_ids))
    attendance_query = db.query(Attendance).filter(Attendance.user_id.in_(user_ids))
    if year:
        payroll_query = payroll_query.filter(PayrollRecord.period_year == year)
        attendance_query = attendance_query.filter(extract("year", Attendance.date) == year)
    if month:
        payroll_query = payroll_query.filter(PayrollRecord.period_month == month)
        attendance_query = attendance_query.filter(extract("month", Attendance.date) == month)

    departments = (
        db.query(User.department, func.count(User.id))
        .filter(User.id.in_(user_ids))
        .group_by(User.department)
        .all()
    )
    nssf_total = payroll_query.with_entities(func.coalesce(func.sum(PayrollRecord.nssf_deduction), 0)).scalar()
    tax_total = payroll_query.with_entities(func.coalesce(func.sum(PayrollRecord.tax_deduction), 0)).scalar()
    net_pay_total = payroll_query.with_entities(func.coalesce(func.sum(PayrollRecord.net_pay), 0)).scalar()

    return {
        "headcount": [{"department": dept or "Unassigned", "count": count} for dept, count in departments],
        "payroll": {
            "net_pay_total": _money(net_pay_total),
            "tax_total": _money(tax_total),
            "nssf_total": _money(nssf_total),
        },
        "attendance": {
            "records": attendance_query.count(),
            "late": attendance_query.filter(Attendance.is_late == True).count(),
            "early_leave": attendance_query.filter(Attendance.is_early_checkout == True).count(),
        },
        "training": {
            "planned": db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids), TrainingPlan.training_status == "Planned").count(),
            "ongoing": db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids), TrainingPlan.training_status == "Ongoing").count(),
            "completed": db.query(TrainingPlan).filter(TrainingPlan.requested_by.in_(user_ids), TrainingPlan.training_status == "Completed").count(),
            "records": db.query(TrainingRecord).filter(TrainingRecord.user_id.in_(user_ids)).count(),
            "completed_records": db.query(TrainingRecord).filter(TrainingRecord.user_id.in_(user_ids), TrainingRecord.completion_status == "Completed").count(),
        },
    }
