from sqlalchemy import DECIMAL, Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, JSON, String, Text, Time, func
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
    name = Column(String(120), nullable=True)
    name_khmer = Column(String(120), nullable=True)
    gender = Column(String(10), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    place_of_birth = Column(String(100), nullable=True)
    marital_status = Column(String(30), nullable=True)
    nationality = Column(String(60), nullable=True)
    phone = Column(String(50), nullable=True)
    personal_email = Column(String(120), nullable=True)
    address = Column(String(255), nullable=True)
    permanent_address = Column(String(255), nullable=True)
    national_id = Column(String(50), nullable=True)
    id_issue_date = Column(Date, nullable=True)
    id_expiry_date = Column(Date, nullable=True)
    passport_no = Column(String(50), nullable=True)
    passport_expiry_date = Column(Date, nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)
    emergency_contact_phone = Column(String(50), nullable=True)
    spouse_name = Column(String(100), nullable=True)
    children_count = Column(Integer, nullable=True, default=0)
    bank_name = Column(String(100), nullable=True)
    bank_account_name = Column(String(100), nullable=True)
    bank_account = Column(String(100), nullable=True)
    profile_photo = Column(Text, nullable=True)
    position = Column(String(100), nullable=True)
    sub_department = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)
    job_grade = Column(String(50), nullable=True)
    job_level = Column(String(50), nullable=True)
    contract_type = Column(String(50), nullable=False, default="Full-Time")
    contract_start_date = Column(Date, nullable=True)
    contract_end_date = Column(Date, nullable=True)
    confirmation_date = Column(Date, nullable=True)
    probation_end_date = Column(Date, nullable=True)
    join_date = Column(Date, nullable=True)
    resignation_date = Column(Date, nullable=True)
    employment_status = Column(String(30), nullable=False, default="Active")
    basic_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    work_email = Column(String(120), nullable=True)
    extension_no = Column(String(30), nullable=True)
    workstation = Column(String(60), nullable=True)
    payroll_group = Column(String(50), nullable=True)
    cost_center = Column(String(50), nullable=True)
    employee_category = Column(String(30), nullable=True)
    supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_head_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="profile", foreign_keys=[user_id])
    supervisor = relationship("User", foreign_keys=[supervisor_id])
    department_head = relationship("User", foreign_keys=[department_head_id])


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


# ── Payroll, Compensation & Staff Movement ──

PAYROLL_CYCLES = ("Monthly", "Bi-Weekly", "Weekly")
PAYROLL_BATCH_STATUSES = ("Draft", "Calculated", "Approved", "Paid", "Reversed")
PAYROLL_EMPLOYEE_STATUSES = ("Draft", "Calculated", "Approved", "Paid")
PAYMENT_METHODS = ("Bank Transfer", "Cash")

SALARY_GRADES = ("Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5")
SALARY_BANDS = ("Low", "Medium", "High")
ALLOWANCE_TYPES = ("Transport", "Phone", "Meal", "Housing", "Position", "Other")
ADJUSTMENT_TYPES = ("Annual Increment", "Promotion Adjustment", "Market Adjustment", "Special Adjustment", "Probation Confirmation")
COMP_STATUSES = ("Active", "Pending Approval", "Approved", "Rejected", "Expired")

BENEFIT_TYPES = ("Health Insurance", "Accident Insurance", "Life Insurance", "Transportation Allowance", "Phone Allowance", "Meal Allowance", "Uniform Benefit", "Profit Sharing Bonus", "Performance Bonus", "Seniority Payment", "Wedding Gift", "Funeral Support", "Maternity Benefit", "Other Benefits")
BENEFIT_STATUSES = ("Active", "Pending Approval", "Approved", "Rejected", "Expired", "Suspended")

SENIORITY_PERIODS = ("Mid-Year Seniority", "Year-End Seniority", "Outstanding Seniority")
SEVERANCE_TYPES = ("Contract Completion", "Employment Termination", "Mutual Agreement", "Other Compensation")
SS_STATUSES = ("Draft", "Pending Approval", "Approved", "Paid", "Cancelled")

