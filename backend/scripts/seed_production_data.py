from datetime import date, datetime
from decimal import Decimal

from app.db.session import Base, SessionLocal, engine
from app.models.attendance.models import Attendance
from app.models.company_location import CompanyLocation
from app.models.hris import (
    CareerDevelopment,
    Compensation,
    CompetencyAssessment,
    EmployeeBenefit,
    EmployeeHistory,
    EmployeeProfile,
    KpiMonitoring,
    KpiPlan,
    KpiRecord,
    PayrollBatch,
    PayrollEmployee,
    PayrollRecord,
    PerformanceImprovementPlan,
    PerformanceReview,
    PublicHoliday,
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
        raise RuntimeError(f"User {emp_code} not found. Run seed_all_models first.")
    return user


def add_if_missing(db, model, filters: dict, values: dict):
    row = db.query(model).filter_by(**filters).first()
    if row:
        return row, False
    row = model(**values)
    db.add(row)
    db.flush()
    return row, True


def seed_production_data() -> dict[str, int]:
    db = SessionLocal()
    created: dict[str, int] = {}

    def mark(name: str, was_created: bool):
        if was_created:
            created[name] = created.get(name, 0) + 1

    try:
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

        dara = first_user(db, "EMP012")
        sophea = first_user(db, "EMP013")
        vannak = first_user(db, "EMP014")
        rathana = first_user(db, "EMP015")
        chea = first_user(db, "EMP016")

        # ═══════════════════════════════════════════════
        # TRAINING MODULE (10 records)
        # ═══════════════════════════════════════════════

        plans_data = [
            {
                "plan_id": "TP-0002",
                "title": "Advanced Python for Data Engineering",
                "category": "Technical",
                "training_type": "Workshop",
                "training_year": 2026,
                "objective": "Upskill engineering team in advanced Python patterns and data pipelines.",
                "department": "Developer",
                "position": "Backend Developer",
                "employee_id": vannak.id,
                "planned_start_date": date(2026, 8, 10),
                "planned_end_date": date(2026, 8, 14),
                "duration": 5,
                "trainer": "External - DataCamp Pro",
                "venue": "Training Room B",
                "estimated_cost": Decimal("2500.00"),
                "actual_cost": Decimal("0.00"),
                "requested_by": dev_head.id,
                "approval_status": "Approved",
                "training_status": "Planned",
                "remarks": "Production seed: department-wide upskill initiative.",
            },
            {
                "plan_id": "TP-0003",
                "title": "Customer Service Excellence",
                "category": "Soft Skill",
                "training_type": "Workshop",
                "training_year": 2026,
                "objective": "Improve customer handling and communication skills for support teams.",
                "department": "Operations",
                "position": "Customer Support Officer",
                "employee_id": None,
                "planned_start_date": date(2026, 9, 1),
                "planned_end_date": date(2026, 9, 2),
                "duration": 2,
                "trainer": "Internal HR",
                "venue": "Training Room A",
                "estimated_cost": Decimal("800.00"),
                "actual_cost": Decimal("0.00"),
                "requested_by": hr.id,
                "approval_status": "Approved",
                "training_status": "Planned",
                "remarks": "Production seed: quarterly soft-skill program.",
            },
        ]
        for p in plans_data:
            _, made = add_if_missing(db, TrainingPlan, {"plan_id": p["plan_id"]}, p)
            mark("training_plans", made)

        tp2 = db.query(TrainingPlan).filter(TrainingPlan.plan_id == "TP-0002").first()
        tp3 = db.query(TrainingPlan).filter(TrainingPlan.plan_id == "TP-0003").first()

        records_data = [
            {
                "user_id": dara.id,
                "plan_id": tp2.id,
                "title": "Advanced Python for Data Engineering",
                "training_type": "Workshop",
                "category": "Technical",
                "provider": "DataCamp Pro",
                "training_date": date(2026, 8, 10),
                "end_date": date(2026, 8, 14),
                "duration": Decimal("40.0"),
                "training_method": "Classroom",
                "attendance_status": "Present",
                "completion_status": "Completed",
                "assessment_result": "Pass",
                "score": Decimal("88.00"),
                "skills_gained": "Python, Pandas, Airflow, ETL pipelines",
                "certification": "Yes",
                "verified_by": dev_head.id,
                "status": "Approved",
                "remarks": "Completed with distinction.",
            },
            {
                "user_id": sophea.id,
                "plan_id": tp2.id,
                "title": "Advanced Python for Data Engineering",
                "training_type": "Workshop",
                "category": "Technical",
                "provider": "DataCamp Pro",
                "training_date": date(2026, 8, 10),
                "end_date": date(2026, 8, 14),
                "duration": Decimal("40.0"),
                "training_method": "Classroom",
                "attendance_status": "Present",
                "completion_status": "Completed",
                "assessment_result": "Pass",
                "score": Decimal("92.00"),
                "skills_gained": "Python, FastAPI, data modeling",
                "certification": "Yes",
                "verified_by": dev_head.id,
                "status": "Approved",
                "remarks": "Top performer in cohort.",
            },
            {
                "user_id": rathana.id,
                "plan_id": tp2.id,
                "title": "Advanced Python for Data Engineering",
                "training_type": "Workshop",
                "category": "Technical",
                "provider": "DataCamp Pro",
                "training_date": date(2026, 8, 10),
                "end_date": date(2026, 8, 14),
                "duration": Decimal("40.0"),
                "training_method": "Classroom",
                "attendance_status": "Present",
                "completion_status": "Completed",
                "assessment_result": "Pass",
                "score": Decimal("75.00"),
                "skills_gained": "Python basics, testing",
                "certification": "No",
                "verified_by": dev_head.id,
                "status": "Approved",
                "remarks": "Adequate completion, needs further mentoring.",
            },
            {
                "user_id": ops_staff.id,
                "plan_id": tp3.id,
                "title": "Customer Service Excellence",
                "training_type": "Workshop",
                "category": "Soft Skill",
                "provider": "Internal HR",
                "training_date": date(2026, 9, 1),
                "end_date": date(2026, 9, 2),
                "duration": Decimal("16.0"),
                "training_method": "Classroom",
                "attendance_status": "Present",
                "completion_status": "Completed",
                "assessment_result": "Pass",
                "score": Decimal("85.00"),
                "skills_gained": "Active listening, de-escalation, empathy",
                "certification": "Yes",
                "verified_by": hr.id,
                "status": "Approved",
                "remarks": "Good engagement during role-play sessions.",
            },
            {
                "user_id": hr_staff.id,
                "plan_id": None,
                "title": "HR Data Privacy & Compliance",
                "training_type": "Online",
                "category": "Compliance",
                "provider": "Ministry of Labour E-Learning",
                "training_date": date(2026, 7, 20),
                "end_date": date(2026, 7, 20),
                "duration": Decimal("4.0"),
                "training_method": "E-Learning",
                "attendance_status": "Present",
                "completion_status": "Completed",
                "assessment_result": "Pass",
                "score": Decimal("95.00"),
                "skills_gained": "Data protection law, employee privacy rights",
                "certification": "Yes",
                "verified_by": hr_head.id,
                "status": "Approved",
                "remarks": "Mandatory annual compliance.",
            },
        ]
        for r in records_data:
            f = {"user_id": r["user_id"], "title": r["title"], "training_date": r["training_date"]}
            _, made = add_if_missing(db, TrainingRecord, f, r)
            mark("training_records", made)

        assessments_data = [
            {
                "user_id": vannak.id,
                "assessment_type": "Annual",
                "assessment_period_start": date(2026, 1, 1),
                "assessment_period_end": date(2026, 6, 30),
                "assessor_id": dev_manager.id,
                "assessment_date": date(2026, 7, 5),
                "competency_model": "Backend Engineering Ladder",
                "technical_skills": "Python, FastAPI, PostgreSQL, Redis",
                "soft_skills": "Cross-team collaboration, mentorship",
                "behavioral_competency": "Takes ownership, proactive communication",
                "technical_score": Decimal("90.00"),
                "soft_skills_score": Decimal("85.00"),
                "behavioral_score": Decimal("88.00"),
                "overall_score": Decimal("87.67"),
                "competency_level": "Advanced",
                "strengths": "Strong system design and debugging",
                "improvement_areas": "Documentation detail",
                "development_needs": "Cloud architecture training",
                "training_recommendation_id": tp2.id,
                "coaching_required": "No",
                "verified_by": hr.id,
                "approval_status": "Approved",
                "remarks": "Ready for senior-level projects.",
            },
            {
                "user_id": dara.id,
                "assessment_type": "Annual",
                "assessment_period_start": date(2026, 1, 1),
                "assessment_period_end": date(2026, 6, 30),
                "assessor_id": dev_manager.id,
                "assessment_date": date(2026, 7, 5),
                "competency_model": "Frontend Engineering Ladder",
                "technical_skills": "React, TypeScript, Tailwind CSS",
                "soft_skills": "Team communication, code review",
                "behavioral_competency": "Reliable, meets deadlines consistently",
                "technical_score": Decimal("82.00"),
                "soft_skills_score": Decimal("90.00"),
                "behavioral_score": Decimal("85.00"),
                "overall_score": Decimal("85.67"),
                "competency_level": "Intermediate",
                "strengths": "UI implementation speed and quality",
                "improvement_areas": "State management patterns",
                "development_needs": "Advanced React workshop",
                "training_recommendation_id": None,
                "coaching_required": "Yes",
                "verified_by": hr.id,
                "approval_status": "Submitted",
                "remarks": "Solid mid-year performance.",
            },
            {
                "user_id": finance_staff.id,
                "assessment_type": "Probation",
                "assessment_period_start": date(2026, 1, 1),
                "assessment_period_end": date(2026, 3, 31),
                "assessor_id": finance_head.id,
                "assessment_date": date(2026, 4, 1),
                "competency_model": "Finance Competency Model",
                "technical_skills": "Bookkeeping, Excel, basic accounting",
                "soft_skills": "Professionalism, attention to detail",
                "behavioral_competency": "Follows process diligently",
                "technical_score": Decimal("78.00"),
                "soft_skills_score": Decimal("80.00"),
                "behavioral_score": Decimal("82.00"),
                "overall_score": Decimal("80.00"),
                "competency_level": "Intermediate",
                "strengths": "Accuracy in data entry",
                "improvement_areas": "Understanding of tax regulations",
                "development_needs": "Tax compliance training",
                "training_recommendation_id": None,
                "coaching_required": "Yes",
                "verified_by": hr.id,
                "approval_status": "Approved",
                "remarks": "Probation passed successfully.",
            },
        ]
        for a in assessments_data:
            f = {"user_id": a["user_id"], "assessment_type": a["assessment_type"], "assessment_period_start": a["assessment_period_start"]}
            _, made = add_if_missing(db, CompetencyAssessment, f, a)
            mark("competency_assessments", made)

        # ═══════════════════════════════════════════════
        # PERFORMANCE MODULE (10 records)
        # ═══════════════════════════════════════════════

        kpi_plans_data = [
            {
                "kpi_plan_id": "KPI-0002",
                "kpi_period": "Semester 1",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "user_id": vannak.id,
                "kpi_category": "Individual",
                "kpi_code": "DEV-PERF",
                "kpi_title": "API Response Time Optimisation",
                "kpi_description": "Reduce average API response time by 15% through query optimisation and caching.",
                "measurement_method": "Percentage",
                "target_value": Decimal("15.00"),
                "weight": Decimal("35.00"),
                "minimum_achievement": Decimal("10.00"),
                "data_source": "Grafana dashboards",
                "responsible_person": dev_manager.id,
                "line_manager_approval": "Approved",
                "hr_review": "Approved",
                "final_status": "Active",
                "remarks": "Q2 performance goal.",
            },
            {
                "kpi_plan_id": "KPI-0003",
                "kpi_period": "Semester 1",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "user_id": chea.id,
                "kpi_category": "Individual",
                "kpi_code": "OPS-UPTIME",
                "kpi_title": "System Uptime 99.9%",
                "kpi_description": "Maintain production system availability at or above 99.9% SLA.",
                "measurement_method": "Percentage",
                "target_value": Decimal("99.90"),
                "weight": Decimal("50.00"),
                "minimum_achievement": Decimal("99.50"),
                "data_source": "Status page & monitoring tools",
                "responsible_person": ops_head.id,
                "line_manager_approval": "Approved",
                "hr_review": "Approved",
                "final_status": "Active",
                "remarks": "Critical infrastructure KPI.",
            },
            {
                "kpi_plan_id": "KPI-0004",
                "kpi_period": "Semester 1",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "user_id": sophea.id,
                "kpi_category": "Individual",
                "kpi_code": "FE-QA",
                "kpi_title": "Frontend Bug Escape Rate",
                "kpi_description": "Reduce bugs escaping QA to production to under 3% of total tickets.",
                "measurement_method": "Percentage",
                "target_value": Decimal("3.00"),
                "weight": Decimal("40.00"),
                "minimum_achievement": Decimal("5.00"),
                "data_source": "Jira bug tracker",
                "responsible_person": dev_manager.id,
                "line_manager_approval": "Approved",
                "hr_review": "Approved",
                "final_status": "Active",
                "remarks": "Quality ownership goal.",
            },
        ]
        for k in kpi_plans_data:
            _, made = add_if_missing(db, KpiPlan, {"kpi_plan_id": k["kpi_plan_id"]}, k)
            mark("kpi_plans", made)

        kpi2 = db.query(KpiPlan).filter(KpiPlan.kpi_plan_id == "KPI-0002").first()
        kpi3 = db.query(KpiPlan).filter(KpiPlan.kpi_plan_id == "KPI-0003").first()

        monitoring_data = [
            {
                "kpi_plan_id": kpi2.id,
                "monitoring_date": date(2026, 6, 30),
                "current_achievement": Decimal("13.50"),
                "achievement_pct": Decimal("90.00"),
                "kpi_score": Decimal("31.50"),
                "status": "On Track",
                "supporting_evidence": "Grafana Q2 report (avg response 180ms vs 210ms baseline)",
                "employee_comment": "Implemented Redis caching and optimised N+1 queries.",
                "manager_comment": "Good improvement, continue monitoring.",
                "action_required": "Document caching strategy for knowledge sharing.",
                "monitoring_status": "Reviewed",
                "remarks": "On track to meet Q2 target.",
            },
            {
                "kpi_plan_id": kpi3.id,
                "monitoring_date": date(2026, 6, 30),
                "current_achievement": Decimal("99.85"),
                "achievement_pct": Decimal("99.95"),
                "kpi_score": Decimal("49.98"),
                "status": "At Risk",
                "supporting_evidence": "Uptime dashboard snapshot June 2026",
                "employee_comment": "Planned maintenance caused minor downtime (2h total).",
                "manager_comment": "Unplanned maintenance window needs better communication.",
                "action_required": "Improve change management process and notification.",
                "monitoring_status": "Reviewed",
                "remarks": "Minor SLA miss due to maintenance.",
            },
        ]
        for m in monitoring_data:
            f = {"kpi_plan_id": m["kpi_plan_id"], "monitoring_date": m["monitoring_date"]}
            _, made = add_if_missing(db, KpiMonitoring, f, m)
            mark("kpi_monitoring", made)

        reviews_data = [
            {
                "user_id": vannak.id,
                "reviewer_id": dev_manager.id,
                "review_period": "Semester 1",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "kpi_score": Decimal("85.00"),
                "kpi_weight": Decimal("60.00"),
                "competency_score": Decimal("88.00"),
                "behavior_score": Decimal("86.00"),
                "attendance_score": Decimal("98.00"),
                "total_score": Decimal("87.20"),
                "performance_rating": "Exceeds Expectations",
                "self_assessment": "Delivered API optimisation ahead of schedule. Took ownership of backend architecture.",
                "manager_comments": "Vannak has shown strong growth this semester. Ready for more responsibility.",
                "strengths": "Technical depth, reliability, team mentoring",
                "improvement_areas": "Cross-team communication for architectural decisions",
                "development_action_plan": "Lead one cross-team project in next semester.",
                "promotion_recommendation": "Yes",
                "salary_increment_recommendation": "Yes",
                "pip_required": "No",
                "review_status": "Approved",
                "final_decision": "Promotion",
                "remarks": "Strong candidate for G4 grade promotion.",
            },
            {
                "user_id": hr_staff.id,
                "reviewer_id": hr_head.id,
                "review_period": "Semester 1",
                "start_date": date(2026, 1, 1),
                "end_date": date(2026, 6, 30),
                "kpi_score": Decimal("75.00"),
                "kpi_weight": Decimal("50.00"),
                "competency_score": Decimal("78.00"),
                "behavior_score": Decimal("80.00"),
                "attendance_score": Decimal("100.00"),
                "total_score": Decimal("80.00"),
                "performance_rating": "Meets Expectations",
                "self_assessment": "Completed all monthly payroll cycles accurately. Assisted with recruitment drives.",
                "manager_comments": "Consistent performance. Can take on more strategic tasks.",
                "strengths": "Accuracy, timeliness, team player",
                "improvement_areas": "Proactive problem identification",
                "development_action_plan": "Attend advanced HR analytics training.",
                "promotion_recommendation": "No",
                "salary_increment_recommendation": "Yes",
                "pip_required": "No",
                "review_status": "Approved",
                "final_decision": "Increment",
                "remarks": "Solid performance, standard increment recommended.",
            },
        ]
        for r in reviews_data:
            f = {"user_id": r["user_id"], "review_period": r["review_period"], "start_date": r["start_date"]}
            _, made = add_if_missing(db, PerformanceReview, f, r)
            mark("performance_reviews", made)

        careers_data = [
            {
                "user_id": vannak.id,
                "performance_rating": "Exceeds Expectations",
                "potential_rating": "High",
                "readiness_level": "Ready Now",
                "career_goal": "Become a Tech Lead within 12 months.",
                "target_position": "Tech Lead",
                "career_path": "Senior Backend -> Tech Lead -> Architect",
                "development_area": "System design, team leadership, stakeholder management",
                "training_required": tp2.id,
                "coaching_required": "Yes",
                "mentoring_required": "Yes",
                "successor_candidate": "Yes",
                "talent_pool": "Successor Pool",
                "review_date": date(2026, 7, 5),
                "next_review_date": date(2027, 1, 5),
                "dev_status": "Active",
                "remarks": "Identified as successor for team lead role.",
            },
            {
                "user_id": dara.id,
                "performance_rating": "Meets Expectations",
                "potential_rating": "Medium",
                "readiness_level": "Ready in 1 Year",
                "career_goal": "Advance to Senior Frontend Developer.",
                "target_position": "Senior Frontend Developer",
                "career_path": "Web Developer -> Senior -> UI Lead",
                "development_area": "Advanced React, state management, accessibility",
                "training_required": None,
                "coaching_required": "Yes",
                "mentoring_required": "No",
                "successor_candidate": "No",
                "talent_pool": "Emerging Talent",
                "review_date": date(2026, 7, 5),
                "next_review_date": date(2027, 1, 5),
                "dev_status": "Active",
                "remarks": "Needs upskilling before senior role readiness.",
            },
        ]
        for c in careers_data:
            f = {"user_id": c["user_id"], "target_position": c["target_position"]}
            _, made = add_if_missing(db, CareerDevelopment, f, c)
            mark("career_developments", made)

        pip, made = add_if_missing(
            db,
            PerformanceImprovementPlan,
            {"pip_no": "PIP-0002"},
            {
                "pip_no": "PIP-0002",
                "user_id": ops_staff.id,
                "pip_start_date": date(2026, 8, 1),
                "pip_end_date": date(2026, 10, 31),
                "pip_duration": 90,
                "initiated_by": ops_head.id,
                "performance_issue": "Consistent lateness and missed shift handovers",
                "root_cause_analysis": "Poor time management and lack of structured routine",
                "improvement_objective": "Achieve 100% on-time shift handover for 8 consecutive weeks",
                "success_criteria": "No late handovers recorded for 8 weeks",
                "action_plan": "Daily check-in with supervisor, use shared calendar reminders",
                "training_required": None,
                "coaching_required": "Yes",
                "mentor_assigned": ops_head.id,
                "review_frequency": "Weekly",
                "progress_status": "Active",
                "progress_comment": "Initial week showed improvement (1 late vs 4 previous).",
                "approval_status": "Draft",
                "remarks": "PIP initiated after verbal and written warnings.",
            },
        )
        mark("performance_improvement_plans", made)

        # ═══════════════════════════════════════════════
        # PAYROLL MODULE (10 records)
        # ═══════════════════════════════════════════════

        batch, made = add_if_missing(
            db,
            PayrollBatch,
            {"batch_no": "PAY-2026-08"},
            {
                "batch_no": "PAY-2026-08",
                "month": 8,
                "year": 2026,
                "cycle": "Monthly",
                "status": "Approved",
                "total_basic": Decimal("11250.00"),
                "total_allowances": Decimal("600.00"),
                "total_overtime": Decimal("120.00"),
                "total_deductions": Decimal("855.00"),
                "total_net": Decimal("11115.00"),
                "employee_count": 3,
                "notes": "Production seed batch for August payroll.",
            },
        )
        mark("payroll_batches", made)

        payee_specs = [
            (vannak, Decimal("1100.00"), Decimal("80.00")),
            (dara, Decimal("950.00"), Decimal("50.00")),
            (chea, Decimal("1200.00"), Decimal("100.00")),
        ]
        for user_obj, basic, ot in payee_specs:
            allowance = Decimal("100.00") if user_obj.role == "department_head" else Decimal("50.00")
            nssf = (basic * Decimal("0.02")).quantize(Decimal("0.01"))
            tax = (basic * Decimal("0.05")).quantize(Decimal("0.01")) if basic >= Decimal("1200.00") else Decimal("0.00")
            gross = basic + allowance + ot
            net = gross - nssf - tax
            pe, made = add_if_missing(
                db,
                PayrollEmployee,
                {"batch_id": batch.id, "user_id": user_obj.id},
                {
                    "batch_id": batch.id,
                    "user_id": user_obj.id,
                    "basic_salary": basic,
                    "allowances": {"transport": 30, "phone": 20},
                    "gross_salary": gross,
                    "working_days": 22,
                    "present_days": 22,
                    "absent_days": 0,
                    "leave_days": 0,
                    "late_deduction": Decimal("0.00"),
                    "ot_hours": Decimal("4.00"),
                    "ot_amount": ot,
                    "nssf": nssf,
                    "tax": tax,
                    "other_deductions": {"loan": 0},
                    "net_salary": net,
                    "status": "Approved",
                    "payment_method": "Bank Transfer",
                },
            )
            mark("payroll_employees", made)

        comps_data = [
            {
                "user_id": vannak.id,
                "salary_grade": "Grade 3",
                "salary_band": "Medium",
                "basic_salary": Decimal("1100.00"),
                "allowance_type": "Transport",
                "allowance_amount": Decimal("50.00"),
                "benefit_package": "Standard developer package",
                "adjustment_type": "Annual Increment",
                "effective_date": date(2026, 7, 1),
                "previous_salary": Decimal("1000.00"),
                "new_salary": Decimal("1100.00"),
                "adjustment_amount": Decimal("100.00"),
                "adjustment_reason": "Annual salary review based on performance rating.",
                "approval_status": "Approved",
                "remarks": "Approved per Q1 performance review.",
            },
            {
                "user_id": dara.id,
                "salary_grade": "Grade 2",
                "salary_band": "Low",
                "basic_salary": Decimal("950.00"),
                "allowance_type": "Phone",
                "allowance_amount": Decimal("20.00"),
                "benefit_package": "Standard employee package",
                "adjustment_type": "Probation Confirmation",
                "effective_date": date(2026, 4, 1),
                "previous_salary": Decimal("900.00"),
                "new_salary": Decimal("950.00"),
                "adjustment_amount": Decimal("50.00"),
                "adjustment_reason": "Probation confirmed with standard increment.",
                "approval_status": "Approved",
                "remarks": "Probation passed successfully.",
            },
        ]
        for c in comps_data:
            f = {"user_id": c["user_id"], "adjustment_type": c["adjustment_type"]}
            _, made = add_if_missing(db, Compensation, f, c)
            mark("compensations", made)

        benefits_data = [
            {
                "user_id": vannak.id,
                "benefit_type": "Health Insurance",
                "benefit_name": "Standard health plan - Grade 3",
                "effective_date": date(2026, 1, 1),
                "expiry_date": date(2026, 12, 31),
                "benefit_value": Decimal("400.00"),
                "status": "Active",
                "utilization_date": date(2026, 5, 15),
                "utilization_amount": Decimal("120.00"),
                "approval_status": "Approved",
                "remarks": "Annual health coverage.",
            },
            {
                "user_id": dara.id,
                "benefit_type": "Phone Allowance",
                "benefit_name": "Monthly phone stipend",
                "effective_date": date(2026, 1, 1),
                "expiry_date": date(2026, 12, 31),
                "benefit_value": Decimal("240.00"),
                "status": "Active",
                "utilization_date": None,
                "utilization_amount": None,
                "approval_status": "Approved",
                "remarks": "20 USD/month phone allowance.",
            },
        ]
        for b in benefits_data:
            f = {"user_id": b["user_id"], "benefit_type": b["benefit_type"]}
            _, made = add_if_missing(db, EmployeeBenefit, f, b)
            mark("employee_benefits", made)

        seniority, made = add_if_missing(
            db,
            SenioritySeverance,
            {"user_id": sophea.id, "payment_type": "Year-End Seniority"},
            {
                "user_id": sophea.id,
                "payment_type": "Year-End Seniority",
                "severance_type": "Other Compensation",
                "join_date": date(2026, 1, 1),
                "years_of_service": 1,
                "eligible_salary": Decimal("980.00"),
                "payment_amount": Decimal("49.00"),
                "payment_date": date(2026, 12, 31),
                "status": "Approved",
                "notes": "Year-end seniority payment at 5% of monthly salary.",
            },
        )
        mark("seniority_severances", made)

        staff_move, made = add_if_missing(
            db,
            StaffMovement,
            {"movement_no": "MOV-0002"},
            {
                "movement_no": "MOV-0002",
                "user_id": vannak.id,
                "movement_type": "Promotion",
                "effective_date": date(2026, 9, 1),
                "reason": "Promotion to Senior Backend Developer based on exceptional performance.",
                "current_department": "Developer",
                "new_department": "Developer",
                "current_position": "Backend Developer",
                "new_position": "Senior Backend Developer",
                "current_supervisor_id": dev_manager.id,
                "new_supervisor_id": dev_manager.id,
                "current_salary": Decimal("1100.00"),
                "new_salary": Decimal("1400.00"),
                "salary_difference": Decimal("300.00"),
                "requested_by": dev_head.id,
                "approval_status": "Pending Approval",
                "remarks": "Recommended after Q2 performance review.",
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
    results = seed_production_data()
    if results:
        print("Seeded production rows:")
        for table, count in sorted(results.items()):
            print(f"  - {table}: {count}")
    else:
        print("No new rows inserted; data already exists.")
