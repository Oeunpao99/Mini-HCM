from datetime import date, time
from decimal import Decimal

from app.core.security import get_password_hash
from app.models.company_location import CompanyLocation
from app.models.hris import (
    EmployeeHistory,
    EmployeeProfile,
    KpiRecord,
    PayrollRecord,
    PerformanceReview,
    PublicHoliday,
    ShiftSchedule,
    TrainingRecord,
)
from app.models.user import User
from sqlalchemy.orm import Session


def seed_default_data(db: Session):
    if not db.query(CompanyLocation).filter(CompanyLocation.id == 1).first():
        db.add(
            CompanyLocation(
                id=1,
                latitude=11.5281245666188,
                longitude=104.9122285378946,
                radius_meters=100,
            )
        )

    management_hr = _upsert_user(
        db,
        emp_code="EMP001",
        name="Management HR",
        email="hr@example.com",
        password="admin123",
        role="management_hr",
        department="HR",
    )
    developer_head = _upsert_user(
        db,
        emp_code="EMP002",
        name="Developer Head",
        email="developer.head@example.com",
        password="devhead123",
        role="department_head",
        department="Developer",
    )
    finance_head = _upsert_user(
        db,
        emp_code="EMP003",
        name="Finance Head",
        email="finance.head@example.com",
        password="financehead123",
        role="department_head",
        department="Finance",
    )
    hr_head = _upsert_user(
        db,
        emp_code="EMP004",
        name="HR Head",
        email="hr.head@example.com",
        password="hrhead123",
        role="department_head",
        department="HR",
    )
    payroll_officer = _upsert_user(
        db,
        emp_code="EMP011",
        name="Payroll Officer",
        email="payroll@example.com",
        password="payroll123",
        role="payroll_officer",
        department="Finance",
    )
    operations_head = _upsert_user(
        db,
        emp_code="EMP005",
        name="Operations Head",
        email="operations.head@example.com",
        password="opshead123",
        role="department_head",
        department="Operations",
    )
    db.flush()

    developer_line_manager = _upsert_user(
        db,
        emp_code="EMP006",
        name="Developer Line Manager",
        email="developer.manager@example.com",
        password="devmanager123",
        role="line_manager",
        department="Developer",
        manager_id=developer_head.id,
    )
    db.flush()

    _upsert_user(
        db,
        emp_code="EMP007",
        name="Developer Staff",
        email="developer.staff@example.com",
        password="devstaff123",
        role="staff",
        department="Developer",
        manager_id=developer_line_manager.id,
    )
    _upsert_user(
        db,
        emp_code="EMP008",
        name="Finance Staff",
        email="finance.staff@example.com",
        password="financestaff123",
        role="staff",
        department="Finance",
        manager_id=finance_head.id,
    )
    _upsert_user(
        db,
        emp_code="EMP009",
        name="HR Staff",
        email="hr.staff@example.com",
        password="hrstaff123",
        role="staff",
        department="HR",
        manager_id=hr_head.id,
    )
    _upsert_user(
        db,
        emp_code="EMP010",
        name="Operations Staff",
        email="operations.staff@example.com",
        password="opsstaff123",
        role="staff",
        department="Operations",
        manager_id=operations_head.id,
    )

    db.flush()
    users = db.query(User).filter(User.emp_code.in_([f"EMP{i:03d}" for i in range(1, 12)])).all()
    _seed_hris_data(db, users, management_hr.id, payroll_officer.id)

    # Keep legacy sample accounts meaningful if they already exist.
    if management_hr.role in {"admin", "manager", "employee"}:
        management_hr.role = "management_hr"
    developer_head.manager_id = None
    finance_head.manager_id = None
    hr_head.manager_id = None
    operations_head.manager_id = None

    db.commit()


def _upsert_user(
    db: Session,
    emp_code: str,
    name: str,
    email: str,
    password: str,
    role: str,
    department: str,
    manager_id: int | None = None,
) -> User:
    user = db.query(User).filter(User.emp_code == emp_code).first()
    if not user:
        user = User(
            emp_code=emp_code,
            name=name,
            email=email,
            password_hash=get_password_hash(password),
            role=role,
            department=department,
            manager_id=manager_id,
        )
        db.add(user)
        return user

    user.name = name
    user.email = email
    user.password_hash = get_password_hash(password)
    user.role = role
    user.department = department
    user.manager_id = manager_id
    return user


