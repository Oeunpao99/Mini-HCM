from datetime import date, datetime, time
from decimal import Decimal

from sqlalchemy import inspect, text

from app.core.schema import ensure_runtime_schema
from app.core.seed import seed_default_data
from app.db.session import Base, SessionLocal, engine
from app.models.app_setting import AppSetting
from app.models.attendance.models import Attendance
from app.models.company_location import CompanyLocation
from app.models.hris import (
    CareerDevelopment,
    Compensation,
    CompetencyAssessment,
    Department,
    EmployeeBenefit,
    EmployeeDocument,
    EmployeeHistory,
    EmployeeMovementRequest,
    EmployeeProfile,
    KpiMonitoring,
    KpiPlan,
    KpiRecord,
    PayrollBatch,
    PayrollEmployee,
    PayrollRecord,
    PerformanceImprovementPlan,
    PerformanceReview,
    Position,
    PublicHoliday,
    ScheduleChange,
    SenioritySeverance,
    ShiftSchedule,
    StaffMovement,
    TrainingPlan,
    TrainingRecord,
)
from app.models.leave.models import LeaveEntitlement, LeaveRequest
from app.models.location_alert import LocationAlert
from app.models.ot.models import OtRequest
from app.models.request import Request
from app.models.shift.models import ShiftMaster
from app.models.swap_request import SwapRequest
from app.models.user import User


def first_user(db, emp_code: str) -> User:
    user = db.query(User).filter(User.emp_code == emp_code).first()
    if not user:
        raise RuntimeError(f"Missing seeded user {emp_code}")
    return user


def add_if_missing(db, model, filters: dict, values: dict):
    row = db.query(model).filter_by(**filters).first()
    if row:
        return row, False
    row = model(**values)
    db.add(row)
    db.flush()
    return row, True


def table_has_column(db, table_name: str, column_name: str) -> bool:
    return column_name in {column["name"] for column in inspect(db.get_bind()).get_columns(table_name)}


def relax_legacy_training_record_start_date(db) -> None:
    if not table_has_column(db, "training_records", "start_date"):
        return
    dialect = db.get_bind().dialect.name
    db.execute(
        text(
            """
            UPDATE training_records
            SET training_date = COALESCE(training_date, start_date),
                start_date = COALESCE(start_date, training_date, CURRENT_DATE)
            """
        )
    )
    if dialect == "postgresql":
        db.execute(text("ALTER TABLE training_records ALTER COLUMN start_date DROP NOT NULL"))


def profile_for(db, user: User) -> EmployeeProfile:
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user.id).first()
    if not profile:
        profile = EmployeeProfile(user_id=user.id, basic_salary=Decimal("900.00"), contract_type="Full-Time")
        db.add(profile)
        db.flush()
    return profile


