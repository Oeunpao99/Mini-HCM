from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field


class EmployeeProfileIn(BaseModel):
    user_id: int
    phone: str | None = None
    address: str | None = None
    position: str | None = None
    sub_department: str | None = None
    job_grade: str | None = None
    contract_type: str = "full_time"
    contract_start_date: date | None = None
    contract_end_date: date | None = None
    basic_salary: Decimal = Field(default=0, ge=0)
    bank_account: str | None = None
    profile_photo: str | None = None
    status: str = "active"


class EmployeeCreateIn(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str = "staff"
    department: str | None = None
    manager_id: int | None = None
    phone: str | None = None
    address: str | None = None
    position: str | None = None
    sub_department: str | None = None
    job_grade: str | None = None
    contract_type: str = "full_time"
    contract_start_date: date | None = None
    contract_end_date: date | None = None
    basic_salary: Decimal = Field(default=0, ge=0)
    bank_account: str | None = None
    profile_photo: str | None = None
    status: str = "active"


class EmployeeProfileOut(EmployeeProfileIn):
    id: int
    emp_code: str
    name: str
    email: str
    department: str | None
    role: str

    class Config:
        from_attributes = True


class EmployeeHistoryIn(BaseModel):
    user_id: int
    event_type: str
    title: str
    description: str | None = None
    effective_date: date


class EmployeeMovementRequestIn(BaseModel):
    user_id: int
    movement_type: str
    effective_date: date
    proposed_position: str | None = None
    proposed_department: str | None = None
    proposed_sub_department: str | None = None
    proposed_job_grade: str | None = None
    proposed_salary: Decimal | None = Field(default=None, ge=0)
    proposed_contract_type: str | None = None
    proposed_status: str | None = None
    reason: str | None = None


class EmployeeMovementReviewIn(BaseModel):
    status: str
    review_remarks: str | None = None


class HrisLookupSettingsIn(BaseModel):
    departments: list[str] = []
    sub_departments: list[str] = []
    positions: list[str] = []
    job_grades: list[str] = []
    employment_statuses: list[str] = []


class PayrollRecordIn(BaseModel):
    user_id: int
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    basic_salary: Decimal = Field(default=0, ge=0)
    overtime_amount: Decimal = Field(default=0, ge=0)
    allowances: Decimal = Field(default=0, ge=0)
    bonus: Decimal = Field(default=0, ge=0)
    benefits: Decimal = Field(default=0, ge=0)
    salary_adjustment: Decimal = 0
    tax_deduction: Decimal = Field(default=0, ge=0)
    nssf_deduction: Decimal = Field(default=0, ge=0)
    other_deductions: Decimal = Field(default=0, ge=0)
    status: str = "draft"
    auto_calculate_contributions: bool = True


class PayrollGenerateIn(BaseModel):
    period_year: int = Field(ge=2000, le=2100)
    period_month: int = Field(ge=1, le=12)
    allowances: Decimal = Field(default=0, ge=0)
    bonus: Decimal = Field(default=0, ge=0)
    benefits: Decimal = Field(default=0, ge=0)
    salary_adjustment: Decimal = 0
    other_deductions: Decimal = Field(default=0, ge=0)
    status: str = "draft"


class PayrollStatusIn(BaseModel):
    status: str


class PayrollRecordOut(PayrollRecordIn):
    id: int
    employee_name: str
    department: str | None
    gross_pay: Decimal
    net_pay: Decimal

    class Config:
        from_attributes = True


class ShiftScheduleIn(BaseModel):
    user_id: int
    shift_name: str
    work_date: date
    start_time: time
    end_time: time
    location: str | None = None
    is_active: bool = True


class ScheduleChangeIn(BaseModel):
    schedule_id: int | None = None
    user_id: int
    old_shift: str | None = None
    new_shift: str
    reason: str
    status: str = "approved"


class PerformanceReviewIn(BaseModel):
    user_id: int
    review_period: str
    score: Decimal = Field(default=0, ge=0, le=100)
    rating: str = "meets_expectations"
    comments: str | None = None
    status: str = "draft"


class KpiRecordIn(BaseModel):
    user_id: int
    name: str
    target_value: Decimal = Field(default=0, ge=0)
    actual_value: Decimal = Field(default=0, ge=0)
    weight: Decimal = Field(default=0, ge=0, le=100)
    period: str
    status: str = "tracking"


class PublicHolidayIn(BaseModel):
    name: str
    holiday_date: date
    country: str = "Cambodia"


class TrainingRecordIn(BaseModel):
    user_id: int
    title: str
    provider: str | None = None
    start_date: date
    end_date: date | None = None
    status: str = "planned"
    score: Decimal | None = Field(default=None, ge=0, le=100)


class SimpleRecordOut(BaseModel):
    id: int
    user_id: int | None = None
    employee_name: str | None = None
    title: str | None = None
    name: str | None = None
    status: str | None = None
    created_at: datetime | None = None

    class Config:
        from_attributes = True