def _seed_hris_data(db: Session, users: list[User], reviewer_id: int, payroll_officer_id: int) -> None:
    salary_by_role = {
        "management_hr": Decimal("2200.00"),
        "payroll_officer": Decimal("1600.00"),
        "department_head": Decimal("1800.00"),
        "line_manager": Decimal("1400.00"),
        "staff": Decimal("900.00"),
    }

    for user in users:
        role = user.role
        salary = salary_by_role.get(role, Decimal("900.00"))
        if not db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first():
            db.add(
                EmployeeProfile(
                    user_id=user.id,
                    phone=f"+855 12 {user.id:06d}",
                    address="Phnom Penh",
                    position=_position_for_role(role),
                    contract_type="full_time",
                    contract_start_date=date(2026, 1, 1),
                    basic_salary=salary,
                    bank_account=f"PSB{user.id:06d}",
                    status="active",
                )
            )

        if not db.query(EmployeeHistory).filter(EmployeeHistory.user_id == user.id).first():
            db.add(
                EmployeeHistory(
                    user_id=user.id,
                    event_type="hire",
                    title="Employee onboarded",
                    description=f"{user.name} joined the {user.department or 'General'} department.",
                    effective_date=date(2026, 1, 1),
                )
            )

        if not db.query(ShiftSchedule).filter(ShiftSchedule.user_id == user.id, ShiftSchedule.work_date == date(2026, 6, 2)).first():
            db.add(
                ShiftSchedule(
                    user_id=user.id,
                    shift_name="Standard Day",
                    work_date=date(2026, 6, 2),
                    start_time=time(8, 0),
                    end_time=time(17, 30),
                    location="Head Office",
                )
            )

        if not db.query(PayrollRecord).filter(
            PayrollRecord.user_id == user.id,
            PayrollRecord.period_year == 2026,
            PayrollRecord.period_month == 6,
        ).first():
            allowances = Decimal("50.00") if role == "staff" else Decimal("100.00")
            nssf = (salary * Decimal("0.02")).quantize(Decimal("0.01"))
            tax = (salary * Decimal("0.05")).quantize(Decimal("0.01")) if salary >= Decimal("1200.00") else Decimal("0.00")
            overtime = Decimal("25.00") if role == "staff" else Decimal("0.00")
            gross = salary + allowances + overtime
            db.add(
                PayrollRecord(
                    user_id=user.id,
                    period_year=2026,
                    period_month=6,
                    basic_salary=salary,
                    allowances=allowances,
                    bonus=Decimal("0.00"),
                    benefits=Decimal("0.00"),
                    salary_adjustment=Decimal("0.00"),
                    overtime_amount=overtime,
                    tax_deduction=tax,
                    nssf_deduction=nssf,
                    gross_pay=gross,
                    net_pay=gross - tax - nssf,
                    status="approved" if user.id != payroll_officer_id else "draft",
                )
            )

        if not db.query(KpiRecord).filter(KpiRecord.user_id == user.id).first():
            db.add(
                KpiRecord(
                    user_id=user.id,
                    name="Monthly delivery quality",
                    target_value=Decimal("95.00"),
                    actual_value=Decimal("91.00"),
                    weight=Decimal("40.00"),
                    period="2026-Q2",
                    status="tracking",
                )
            )

        if not db.query(PerformanceReview).filter(PerformanceReview.user_id == user.id).first():
            db.add(
                PerformanceReview(
                    user_id=user.id,
                    reviewer_id=reviewer_id,
                    review_period="2026-Q2",
                    score=Decimal("86.00"),
                    rating="meets_expectations",
                    comments="Seed appraisal for HRIS dashboard testing.",
                    status="completed",
                )
            )

        if not db.query(TrainingRecord).filter(TrainingRecord.user_id == user.id).first():
            db.add(
                TrainingRecord(
                    user_id=user.id,
                    title="HR compliance basics",
                    provider="Internal HR",
                    start_date=date(2026, 6, 10),
                    end_date=date(2026, 6, 10),
                    status="planned",
                )
            )

    if not db.query(PublicHoliday).filter(PublicHoliday.holiday_date == date(2026, 5, 14)).first():
        db.add(PublicHoliday(name="King Norodom Sihamoni's Birthday", holiday_date=date(2026, 5, 14)))


def _position_for_role(role: str) -> str:
    return {
        "management_hr": "HR Manager",
        "payroll_officer": "Payroll Officer",
        "department_head": "Department Head",
        "line_manager": "Line Manager",
        "staff": "Employee",
    }.get(role, "Employee")
