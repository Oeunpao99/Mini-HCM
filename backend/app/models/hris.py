from sqlalchemy import DECIMAL, Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, Time, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    position = Column(String(100), nullable=True)
    sub_department = Column(String(100), nullable=True)
    job_grade = Column(String(50), nullable=True)
    contract_type = Column(String(50), nullable=False, default="full_time")
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    basic_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    bank_account = Column(String(100), nullable=True)
    profile_photo = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class EmployeeHistory(Base):
    __tablename__ = "employee_histories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)
    title = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    effective_date = Column(Date, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class EmployeeMovementRequest(Base):
    __tablename__ = "employee_movement_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    movement_type = Column(String(50), nullable=False)
    effective_date = Column(Date, nullable=False)
    current_position = Column(String(100), nullable=True)
    proposed_position = Column(String(100), nullable=True)
    current_department = Column(String(100), nullable=True)
    proposed_department = Column(String(100), nullable=True)
    current_sub_department = Column(String(100), nullable=True)
    proposed_sub_department = Column(String(100), nullable=True)
    current_job_grade = Column(String(50), nullable=True)
    proposed_job_grade = Column(String(50), nullable=True)
    current_salary = Column(DECIMAL(12, 2), nullable=True)
    proposed_salary = Column(DECIMAL(12, 2), nullable=True)
    current_contract_type = Column(String(50), nullable=True)
    proposed_contract_type = Column(String(50), nullable=True)
    current_status = Column(String(30), nullable=True)
    proposed_status = Column(String(30), nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="pending")
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    requester = relationship("User", foreign_keys=[requested_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ShiftSchedule(Base):
    __tablename__ = "shift_schedules"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    shift_name = Column(String(80), nullable=False)
    work_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    location = Column(String(120), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class ScheduleChange(Base):
    __tablename__ = "schedule_changes"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("shift_schedules.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    old_shift = Column(String(120), nullable=True)
    new_shift = Column(String(120), nullable=False)
    reason = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="approved")
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    changed_at = Column(DateTime, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    changer = relationship("User", foreign_keys=[changed_by])


class PayrollRecord(Base):
    __tablename__ = "payroll_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=False, index=True)
    basic_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    overtime_amount = Column(DECIMAL(12, 2), nullable=False, default=0)
    allowances = Column(DECIMAL(12, 2), nullable=False, default=0)
    bonus = Column(DECIMAL(12, 2), nullable=False, default=0)
    benefits = Column(DECIMAL(12, 2), nullable=False, default=0)
    salary_adjustment = Column(DECIMAL(12, 2), nullable=False, default=0)
    tax_deduction = Column(DECIMAL(12, 2), nullable=False, default=0)
    nssf_deduction = Column(DECIMAL(12, 2), nullable=False, default=0)
    other_deductions = Column(DECIMAL(12, 2), nullable=False, default=0)
    gross_pay = Column(DECIMAL(12, 2), nullable=False, default=0)
    net_pay = Column(DECIMAL(12, 2), nullable=False, default=0)
    status = Column(String(30), nullable=False, default="draft")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class PerformanceReview(Base):
    __tablename__ = "performance_reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_period = Column(String(40), nullable=False)
    score = Column(DECIMAL(5, 2), nullable=False, default=0)
    rating = Column(String(40), nullable=False, default="meets_expectations")
    comments = Column(Text, nullable=True)
    status = Column(String(30), nullable=False, default="draft")
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class KpiRecord(Base):
    __tablename__ = "kpi_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    target_value = Column(DECIMAL(12, 2), nullable=False, default=0)
    actual_value = Column(DECIMAL(12, 2), nullable=False, default=0)
    weight = Column(DECIMAL(5, 2), nullable=False, default=0)
    period = Column(String(40), nullable=False)
    status = Column(String(30), nullable=False, default="tracking")
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")


class PublicHoliday(Base):
    __tablename__ = "public_holidays"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    holiday_date = Column(Date, unique=True, nullable=False, index=True)
    country = Column(String(80), nullable=False, default="Cambodia")
    created_at = Column(DateTime, server_default=func.now())


class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(120), nullable=False)
    provider = Column(String(120), nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    status = Column(String(30), nullable=False, default="planned")
    score = Column(DECIMAL(5, 2), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
