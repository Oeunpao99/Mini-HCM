from sqlalchemy import DECIMAL, Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, Time, func
from sqlalchemy.orm import relationship

from app.db.session import Base


TRAINING_CATEGORIES = ("Orientation", "Technical", "Soft Skill", "Compliance", "Leadership")
TRAINING_TYPES = ("Internal", "External", "Online", "Classroom", "Workshop", "Seminar")
TRAINING_PLAN_STATUSES = ("Draft", "Pending", "Approved", "Rejected")
TRAINING_STATUSES = ("Planned", "Ongoing", "Completed", "Cancelled")

ATTENDANCE_STATUSES = ("Present", "Absent", "Completed", "Incomplete")
COMPLETION_STATUSES = ("Completed", "Not Completed", "In Progress")
ASSESSMENT_RESULTS = ("Pass", "Fail", "Not Applicable")
RECORD_STATUSES = ("Draft", "Approved", "Rejected")

ASSESSMENT_TYPES = ("Annual", "Probation", "Promotion", "Ad-hoc")
COMPETENCY_LEVELS = ("Beginner", "Intermediate", "Advanced", "Expert")
ASSESSMENT_STATUSES = ("Draft", "Submitted", "In Review", "Approved", "Rejected", "Completed")

KPI_PERIODS = ("Probation", "Semester 1", "Semester 2", "Annual")
KPI_CATEGORIES = ("Individual", "Department", "Company")
MEASUREMENT_METHODS = ("Quantity", "Percentage", "Score", "Milestone", "Financial", "Compliance")
KPI_PLAN_STATUSES = ("Draft", "Pending Approval", "Approved", "Active", "Completed", "Cancelled")
APPROVAL_STATUSES = ("Pending", "Approved", "Rejected")

MONITORING_STATUSES = ("On Track", "At Risk", "Behind Target", "Completed", "Not Started")
MONITORING_STATES = ("Draft", "Submitted", "Reviewed")

REVIEW_PERIODS = ("Probation", "Semester 1", "Semester 2", "Annual")
REVIEW_STATUSES = ("Draft", "Submitted", "Approved")
FINAL_DECISIONS = ("Completed", "Promotion", "Increment", "PIP")
PERFORMANCE_RATINGS = ("Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement", "Unsatisfactory")

POTENTIAL_RATINGS = ("Low", "Medium", "High")
READINESS_LEVELS = ("Ready Now", "Ready in 1 Year", "Ready in 2 Years", "Not Ready")
TALENT_POOLS = ("High Potential", "Successor Pool", "Key Talent", "Emerging Talent")
DEV_STATUSES = ("Active", "Completed", "On Hold", "Promoted", "Closed")