MOVEMENT_TYPES = ("Promotion", "Transfer", "Demotion", "Acting Assignment", "Salary Adjustment", "Reporting Line Change", "Employment Status Change")
MOVEMENT_STATUSES = ("Draft", "Pending Approval", "Approved", "Effective", "Rejected", "Cancelled")


class PayrollBatch(Base):
    __tablename__ = "payroll_batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_no = Column(String(30), unique=True, nullable=False)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    cycle = Column(Enum(*PAYROLL_CYCLES, name="payroll_cycle"), nullable=False, default="Monthly")
    status = Column(Enum(*PAYROLL_BATCH_STATUSES, name="payroll_batch_status"), nullable=False, default="Draft")
    total_basic = Column(DECIMAL(14, 2), nullable=False, default=0)
    total_allowances = Column(DECIMAL(14, 2), nullable=False, default=0)
    total_overtime = Column(DECIMAL(14, 2), nullable=False, default=0)
    total_deductions = Column(DECIMAL(14, 2), nullable=False, default=0)
    total_net = Column(DECIMAL(14, 2), nullable=False, default=0)
    employee_count = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    employees = relationship("PayrollEmployee", back_populates="batch")


class PayrollEmployee(Base):
    __tablename__ = "payroll_employees"

    id = Column(Integer, primary_key=True, index=True)
    batch_id = Column(Integer, ForeignKey("payroll_batches.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    basic_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    allowances = Column(JSON, nullable=True)
    gross_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    working_days = Column(Integer, nullable=False, default=0)
    present_days = Column(Integer, nullable=False, default=0)
    absent_days = Column(Integer, nullable=False, default=0)
    leave_days = Column(Integer, nullable=False, default=0)
    late_deduction = Column(DECIMAL(12, 2), nullable=False, default=0)
    ot_hours = Column(DECIMAL(6, 2), nullable=False, default=0)
    ot_amount = Column(DECIMAL(12, 2), nullable=False, default=0)
    nssf = Column(DECIMAL(12, 2), nullable=False, default=0)
    tax = Column(DECIMAL(12, 2), nullable=False, default=0)
    other_deductions = Column(JSON, nullable=True)
    net_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    status = Column(Enum(*PAYROLL_EMPLOYEE_STATUSES, name="payroll_emp_status"), nullable=False, default="Draft")
    payment_date = Column(Date, nullable=True)
    payment_method = Column(Enum(*PAYMENT_METHODS, name="payment_method"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    batch = relationship("PayrollBatch", back_populates="employees")
    user = relationship("User")


class Compensation(Base):
    __tablename__ = "compensations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    salary_grade = Column(Enum(*SALARY_GRADES, name="salary_grade"), nullable=True)
    salary_band = Column(Enum(*SALARY_BANDS, name="salary_band"), nullable=True)
    basic_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    allowance_type = Column(Enum(*ALLOWANCE_TYPES, name="allowance_type"), nullable=True)
    allowance_amount = Column(DECIMAL(12, 2), nullable=False, default=0)
    benefit_package = Column(String(100), nullable=True)
    adjustment_type = Column(Enum(*ADJUSTMENT_TYPES, name="adjustment_type"), nullable=True)
    effective_date = Column(Date, nullable=True)
    previous_salary = Column(DECIMAL(12, 2), nullable=True)
    new_salary = Column(DECIMAL(12, 2), nullable=True)
    adjustment_amount = Column(DECIMAL(12, 2), nullable=True)
    adjustment_reason = Column(Text, nullable=True)
    approval_status = Column(Enum(*COMP_STATUSES, name="comp_status"), nullable=False, default="Active")
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class EmployeeBenefit(Base):
    __tablename__ = "employee_benefits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    benefit_type = Column(Enum(*BENEFIT_TYPES, name="benefit_type"), nullable=False)
    benefit_name = Column(String(120), nullable=False)
    effective_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    benefit_value = Column(DECIMAL(12, 2), nullable=False, default=0)
    status = Column(Enum(*BENEFIT_STATUSES, name="benefit_status"), nullable=False, default="Active")
    utilization_date = Column(Date, nullable=True)
    utilization_amount = Column(DECIMAL(12, 2), nullable=True)
    approval_status = Column(String(30), nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class SenioritySeverance(Base):
    __tablename__ = "seniority_severances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    payment_type = Column(String(30), nullable=False)
    severance_type = Column(String(50), nullable=True)
    join_date = Column(Date, nullable=True)
    years_of_service = Column(Integer, nullable=True)
    eligible_salary = Column(DECIMAL(12, 2), nullable=False, default=0)
    payment_amount = Column(DECIMAL(12, 2), nullable=False, default=0)
    payment_date = Column(Date, nullable=True)
    status = Column(Enum(*SS_STATUSES, name="ss_status"), nullable=False, default="Draft")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User")


class StaffMovement(Base):
    __tablename__ = "staff_movements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    movement_no = Column(String(30), unique=True, nullable=False)
    movement_type = Column(Enum(*MOVEMENT_TYPES, name="movement_type"), nullable=False)
    effective_date = Column(Date, nullable=False)
    reason = Column(Text, nullable=True)
    current_department = Column(String(100), nullable=True)
    new_department = Column(String(100), nullable=True)
    current_position = Column(String(100), nullable=True)
    new_position = Column(String(100), nullable=True)
    current_supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    new_supervisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    current_salary = Column(DECIMAL(12, 2), nullable=True)
    new_salary = Column(DECIMAL(12, 2), nullable=True)
    salary_difference = Column(DECIMAL(12, 2), nullable=True)
    requested_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    approval_status = Column(Enum(*MOVEMENT_STATUSES, name="movement_status"), nullable=False, default="Draft")
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    approval_date = Column(Date, nullable=True)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    requester = relationship("User", foreign_keys=[requested_by])
    approver = relationship("User", foreign_keys=[approved_by])
    current_supervisor = relationship("User", foreign_keys=[current_supervisor_id])
    new_supervisor = relationship("User", foreign_keys=[new_supervisor_id])


# ── Employee Information Management ──

JOB_LEVELS = ("Staff", "Senior", "Supervisor", "Manager", "Director", "VP", "C-Level")
DOC_TYPES = (
    "National ID Card", "Passport", "Family Book", "Birth Certificate",
    "CV / Resume", "Employment Contract", "Promotion Letter", "Transfer Letter",
    "Warning Letter", "Resignation Letter", "Bank Book", "Salary Adjustment Letter",
    "NDA", "Policy Acknowledgement", "Certificate", "Training Record",
)
DOC_STATUSES = ("Active", "Expired", "Archived")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False)
    name = Column(String(120), nullable=False)
    parent_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department_head_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    effective_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="Active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    parent = relationship("Department", foreign_keys=[parent_id], remote_side="Department.id")
    head = relationship("User", foreign_keys=[department_head_id])


class Position(Base):
    __tablename__ = "positions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(30), unique=True, nullable=False)
    title = Column(String(120), nullable=False)
    job_level = Column(Enum(*JOB_LEVELS, name="job_level"), nullable=True)
    grade = Column(String(30), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    reports_to_id = Column(Integer, ForeignKey("positions.id"), nullable=True)
    headcount_budget = Column(Integer, nullable=True, default=0)
    current_headcount = Column(Integer, nullable=True, default=0)
    effective_date = Column(Date, nullable=True)
    status = Column(String(20), nullable=False, default="Active")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    department = relationship("Department")
    reports_to = relationship("Position", foreign_keys=[reports_to_id], remote_side="Position.id")


class EmployeeDocument(Base):
    __tablename__ = "employee_documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    doc_type = Column(Enum(*DOC_TYPES, name="doc_type"), nullable=False)
    doc_name = Column(String(120), nullable=False)
    doc_number = Column(String(60), nullable=True)
    issue_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True)
    file_path = Column(Text, nullable=True)
    file_version = Column(Integer, nullable=True, default=1)
    status = Column(Enum(*DOC_STATUSES, name="doc_status"), nullable=False, default="Active")
    remarks = Column(Text, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", foreign_keys=[user_id])
    uploader = relationship("User", foreign_keys=[uploaded_by])
