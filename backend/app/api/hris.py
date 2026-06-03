import json
from calendar import monthrange
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP

from fastapi import APIRouter, Depends, HTTPException, Response
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
from app.core.security import get_password_hash
from app.models.app_setting import AppSetting
from app.models.attendance import Attendance
from app.models.hris import (
    EmployeeHistory,
    EmployeeMovementRequest,
    EmployeeProfile,
    KpiRecord,
    PayrollRecord,
    PerformanceReview,
    PublicHoliday,
    ScheduleChange,
    ShiftSchedule,
    TrainingRecord,
)
from app.models.request import Request
from app.models.user import User
from app.schemas.hris import (
    EmployeeCreateIn,
    EmployeeHistoryIn,
    HrisLookupSettingsIn,
    EmployeeMovementRequestIn,
    EmployeeMovementReviewIn,
    EmployeeProfileIn,
    KpiRecordIn,
    PayrollGenerateIn,
    PayrollRecordIn,
    PayrollStatusIn,
    PerformanceReviewIn,
    PublicHolidayIn,
    ScheduleChangeIn,
    ShiftScheduleIn,
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
    "departments": ["Human Resources", "Operations", "Finance", "Sales", "IT"],
    "sub_departments": ["Recruitment", "Payroll", "Administration", "Support"],
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
        "status": profile.status,
    }


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
        "review_period": row.review_period,
        "score": _money(row.score),
        "rating": row.rating,
        "comments": row.comments,
        "status": row.status,
        "reviewed_at": row.reviewed_at,
        "created_at": row.created_at,
    }


def _training_payload(row: TrainingRecord) -> dict:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "title": row.title,
        "provider": row.provider,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "status": row.status,
        "score": _money(row.score) if row.score is not None else None,
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
        db.query(EmployeeProfile).filter(EmployeeProfile.user_id.in_(user_ids), EmployeeProfile.status == "active").count()
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
        .filter(TrainingRecord.user_id.in_(user_ids), TrainingRecord.status.in_(["planned", "in_progress"]))
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
    query = db.query(EmployeeProfile).join(User).filter(EmployeeProfile.user_id.in_(user_ids))
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
        .order_by(TrainingRecord.start_date.desc(), TrainingRecord.created_at.desc())
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
        "profile": _profile_payload(profile) if profile else None,
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


@router.post("/employees")
def upsert_employee_profile(
    payload: EmployeeProfileIn,
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
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return _profile_payload(profile)


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
        profile_photo=payload.profile_photo,
        status=payload.status,
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
        current_status=profile.status,
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
            profile.status = row.proposed_status
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
        .join(User)
        .filter(EmployeeProfile.user_id.in_(user_ids), EmployeeProfile.status == "active")
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
        .join(User)
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
    row = PerformanceReview(**payload.model_dump(), reviewer_id=actor.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return {"id": row.id, "message": "Performance review saved"}


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


@router.post("/training")
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
    return {"id": row.id, "message": "Training record saved"}


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
            "planned": db.query(TrainingRecord).filter(TrainingRecord.user_id.in_(user_ids), TrainingRecord.status == "planned").count(),
            "completed": db.query(TrainingRecord).filter(TrainingRecord.user_id.in_(user_ids), TrainingRecord.status == "completed").count(),
        },
    }