def seed_all_models() -> dict[str, int]:
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema(engine)

    db = SessionLocal()
    created: dict[str, int] = {}

    def mark(name: str, was_created: bool):
        if was_created:
            created[name] = created.get(name, 0) + 1

    try:
        seed_default_data(db)
        relax_legacy_training_record_start_date(db)

        hr = first_user(db, "EMP001")
        dev_head = first_user(db, "EMP002")
        finance_head = first_user(db, "EMP003")
        hr_head = first_user(db, "EMP004")
        ops_head = first_user(db, "EMP005")
        dev_manager = first_user(db, "EMP006")
        dev_staff = first_user(db, "EMP007")
        finance_staff = first_user(db, "EMP008")
        hr_staff = first_user(db, "EMP009")
        ops_staff = first_user(db, "EMP010")
        payroll = first_user(db, "EMP011")
        users = [hr, dev_head, finance_head, hr_head, ops_head, dev_manager, dev_staff, finance_staff, hr_staff, ops_staff, payroll]

        loc, made = add_if_missing(
            db,
            CompanyLocation,
            {"id": 2},
            {"id": 2, "latitude": Decimal("11.55640000"), "longitude": Decimal("104.92820000"), "radius_meters": 150},
        )
        mark("company_location", made)

        lookups, made = add_if_missing(
            db,
            AppSetting,
            {"key": "hris_lookup_settings"},
            {
                "key": "hris_lookup_settings",
                "value": (
                    '{"departments":["Human Resources","Developer","Finance","Operations"],'
                    '"sub_departments":["Recruitment","Payroll","AI","Web Developer","Support"],'
                    '"positions":["HR Manager","Department Head","Line Manager","Payroll Officer","Employee"],'
                    '"job_grades":["G1","G2","G3","G4","M1"],'
                    '"employment_statuses":["active","on_leave","inactive","resigned"]}'
                ),
            },
        )
        mark("app_settings", made)

        department_map = {}
        for code, name, head in [
            ("HR", "Human Resources", hr_head),
            ("DEV", "Developer", dev_head),
            ("FIN", "Finance", finance_head),
            ("OPS", "Operations", ops_head),
        ]:
            dept, made = add_if_missing(
                db,
                Department,
                {"code": code},
                {"code": code, "name": name, "department_head_id": head.id, "effective_date": date(2026, 1, 1), "status": "Active"},
            )
            department_map[code] = dept
            mark("departments", made)

        position_map = {}
        for code, title, level, grade, dept_code, budget in [
            ("HR-MGR", "HR Manager", "Manager", "M1", "HR", 1),
            ("DEV-HEAD", "Developer Head", "Director", "M1", "DEV", 1),
            ("DEV-LM", "Developer Line Manager", "Manager", "G4", "DEV", 2),
            ("DEV-WEB", "Web Developer", "Staff", "G2", "DEV", 8),
            ("FIN-PAY", "Payroll Officer", "Senior", "G3", "FIN", 2),
            ("OPS-SUP", "Operations Support", "Staff", "G1", "OPS", 6),
        ]:
            pos, made = add_if_missing(
                db,
                Position,
                {"code": code},
                {
                    "code": code,
                    "title": title,
                    "job_level": level,
                    "grade": grade,
                    "department_id": department_map[dept_code].id,
                    "headcount_budget": budget,
                    "current_headcount": 1,
                    "effective_date": date(2026, 1, 1),
                    "status": "Active",
                },
            )
            position_map[code] = pos
            mark("positions", made)

        for user in users:
            profile = profile_for(db, user)
            profile.name = user.name
            profile.work_email = user.email
            profile.department = user.department
            profile.join_date = profile.join_date or date(2026, 1, 1)
            profile.confirmation_date = profile.confirmation_date or date(2026, 4, 1)
            profile.probation_end_date = profile.probation_end_date or date(2026, 3, 31)
            profile.gender = profile.gender or ("Female" if user.emp_code in {"EMP001", "EMP004", "EMP009"} else "Male")
            profile.nationality = profile.nationality or "Cambodian"
            profile.marital_status = profile.marital_status or "Single"
            profile.job_grade = profile.job_grade or ("M1" if user.role == "department_head" else "G2")
            profile.job_level = profile.job_level or ("Manager" if user.role in {"management_hr", "department_head", "line_manager"} else "Staff")
            profile.supervisor_id = profile.supervisor_id or user.manager_id
            profile.department_head_id = profile.department_head_id or {
                "Developer": dev_head.id,
                "Finance": finance_head.id,
                "HR": hr_head.id,
                "Operations": ops_head.id,
            }.get(user.department)

            entitlement, made = add_if_missing(
                db,
                LeaveEntitlement,
                {"user_id": user.id},
                {"user_id": user.id, "annual": 18, "sick": 6, "special": 2, "business": 3},
            )
            mark("leave_entitlements", made)

            doc, made = add_if_missing(
                db,
                EmployeeDocument,
                {"user_id": user.id, "doc_type": "Employment Contract"},
                {
                    "user_id": user.id,
                    "doc_type": "Employment Contract",
                    "doc_name": f"{user.emp_code} employment contract",
                    "doc_number": f"CON-{user.emp_code}",
                    "issue_date": date(2026, 1, 1),
                    "expiry_date": date(2027, 1, 1),
                    "file_path": f"/demo/documents/{user.emp_code}-contract.pdf",
                    "file_version": 1,
                    "status": "Active",
                    "uploaded_by": hr.id,
                    "remarks": "Seeded document record.",
                },
            )
            mark("employee_documents", made)

        shift_day, made = add_if_missing(
            db,
            ShiftMaster,
            {"shift_code": "DAY"},
            {
                "shift_code": "DAY",
                "shift_name": "Standard Day Shift",
                "shift_type": "fixed",
                "start_time": time(8, 0),
                "end_time": time(17, 30),
                "break_start_time": time(12, 0),
                "break_end_time": time(13, 0),
                "working_hours": Decimal("8.50"),
                "late_tolerance_minutes": 10,
                "early_leave_tolerance_minutes": 10,
                "is_active": True,
            },
        )
        mark("shift_master", made)
        shift_night, made = add_if_missing(
            db,
            ShiftMaster,
            {"shift_code": "NIGHT"},
            {
                "shift_code": "NIGHT",
                "shift_name": "Night Support Shift",
                "shift_type": "night",
                "start_time": time(21, 0),
                "end_time": time(6, 0),
                "working_hours": Decimal("8.00"),
                "late_tolerance_minutes": 15,
                "early_leave_tolerance_minutes": 15,
                "is_active": True,
            },
        )
        mark("shift_master", made)

        for idx, user in enumerate(users):
            work_date = date(2026, 7, 1)
            attendance, made = add_if_missing(
                db,
                Attendance,
                {"user_id": user.id, "date": work_date},
                {
                    "user_id": user.id,
                    "date": work_date,
                    "check_in_time": time(8, idx % 12),
                    "check_in_lat": Decimal("11.52812457"),
                    "check_in_lon": Decimal("104.91222854"),
                    "check_out_time": time(17, 30),
                    "check_out_lat": Decimal("11.52812457"),
                    "check_out_lon": Decimal("104.91222854"),
                    "is_late": idx % 5 == 0,
                    "worked_hours": Decimal("8.50"),
                    "remark": "Seeded attendance",
                },
            )
            mark("attendance", made)

            schedule, made = add_if_missing(
                db,
                ShiftSchedule,
                {"user_id": user.id, "work_date": date(2026, 7, 2)},
                {
                    "user_id": user.id,
                    "shift_id": shift_day.id,
                    "shift_name": shift_day.shift_name,
                    "work_date": date(2026, 7, 2),
                    "start_time": shift_day.start_time,
                    "end_time": shift_day.end_time,
                    "location": "Head Office",
                    "schedule_status": "Planned",
                    "remarks": "Seeded schedule",
                },
            )
            mark("shift_schedules", made)

        schedule = db.query(ShiftSchedule).filter(ShiftSchedule.user_id == dev_staff.id, ShiftSchedule.work_date == date(2026, 7, 2)).first()
        change, made = add_if_missing(
            db,
            ScheduleChange,
            {"user_id": dev_staff.id, "reason": "Seeded temporary night support coverage"},
            {
                "schedule_id": schedule.id if schedule else None,
                "user_id": dev_staff.id,
                "old_shift": "Standard Day Shift",
                "new_shift": "Night Support Shift",
                "reason": "Seeded temporary night support coverage",
                "status": "approved",
                "changed_by": dev_manager.id,
            },
        )
        mark("schedule_changes", made)

        leave, made = add_if_missing(
            db,
            LeaveRequest,
            {"user_id": dev_staff.id, "date": date(2026, 7, 8), "leave_type": "annual"},
            {
                "user_id": dev_staff.id,
                "date": date(2026, 7, 8),
                "leave_type": "annual",
                "reason": "Family appointment",
                "backup_user_id": ops_staff.id,
                "backup_status": "approved",
                "line_manager_status": "approved",
                "department_head_status": "pending",
                "hr_status": "pending",
                "status": "pending",
            },
        )
        mark("leave_requests", made)

        request, made = add_if_missing(
            db,
            Request,
            {"user_id": finance_staff.id, "type": "permission", "date": date(2026, 7, 9)},
            {
                "user_id": finance_staff.id,
                "type": "permission",
                "date": date(2026, 7, 9),
                "start_time": time(14, 0),
                "end_time": time(16, 0),
                "reason": "Bank appointment",
                "line_manager_status": "approved",
                "department_head_status": "pending",
                "hr_status": "pending",
                "status": "pending",
            },
        )
        mark("requests", made)

        ot, made = add_if_missing(
            db,
            OtRequest,
            {"user_id": dev_staff.id, "date": date(2026, 7, 5)},
            {
                "user_id": dev_staff.id,
                "date": date(2026, 7, 5),
                "start_time": time(18, 0),
                "end_time": time(21, 0),
                "ot_type": "Project",
                "total_hours": Decimal("3.00"),
                "project_task": "Payroll release support",
                "reason": "Critical release window",
                "line_manager_status": "approved",
                "department_head_status": "approved",
                "hr_status": "pending",
                "status": "pending",
            },
        )
        mark("ot_requests", made)

        swap, made = add_if_missing(
            db,
            SwapRequest,
            {"requester_id": dev_staff.id, "target_user_id": ops_staff.id, "swap_date": date(2026, 7, 12)},
            {
                "requester_id": dev_staff.id,
                "target_user_id": ops_staff.id,
                "swap_date": date(2026, 7, 12),
                "status": "pending",
            },
        )
        mark("swap_requests", made)

        alert, made = add_if_missing(
            db,
            LocationAlert,
            {"user_id": ops_staff.id, "date": date(2026, 7, 1), "action_type": "check_in"},
            {
                "user_id": ops_staff.id,
                "date": date(2026, 7, 1),
                "latitude": Decimal("11.53000000"),
                "longitude": Decimal("104.91500000"),
                "distance_meters": Decimal("385.50"),
                "action_type": "check_in",
                "message": "Seed alert: employee checked in outside configured radius.",
            },
        )
        mark("location_alerts", made)

        movement, made = add_if_missing(
            db,
            EmployeeMovementRequest,
            {"user_id": dev_staff.id, "movement_type": "promotion", "effective_date": date(2026, 8, 1)},
            {
                "user_id": dev_staff.id,
                "requested_by": dev_manager.id,
                "movement_type": "promotion",
                "effective_date": date(2026, 8, 1),
                "current_position": "Employee",
                "proposed_position": "Senior Web Developer",
                "current_department": "Developer",
                "proposed_department": "Developer",
                "current_sub_department": "Web Developer",
                "proposed_sub_department": "Web Developer",
                "current_job_grade": "G2",
                "proposed_job_grade": "G3",
                "current_salary": Decimal("900.00"),
                "proposed_salary": Decimal("1100.00"),
                "reason": "Strong delivery performance",
                "status": "pending",
            },
        )
        mark("employee_movement_requests", made)

        public_holiday, made = add_if_missing(
            db,
            PublicHoliday,
            {"holiday_date": date(2026, 11, 9)},
            {"name": "Independence Day", "holiday_date": date(2026, 11, 9), "country": "Cambodia"},
        )
        mark("public_holidays", made)

        training_plan, made = add_if_missing(
            db,
            TrainingPlan,
            {"plan_id": "TP-0001"},
            {
                "plan_id": "TP-0001",
                "title": "Leadership Essentials",
                "category": "Leadership",
                "training_type": "Workshop",
                "training_year": 2026,
                "objective": "Build coaching and feedback skills for line managers.",
                "department": "Developer",
                "position": "Line Manager",
                "employee_id": dev_manager.id,
                "planned_start_date": date(2026, 7, 15),
                "planned_end_date": date(2026, 7, 16),
                "duration": 2,
                "trainer": "Internal HR",
                "venue": "Training Room A",
                "estimated_cost": Decimal("450.00"),
                "actual_cost": Decimal("0.00"),
                "requested_by": hr.id,
                "approval_status": "Approved",
                "training_status": "Planned",
                "remarks": "Seeded training plan.",
            },
        )
        mark("training_plans", made)

        for user in [dev_manager, dev_staff, hr_staff]:
            rec, made = add_if_missing(
                db,
                TrainingRecord,
                {"user_id": user.id, "title": "Leadership Essentials"},
                {
                    "user_id": user.id,
                    "plan_id": training_plan.id,
                    "title": "Leadership Essentials",
                    "training_type": "Workshop",
                    "category": "Leadership",
                    "provider": "Internal HR",
                    "training_date": date(2026, 7, 15),
                    "end_date": date(2026, 7, 16),
                    "duration": Decimal("16.0"),
                    "training_method": "Classroom",
                    "attendance_status": "Present",
                    "completion_status": "In Progress",
                    "assessment_result": "Not Applicable",
                    "score": None,
                    "skills_gained": "Feedback, coaching, action planning",
                    "certification": "No",
                    "verified_by": hr.id,
                    "status": "Draft",
                    "remarks": "Seeded training record.",
                },
            )
            mark("training_records", made)

        comp_assessment, made = add_if_missing(
            db,
            CompetencyAssessment,
            {"user_id": dev_staff.id, "assessment_type": "Annual"},
            {
                "user_id": dev_staff.id,
                "assessment_type": "Annual",
                "assessment_period_start": date(2026, 1, 1),
                "assessment_period_end": date(2026, 6, 30),
                "assessor_id": dev_manager.id,
                "assessment_date": date(2026, 7, 3),
                "competency_model": "Engineering competency model",
                "technical_skills": "React, FastAPI, PostgreSQL",
                "soft_skills": "Collaboration and communication",
                "behavioral_competency": "Ownership and delivery",
                "technical_score": Decimal("86.00"),
                "soft_skills_score": Decimal("82.00"),
                "behavioral_score": Decimal("88.00"),
                "overall_score": Decimal("85.50"),
                "competency_level": "Advanced",
                "strengths": "Reliable delivery",
                "improvement_areas": "Architecture documentation",
                "development_needs": "System design mentoring",
                "training_recommendation_id": training_plan.id,
                "coaching_required": "Yes",
                "verified_by": hr.id,
                "approval_status": "Submitted",
                "remarks": "Seeded competency assessment.",
            },
        )
        mark("competency_assessments", made)

        kpi_plan, made = add_if_missing(
            db,
            KpiPlan,
            {"kpi_plan_id": "KPI-0001"},
            {
                "kpi_plan_id": "KPI-0001",
                "kpi_period": "Semester 1",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "user_id": dev_staff.id,
                "kpi_category": "Individual",
                "kpi_code": "DEV-QA",
                "kpi_title": "Delivery quality",
                "kpi_description": "Maintain high quality delivery with low rework.",
                "measurement_method": "Percentage",
                "target_value": Decimal("95.00"),
                "weight": Decimal("40.00"),
                "minimum_achievement": Decimal("80.00"),
                "data_source": "Sprint reports",
                "responsible_person": dev_manager.id,
                "line_manager_approval": "Approved",
                "hr_review": "Approved",
                "final_status": "Active",
                "remarks": "Seeded KPI plan.",
            },
        )
        mark("kpi_plans", made)

        monitoring, made = add_if_missing(
            db,
            KpiMonitoring,
            {"kpi_plan_id": kpi_plan.id, "monitoring_date": date(2026, 6, 30)},
            {
                "kpi_plan_id": kpi_plan.id,
                "monitoring_date": date(2026, 6, 30),
                "current_achievement": Decimal("91.00"),
                "achievement_pct": Decimal("95.79"),
                "kpi_score": Decimal("38.32"),
                "status": "On Track",
                "supporting_evidence": "Sprint QA dashboard",
                "employee_comment": "Improved test coverage during Q2.",
                "manager_comment": "Good progress.",
                "action_required": "Improve release documentation.",
                "monitoring_status": "Reviewed",
                "remarks": "Seeded KPI monitoring.",
            },
        )
        mark("kpi_monitoring", made)

        career, made = add_if_missing(
            db,
            CareerDevelopment,
            {"user_id": dev_staff.id, "target_position": "Senior Web Developer"},
            {
                "user_id": dev_staff.id,
                "performance_rating": "Meets Expectations",
                "potential_rating": "High",
                "readiness_level": "Ready in 1 Year",
                "career_goal": "Grow into senior engineering ownership.",
                "target_position": "Senior Web Developer",
                "career_path": "Developer -> Senior Developer -> Tech Lead",
                "development_area": "System design and mentoring",
                "training_required": training_plan.id,
                "coaching_required": "Yes",
                "mentoring_required": "Yes",
                "successor_candidate": "No",
                "talent_pool": "Emerging Talent",
                "review_date": date(2026, 7, 1),
                "next_review_date": date(2027, 1, 1),
                "dev_status": "Active",
                "remarks": "Seeded career plan.",
            },
        )
        mark("career_developments", made)

        pip, made = add_if_missing(
            db,
            PerformanceImprovementPlan,
            {"pip_no": "PIP-0001"},
            {
                "pip_no": "PIP-0001",
                "user_id": ops_staff.id,
                "pip_start_date": date(2026, 7, 1),
                "pip_end_date": date(2026, 9, 30),
                "pip_duration": 90,
                "initiated_by": ops_head.id,
                "performance_issue": "Repeated late report submission",
                "root_cause_analysis": "Manual tracking and unclear deadlines",
                "improvement_objective": "Submit operational reports by 10:00 every Monday",
                "success_criteria": "Four consecutive on-time submissions",
                "action_plan": "Weekly check-ins and report template coaching",
                "training_required": training_plan.id,
                "coaching_required": "Yes",
                "mentor_assigned": ops_head.id,
                "review_frequency": "Weekly",
                "progress_status": "Active",
                "progress_comment": "Initial coaching started.",
                "approval_status": "Draft",
                "remarks": "Seeded PIP.",
            },
        )
        mark("performance_improvement_plans", made)

        batch, made = add_if_missing(
            db,
            PayrollBatch,
            {"batch_no": "PAY-2026-07"},
            {
                "batch_no": "PAY-2026-07",
                "month": 7,
                "year": 2026,
                "cycle": "Monthly",
                "status": "Calculated",
                "total_basic": Decimal("0.00"),
                "total_allowances": Decimal("0.00"),
                "total_overtime": Decimal("0.00"),
                "total_deductions": Decimal("0.00"),
                "total_net": Decimal("0.00"),
                "employee_count": 0,
                "notes": "Seeded payroll batch.",
            },
        )
        mark("payroll_batches", made)

        batch_basic = Decimal("0.00")
        batch_allowances = Decimal("0.00")
        batch_ot = Decimal("0.00")
        batch_deductions = Decimal("0.00")
        batch_net = Decimal("0.00")
        batch_count = 0
        for user in users[:6]:
            profile = profile_for(db, user)
            basic = Decimal(profile.basic_salary or 900)
            allowance = Decimal("50.00")
            ot_amount = Decimal("20.00") if user.role == "staff" else Decimal("0.00")
            nssf = (basic * Decimal("0.02")).quantize(Decimal("0.01"))
            tax = (basic * Decimal("0.05")).quantize(Decimal("0.01")) if basic >= Decimal("1200.00") else Decimal("0.00")
            gross = basic + allowance + ot_amount
            net = gross - nssf - tax
            pe, made = add_if_missing(
                db,
                PayrollEmployee,
                {"batch_id": batch.id, "user_id": user.id},
                {
                    "batch_id": batch.id,
                    "user_id": user.id,
                    "basic_salary": basic,
                    "allowances": {"transport": 30, "phone": 20},
                    "gross_salary": gross,
                    "working_days": 22,
                    "present_days": 21,
                    "absent_days": 0,
                    "leave_days": 1,
                    "late_deduction": Decimal("0.00"),
                    "ot_hours": Decimal("2.00") if user.role == "staff" else Decimal("0.00"),
                    "ot_amount": ot_amount,
                    "nssf": nssf,
                    "tax": tax,
                    "other_deductions": {"loan": 0},
                    "net_salary": net,
                    "status": "Calculated",
                    "payment_method": "Bank Transfer",
                },
            )
            mark("payroll_employees", made)
            batch_basic += basic
            batch_allowances += allowance
            batch_ot += ot_amount
            batch_deductions += nssf + tax
            batch_net += net
            batch_count += 1
        batch.total_basic = batch_basic
        batch.total_allowances = batch_allowances
        batch.total_overtime = batch_ot
        batch.total_deductions = batch_deductions
        batch.total_net = batch_net
        batch.employee_count = batch_count

        comp, made = add_if_missing(
            db,
            Compensation,
            {"user_id": dev_staff.id, "adjustment_type": "Annual Increment"},
            {
                "user_id": dev_staff.id,
                "salary_grade": "Grade 2",
                "salary_band": "Medium",
                "basic_salary": Decimal("900.00"),
                "allowance_type": "Transport",
                "allowance_amount": Decimal("50.00"),
                "benefit_package": "Standard employee package",
                "adjustment_type": "Annual Increment",
                "effective_date": date(2026, 7, 1),
                "previous_salary": Decimal("850.00"),
                "new_salary": Decimal("900.00"),
                "adjustment_amount": Decimal("50.00"),
                "adjustment_reason": "Annual salary review",
                "approval_status": "Approved",
                "remarks": "Seeded compensation record.",
            },
        )
        mark("compensations", made)

        benefit, made = add_if_missing(
            db,
            EmployeeBenefit,
            {"user_id": dev_staff.id, "benefit_type": "Health Insurance"},
            {
                "user_id": dev_staff.id,
                "benefit_type": "Health Insurance",
                "benefit_name": "Standard health plan",
                "effective_date": date(2026, 1, 1),
                "expiry_date": date(2026, 12, 31),
                "benefit_value": Decimal("300.00"),
                "status": "Active",
                "utilization_date": date(2026, 6, 20),
                "utilization_amount": Decimal("45.00"),
                "approval_status": "Approved",
                "remarks": "Seeded benefit.",
            },
        )
        mark("employee_benefits", made)

        seniority, made = add_if_missing(
            db,
            SenioritySeverance,
            {"user_id": hr_staff.id, "payment_type": "Mid-Year Seniority"},
            {
                "user_id": hr_staff.id,
                "payment_type": "Mid-Year Seniority",
                "severance_type": "Other Compensation",
                "join_date": date(2026, 1, 1),
                "years_of_service": 1,
                "eligible_salary": Decimal("900.00"),
                "payment_amount": Decimal("45.00"),
                "payment_date": date(2026, 6, 30),
                "status": "Approved",
                "notes": "Seeded seniority payment.",
            },
        )
        mark("seniority_severances", made)

        staff_move, made = add_if_missing(
            db,
            StaffMovement,
            {"movement_no": "MOV-0001"},
            {
                "movement_no": "MOV-0001",
                "user_id": finance_staff.id,
                "movement_type": "Transfer",
                "effective_date": date(2026, 8, 1),
                "reason": "Cross-functional support for payroll operations",
                "current_department": "Finance",
                "new_department": "Human Resources",
                "current_position": "Employee",
                "new_position": "Payroll Support Officer",
                "current_supervisor_id": finance_head.id,
                "new_supervisor_id": payroll.id,
                "current_salary": Decimal("900.00"),
                "new_salary": Decimal("950.00"),
                "salary_difference": Decimal("50.00"),
                "requested_by": finance_head.id,
                "approval_status": "Pending Approval",
                "remarks": "Seeded staff movement.",
            },
        )
        mark("staff_movements", made)

        db.commit()
        return created
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    results = seed_all_models()
    if results:
        print("Seeded demo rows:")
        for table, count in sorted(results.items()):
            print(f"- {table}: {count}")
    else:
        print("No new rows inserted; seed data already exists.")