PIP_STATUSES = ("Draft", "Active", "On Track", "At Risk", "Completed", "Extended", "Failed", "Closed")
REVIEW_FREQUENCIES = ("Weekly", "Bi-Weekly", "Monthly")
PIP_FINAL_RESULTS = ("Passed", "Extended", "Failed", "Promoted Improvement")
PIP_RECOMMENDATIONS = ("Continue Employment", "Extend PIP", "Terminate")


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

    user = relationship("User", back_populates="profile")


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
    shift_id = Column(Integer, nullable=True, index=True)
    shift_name = Column(String(80), nullable=False)
    work_date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    location = Column(String(120), nullable=True)
    is_rest_day = Column(Boolean, default=False)
    is_public_holiday = Column(Boolean, default=False)
    schedule_status = Column(String(20), default="Planned")
    remarks = Column(String(500), nullable=True)
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
    review_period = Column(Enum(*REVIEW_PERIODS, name="review_period_type"), nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    kpi_score = Column(DECIMAL(5, 2), nullable=True)
    kpi_weight = Column(DECIMAL(5, 2), nullable=True)
    competency_score = Column(DECIMAL(5, 2), nullable=True)
    behavior_score = Column(DECIMAL(5, 2), nullable=True)
    attendance_score = Column(DECIMAL(5, 2), nullable=True)
    total_score = Column(DECIMAL(5, 2), nullable=True)
    performance_rating = Column(String(40), nullable=True)
    self_assessment = Column(Text, nullable=True)
    manager_comments = Column(Text, nullable=True)
    strengths = Column(Text, nullable=True)
    improvement_areas = Column(Text, nullable=True)
    development_action_plan = Column(Text, nullable=True)
    promotion_recommendation = Column(String(10), nullable=True)
    salary_increment_recommendation = Column(String(10), nullable=True)
    pip_required = Column(String(10), nullable=True)
    review_status = Column(String(30), nullable=False, default="Draft")
    final_decision = Column(String(30), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

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


class TrainingPlan(Base):
    __tablename__ = "training_plans"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(String(20), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    category = Column(Enum(*TRAINING_CATEGORIES, name="training_category"), nullable=False)
    training_type = Column(Enum(*TRAINING_TYPES, name="training_type"), nullable=False)
    training_year = Column(Integer, nullable=False, index=True)
    objective = Column(Text, nullable=False)
    department = Column(String(100), nullable=True, index=True)
    position = Column(String(100), nullable=True)
    employee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    planned_start_date = Column(Date, nullable=False)
    planned_end_date = Column(Date, nullable=False)
    duration = Column(Integer, nullable=True)
    trainer = Column(String(200), nullable=True)
    venue = Column(String(200), nullable=True)
    estimated_cost = Column(DECIMAL(12, 2), nullable=True, default=0)
    actual_cost = Column(DECIMAL(12, 2), nullable=True, default=0)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approval_status = Column(Enum(*TRAINING_PLAN_STATUSES, name="training_plan_status"), nullable=False, default="Draft")
    training_status = Column(Enum(*TRAINING_STATUSES, name="training_status"), nullable=False, default="Planned")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employee = relationship("User", foreign_keys=[employee_id])
    requester = relationship("User", foreign_keys=[requested_by])


class TrainingRecord(Base):
    __tablename__ = "training_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("training_plans.id"), nullable=True)
    title = Column(String(200), nullable=False)
    training_type = Column(Enum(*TRAINING_TYPES, name="training_record_type"), nullable=True)
    category = Column(Enum(*TRAINING_CATEGORIES, name="training_record_category"), nullable=True)
    provider = Column(String(200), nullable=True)
    training_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    duration = Column(DECIMAL(6, 1), nullable=True)
    training_method = Column(String(50), nullable=True)
    attendance_status = Column(Enum(*ATTENDANCE_STATUSES, name="attendance_status"), nullable=True)
    completion_status = Column(Enum(*COMPLETION_STATUSES, name="completion_status"), nullable=True, default="In Progress")
    assessment_result = Column(Enum(*ASSESSMENT_RESULTS, name="assessment_result"), nullable=True, default="Not Applicable")
    score = Column(DECIMAL(5, 2), nullable=True)
    skills_gained = Column(Text, nullable=True)
    certification = Column(String(10), nullable=True)
    related_kpi_id = Column(Integer, nullable=True)
    related_job_role = Column(String(100), nullable=True)
    certificate_file = Column(Text, nullable=True)
    feedback_file = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(*RECORD_STATUSES, name="record_status"), nullable=False, default="Draft")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    verifier = relationship("User", foreign_keys=[verified_by])
    plan = relationship("TrainingPlan")


class CompetencyAssessment(Base):
    __tablename__ = "competency_assessments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assessment_type = Column(Enum(*ASSESSMENT_TYPES, name="assessment_type"), nullable=False)
    assessment_period_start = Column(Date, nullable=False)
    assessment_period_end = Column(Date, nullable=False)
    assessor_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    assessment_date = Column(Date, nullable=False)
    competency_model = Column(String(200), nullable=True)
    technical_skills = Column(Text, nullable=True)
    soft_skills = Column(Text, nullable=True)
    behavioral_competency = Column(Text, nullable=True)
    technical_score = Column(DECIMAL(5, 2), nullable=False, default=0)
    soft_skills_score = Column(DECIMAL(5, 2), nullable=False, default=0)
    behavioral_score = Column(DECIMAL(5, 2), nullable=False, default=0)
    overall_score = Column(DECIMAL(5, 2), nullable=True)
    competency_level = Column(Enum(*COMPETENCY_LEVELS, name="competency_level"), nullable=True)
    strengths = Column(Text, nullable=True)
    improvement_areas = Column(Text, nullable=True)
    development_needs = Column(Text, nullable=True)
    training_recommendation_id = Column(Integer, ForeignKey("training_plans.id"), nullable=True)
    coaching_required = Column(String(10), nullable=True)
    career_path_suggestion = Column(Text, nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_status = Column(Enum(*ASSESSMENT_STATUSES, name="assessment_status"), nullable=False, default="Draft")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    assessor = relationship("User", foreign_keys=[assessor_id])
    verifier_competency = relationship("User", foreign_keys=[verified_by])
    training_recommendation = relationship("TrainingPlan")


class KpiPlan(Base):
    __tablename__ = "kpi_plans"

    id = Column(Integer, primary_key=True, index=True)
    kpi_plan_id = Column(String(20), unique=True, nullable=False, index=True)
    kpi_period = Column(Enum(*KPI_PERIODS, name="kpi_period"), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    kpi_category = Column(Enum(*KPI_CATEGORIES, name="kpi_category"), nullable=False)
    kpi_code = Column(String(20), nullable=True)
    kpi_title = Column(String(200), nullable=False)
    kpi_description = Column(Text, nullable=True)
    measurement_method = Column(Enum(*MEASUREMENT_METHODS, name="measurement_method"), nullable=False)
    target_value = Column(DECIMAL(12, 2), nullable=False, default=0)
    weight = Column(DECIMAL(5, 2), nullable=False, default=0)
    minimum_achievement = Column(DECIMAL(5, 2), nullable=True)
    data_source = Column(String(200), nullable=True)
    responsible_person = Column(Integer, ForeignKey("users.id"), nullable=True)
    line_manager_approval = Column(Enum(*APPROVAL_STATUSES, name="lm_approval_status"), nullable=False, default="Pending")
    hr_review = Column(Enum(*APPROVAL_STATUSES, name="hr_review_status"), nullable=True, default="Pending")
    final_status = Column(Enum(*KPI_PLAN_STATUSES, name="kpi_plan_status"), nullable=False, default="Draft")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    responsible = relationship("User", foreign_keys=[responsible_person])


class KpiMonitoring(Base):
    __tablename__ = "kpi_monitoring"

    id = Column(Integer, primary_key=True, index=True)
    kpi_plan_id = Column(Integer, ForeignKey("kpi_plans.id"), nullable=False, index=True)
    monitoring_date = Column(Date, nullable=False)
    current_achievement = Column(DECIMAL(12, 2), nullable=False, default=0)
    achievement_pct = Column(DECIMAL(5, 2), nullable=True)
    kpi_score = Column(DECIMAL(5, 2), nullable=True)
    status = Column(Enum(*MONITORING_STATUSES, name="monitoring_status_type"), nullable=False, default="Not Started")
    supporting_evidence = Column(Text, nullable=True)
    employee_comment = Column(Text, nullable=True)
    manager_comment = Column(Text, nullable=True)
    action_required = Column(Text, nullable=True)
    monitoring_status = Column(Enum(*MONITORING_STATES, name="monitoring_state"), nullable=False, default="Draft")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    kpi_plan = relationship("KpiPlan")


class CareerDevelopment(Base):
    __tablename__ = "career_developments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    performance_rating = Column(String(40), nullable=True)
    potential_rating = Column(Enum(*POTENTIAL_RATINGS, name="potential_rating"), nullable=True)
    readiness_level = Column(Enum(*READINESS_LEVELS, name="readiness_level"), nullable=True)
    career_goal = Column(Text, nullable=True)
    target_position = Column(String(100), nullable=True)
    career_path = Column(Text, nullable=True)
    development_area = Column(Text, nullable=True)
    training_required = Column(Integer, ForeignKey("training_plans.id"), nullable=True)
    coaching_required = Column(String(10), nullable=True)
    mentoring_required = Column(String(10), nullable=True)
    successor_candidate = Column(String(10), nullable=True)
    talent_pool = Column(Enum(*TALENT_POOLS, name="talent_pool"), nullable=True)
    review_date = Column(Date, nullable=True)
    next_review_date = Column(Date, nullable=True)
    dev_status = Column(Enum(*DEV_STATUSES, name="dev_status"), nullable=False, default="Active")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    training = relationship("TrainingPlan")


class PerformanceImprovementPlan(Base):
    __tablename__ = "performance_improvement_plans"

    id = Column(Integer, primary_key=True, index=True)
    pip_no = Column(String(20), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pip_start_date = Column(Date, nullable=False)
    pip_end_date = Column(Date, nullable=False)
    pip_duration = Column(Integer, nullable=True)
    initiated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    performance_issue = Column(Text, nullable=False)
    root_cause_analysis = Column(Text, nullable=True)
    improvement_objective = Column(Text, nullable=False)
    success_criteria = Column(Text, nullable=True)
    action_plan = Column(Text, nullable=True)
    training_required = Column(Integer, ForeignKey("training_plans.id"), nullable=True)
    coaching_required = Column(String(10), nullable=True)
    mentor_assigned = Column(Integer, ForeignKey("users.id"), nullable=True)
    review_frequency = Column(Enum(*REVIEW_FREQUENCIES, name="review_frequency"), nullable=False, default="Weekly")
    progress_status = Column(Enum(*PIP_STATUSES, name="pip_progress_status"), nullable=False, default="Draft")
    progress_comment = Column(Text, nullable=True)
    final_result = Column(Enum(*PIP_FINAL_RESULTS, name="pip_final_result"), nullable=True)
    recommendation = Column(Enum(*PIP_RECOMMENDATIONS, name="pip_recommendation"), nullable=True)
    approval_status = Column(String(30), nullable=False, default="Draft")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    initiator = relationship("User", foreign_keys=[initiated_by])
    mentor = relationship("User", foreign_keys=[mentor_assigned])
    training = relationship("TrainingPlan", foreign_keys=[training_required])
