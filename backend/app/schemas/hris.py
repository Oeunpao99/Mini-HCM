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


class TrainingPlanIn(BaseModel):
    title: str
    category: str
    training_type: str
    training_year: int
    objective: str
    department: str | None = None
    position: str | None = None
    employee_id: int | None = None
    planned_start_date: date
    planned_end_date: date
    trainer: str | None = None
    venue: str | None = None
    estimated_cost: Decimal | None = Field(default=None, ge=0)
    actual_cost: Decimal | None = Field(default=None, ge=0)
    approval_status: str = "Draft"
    training_status: str = "Planned"
    remarks: str | None = None


class TrainingPlanOut(TrainingPlanIn):
    id: int
    plan_id: str
    requested_by: int
    duration: int | None
    employee_name: str | None = None
    requester_name: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    class Config:
        from_attributes = True


class TrainingRecordIn(BaseModel):
    user_id: int
    plan_id: int | None = None
    title: str
    training_type: str | None = None
    category: str | None = None
    provider: str | None = None
    training_date: date
    end_date: date | None = None
    duration: Decimal | None = None
    training_method: str | None = None
    attendance_status: str | None = None
    completion_status: str | None = "In Progress"
    assessment_result: str | None = "Not Applicable"
    score: Decimal | None = Field(default=None, ge=0, le=100)
    skills_gained: str | None = None
    certification: str | None = None
    related_kpi_id: int | None = None
    related_job_role: str | None = None
    certificate_file: str | None = None
    feedback_file: str | None = None
    status: str = "Draft"
    remarks: str | None = None


class TrainingRecordOut(BaseModel):
    id: int
    user_id: int
    plan_id: int | None
    employee_name: str | None
    department: str | None
    position: str | None
    title: str
    training_type: str | None
    category: str | None
    provider: str | None
    training_date: date
    end_date: date | None
    duration: Decimal | None
    training_method: str | None
    attendance_status: str | None
    completion_status: str | None
    assessment_result: str | None
    score: Decimal | None
    skills_gained: str | None
    certification: str | None
    related_kpi_id: int | None
    related_job_role: str | None
    certificate_file: str | None
    feedback_file: str | None
    verified_by: int | None
    verifier_name: str | None
    status: str
    remarks: str | None
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


class CompetencyAssessmentIn(BaseModel):
    user_id: int
    assessment_type: str
    assessment_period_start: date
    assessment_period_end: date
    assessor_id: int
    assessment_date: date
    competency_model: str | None = None
    technical_skills: str | None = None
    soft_skills: str | None = None
    behavioral_competency: str | None = None
    technical_score: Decimal = Field(default=0, ge=0, le=100)
    soft_skills_score: Decimal = Field(default=0, ge=0, le=100)
    behavioral_score: Decimal = Field(default=0, ge=0, le=100)
    strengths: str | None = None
    improvement_areas: str | None = None
    development_needs: str | None = None
    training_recommendation_id: int | None = None
    coaching_required: str | None = None
    career_path_suggestion: str | None = None
    approval_status: str = "Draft"
    remarks: str | None = None


class CompetencyAssessmentOut(BaseModel):
    id: int
    user_id: int
    employee_name: str | None
    department: str | None
    position: str | None
    assessment_type: str
    assessment_period_start: date
    assessment_period_end: date
    assessor_id: int
    assessor_name: str | None
    assessment_date: date
    competency_model: str | None
    technical_skills: str | None
    soft_skills: str | None
    behavioral_competency: str | None
    technical_score: Decimal
    soft_skills_score: Decimal
    behavioral_score: Decimal
    overall_score: Decimal | None
    competency_level: str | None
    strengths: str | None
    improvement_areas: str | None
    development_needs: str | None
    training_recommendation_id: int | None
    coaching_required: str | None
    career_path_suggestion: str | None
    verified_by: int | None
    verifier_name: str | None
    approval_status: str
    remarks: str | None
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True


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
