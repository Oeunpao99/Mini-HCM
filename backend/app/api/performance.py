from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    PAYROLL_OFFICER_ROLE,
    get_current_user,
    get_db,
    normalize_role,
    require_roles,
    scoped_user_ids,
)
from app.models.hris import (
    CareerDevelopment,
    EmployeeProfile,
    KpiMonitoring,
    KpiPlan,
    PerformanceImprovementPlan,
    PerformanceReview,
    TrainingPlan,
)
from app.models.user import User
from app.schemas.hris import (
    CareerDevelopmentIn,
    KpiMonitoringIn,
    KpiMonitoringReviewIn,
    KpiPlanIn,
    KpiPlanStatusIn,
    PerformanceImprovementPlanIn,
    PerformanceReviewIn,
    PipFinalEvalIn,
    PipProgressIn,
)

router = APIRouter(prefix="/api/performance", tags=["performance"])

PM_ROLES = (LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE)
MGMT_ROLES = (LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)


def _money(value) -> float:
    return float(value or 0)


def _scope_ids(db: Session, actor: User, include_self: bool = False) -> list[int]:
    return scoped_user_ids(db, actor, include_self=include_self)


def _ensure_target_in_scope(db: Session, actor: User, user_id: int) -> None:
    if normalize_role(actor.role) in {MANAGEMENT_HR_ROLE, PAYROLL_OFFICER_ROLE}:
        return
    if user_id not in _scope_ids(db, actor, include_self=True):
        raise HTTPException(status_code=403, detail="Employee is outside your scope")


def _next_kpi_plan_id(db: Session) -> str:
    last = db.query(func.max(KpiPlan.id)).scalar()
    num = (last or 0) + 1
    return f"KPI-{num:04d}"


def _next_pip_no(db: Session) -> str:
    last = db.query(func.max(PerformanceImprovementPlan.id)).scalar()
    num = (last or 0) + 1
    return f"PIP-{num:04d}"


def _kpi_plan_payload(row: KpiPlan) -> dict:
    return {
        "id": row.id,
        "kpi_plan_id": row.kpi_plan_id,
        "kpi_period": row.kpi_period,
        "start_date": row.start_date,
        "end_date": row.end_date,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "department": row.user.department if row.user else None,
        "position": row.user.profile.position if row.user and row.user.profile else None,
        "kpi_category": row.kpi_category,
        "kpi_code": row.kpi_code,
        "kpi_title": row.kpi_title,
        "kpi_description": row.kpi_description,
        "measurement_method": row.measurement_method,
        "target_value": _money(row.target_value),
        "weight": _money(row.weight),
        "minimum_achievement": _money(row.minimum_achievement) if row.minimum_achievement else None,
        "data_source": row.data_source,
        "responsible_person": row.responsible_person,
        "responsible_name": row.responsible.name if row.responsible else None,
        "line_manager_approval": row.line_manager_approval,
        "hr_review": row.hr_review,
        "final_status": row.final_status,
        "remarks": row.remarks,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _kpi_monitoring_payload(row: KpiMonitoring) -> dict:
    plan = row.kpi_plan
    return {
        "id": row.id,
        "kpi_plan_id": row.kpi_plan_id,
        "kpi_plan_code": plan.kpi_plan_id if plan else None,
        "kpi_title": plan.kpi_title if plan else None,
        "kpi_target": _money(plan.target_value) if plan else None,
        "kpi_weight": _money(plan.weight) if plan else None,
        "kpi_period": plan.kpi_period if plan else None,
        "employee_name": plan.user.name if plan and plan.user else None,
        "department": plan.user.department if plan and plan.user else None,
        "monitoring_date": row.monitoring_date,
        "current_achievement": _money(row.current_achievement),
        "achievement_pct": _money(row.achievement_pct) if row.achievement_pct else None,
        "kpi_score": _money(row.kpi_score) if row.kpi_score else None,
        "status": row.status,
        "supporting_evidence": row.supporting_evidence,
        "employee_comment": row.employee_comment,
        "manager_comment": row.manager_comment,
        "action_required": row.action_required,
        "monitoring_status": row.monitoring_status,
        "remarks": row.remarks,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _career_dev_payload(row: CareerDevelopment) -> dict:
    profile = row.user.profile if row.user else None
    return {
        "id": row.id,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "department": row.user.department if row.user else None,
        "current_position": profile.position if profile else None,
        "current_grade": profile.job_grade if profile else None,
        "performance_rating": row.performance_rating,
        "potential_rating": row.potential_rating,
        "readiness_level": row.readiness_level,
        "career_goal": row.career_goal,
        "target_position": row.target_position,
        "career_path": row.career_path,
        "development_area": row.development_area,
        "training_required": row.training_required,
        "training_name": row.training.title if row.training else None,
        "coaching_required": row.coaching_required,
        "mentoring_required": row.mentoring_required,
        "successor_candidate": row.successor_candidate,
        "talent_pool": row.talent_pool,
        "review_date": row.review_date,
        "next_review_date": row.next_review_date,
        "dev_status": row.dev_status,
        "remarks": row.remarks,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _pip_payload(row: PerformanceImprovementPlan) -> dict:
    return {
        "id": row.id,
        "pip_no": row.pip_no,
        "user_id": row.user_id,
        "employee_name": row.user.name if row.user else None,
        "department": row.user.department if row.user else None,
        "position": row.user.profile.position if row.user and row.user.profile else None,
        "pip_start_date": row.pip_start_date,
        "pip_end_date": row.pip_end_date,
        "pip_duration": row.pip_duration,
        "initiated_by": row.initiated_by,
        "initiator_name": row.initiator.name if row.initiator else None,
        "performance_issue": row.performance_issue,
        "root_cause_analysis": row.root_cause_analysis,
        "improvement_objective": row.improvement_objective,
        "success_criteria": row.success_criteria,
        "action_plan": row.action_plan,
        "training_required": row.training_required,
        "coaching_required": row.coaching_required,
        "mentor_assigned": row.mentor_assigned,
        "mentor_name": row.mentor.name if row.mentor else None,
        "review_frequency": row.review_frequency,
        "progress_status": row.progress_status,
        "progress_comment": row.progress_comment,
        "final_result": row.final_result,
        "recommendation": row.recommendation,
        "approval_status": row.approval_status,
        "remarks": row.remarks,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def _performance_review_payload(row: PerformanceReview) -> dict:
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
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


# ═══════════════════════════════════════════════════════════════
#  KPI PLAN (KPI Setting 6.1)
# ═══════════════════════════════════════════════════════════════

@router.get("/kpi-plans")
def list_kpi_plans(
    user_id: int | None = None,
    period: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(KpiPlan).filter(KpiPlan.user_id.in_(user_ids))
    if user_id:
        _ensure_target_in_scope(db, actor, user_id)
        q = q.filter(KpiPlan.user_id == user_id)
    if period:
        q = q.filter(KpiPlan.kpi_period == period)
    if status:
        q = q.filter(KpiPlan.final_status == status)
    return [_kpi_plan_payload(r) for r in q.order_by(KpiPlan.created_at.desc()).all()]


@router.get("/kpi-plans/my")
def my_kpi_plans(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = db.query(KpiPlan).filter(KpiPlan.user_id == actor.id).order_by(KpiPlan.created_at.desc()).all()
    return [_kpi_plan_payload(r) for r in rows]


@router.post("/kpi-plans")
def create_kpi_plan(
    payload: KpiPlanIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    data = payload.model_dump()
    data["kpi_plan_id"] = _next_kpi_plan_id(db)
    row = KpiPlan(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _kpi_plan_payload(row)


@router.put("/kpi-plans/{plan_id}")
def update_kpi_plan(
    plan_id: int,
    payload: KpiPlanIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(KpiPlan).filter(KpiPlan.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI plan not found")
    _ensure_target_in_scope(db, actor, row.user_id)
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _kpi_plan_payload(row)


@router.put("/kpi-plans/{plan_id}/status")
def update_kpi_plan_status(
    plan_id: int,
    payload: KpiPlanStatusIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(KpiPlan).filter(KpiPlan.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI plan not found")
    row.final_status = payload.final_status
    db.commit()
    db.refresh(row)
    return _kpi_plan_payload(row)


@router.delete("/kpi-plans/{plan_id}")
def delete_kpi_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    row = db.query(KpiPlan).filter(KpiPlan.id == plan_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI plan not found")
    db.delete(row)
    db.commit()
    return {"message": "KPI plan deleted"}


# ═══════════════════════════════════════════════════════════════
#  KPI MONITORING (6.2)
# ═══════════════════════════════════════════════════════════════

@router.get("/kpi-monitoring")
def list_kpi_monitoring(
    kpi_plan_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    q = db.query(KpiMonitoring).join(KpiPlan)
    user_ids = _scope_ids(db, actor, include_self=True)
    q = q.filter(KpiPlan.user_id.in_(user_ids))
    if kpi_plan_id:
        q = q.filter(KpiMonitoring.kpi_plan_id == kpi_plan_id)
    if status:
        q = q.filter(KpiMonitoring.status == status)
    return [_kpi_monitoring_payload(r) for r in q.order_by(KpiMonitoring.monitoring_date.desc()).all()]


@router.get("/kpi-monitoring/my")
def my_kpi_monitoring(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = (
        db.query(KpiMonitoring)
        .join(KpiPlan)
        .filter(KpiPlan.user_id == actor.id)
        .order_by(KpiMonitoring.monitoring_date.desc())
        .all()
    )
    return [_kpi_monitoring_payload(r) for r in rows]


@router.get("/kpi-monitoring/plan/{kpi_plan_id}")
def get_kpi_monitoring_by_plan(
    kpi_plan_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    rows = (
        db.query(KpiMonitoring)
        .filter(KpiMonitoring.kpi_plan_id == kpi_plan_id)
        .order_by(KpiMonitoring.monitoring_date.desc())
        .all()
    )
    return [_kpi_monitoring_payload(r) for r in rows]


@router.post("/kpi-monitoring")
def create_kpi_monitoring(
    payload: KpiMonitoringIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    plan = db.query(KpiPlan).filter(KpiPlan.id == payload.kpi_plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="KPI plan not found")
    _ensure_target_in_scope(db, actor, plan.user_id)

    data = payload.model_dump()
    target = Decimal(str(plan.target_value or 1))
    current = Decimal(str(data.get("current_achievement", 0)))
    data["achievement_pct"] = float((current / target * 100).quantize(Decimal("0.01"))) if target else 0
    weight = Decimal(str(plan.weight or 0))
    data["kpi_score"] = float(((current / target * 100) * weight / 100).quantize(Decimal("0.01"))) if target else 0

    row = KpiMonitoring(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _kpi_monitoring_payload(row)


@router.put("/kpi-monitoring/{monitoring_id}/review")
def review_kpi_monitoring(
    monitoring_id: int,
    payload: KpiMonitoringReviewIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(KpiMonitoring).filter(KpiMonitoring.id == monitoring_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI monitoring record not found")
    plan = db.query(KpiPlan).filter(KpiPlan.id == row.kpi_plan_id).first()
    if plan:
        _ensure_target_in_scope(db, actor, plan.user_id)
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _kpi_monitoring_payload(row)


@router.delete("/kpi-monitoring/{monitoring_id}")
def delete_kpi_monitoring(
    monitoring_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    row = db.query(KpiMonitoring).filter(KpiMonitoring.id == monitoring_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="KPI monitoring record not found")
    db.delete(row)
    db.commit()
    return {"message": "KPI monitoring record deleted"}


# ═══════════════════════════════════════════════════════════════
#  PERFORMANCE REVIEW (6.3)
# ═══════════════════════════════════════════════════════════════

@router.get("/reviews")
def list_performance_reviews(
    user_id: int | None = None,
    period: str | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(PerformanceReview).filter(PerformanceReview.user_id.in_(user_ids))
    if user_id:
        _ensure_target_in_scope(db, actor, user_id)
        q = q.filter(PerformanceReview.user_id == user_id)
    if period:
        q = q.filter(PerformanceReview.review_period == period)
    if status:
        q = q.filter(PerformanceReview.review_status == status)
    return [_performance_review_payload(r) for r in q.order_by(PerformanceReview.created_at.desc()).all()]


@router.get("/reviews/my")
def my_performance_reviews(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = db.query(PerformanceReview).filter(PerformanceReview.user_id == actor.id).order_by(PerformanceReview.created_at.desc()).all()
    return [_performance_review_payload(r) for r in rows]


@router.post("/reviews")
def create_performance_review(
    payload: PerformanceReviewIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    data = payload.model_dump()

    # Calculate total score if possible
    scores = []
    weights = []
    if data.get("kpi_score") is not None and data.get("kpi_weight") is not None:
        scores.append(Decimal(str(data["kpi_score"])) * Decimal(str(data["kpi_weight"])) / Decimal("100"))
        weights.append(Decimal(str(data["kpi_weight"])))
    if data.get("competency_score") is not None:
        scores.append(Decimal(str(data["competency_score"])) * Decimal("0.15"))
        weights.append(Decimal("15"))
    if data.get("behavior_score") is not None:
        scores.append(Decimal(str(data["behavior_score"])) * Decimal("0.10"))
        weights.append(Decimal("10"))
    if data.get("attendance_score") is not None:
        scores.append(Decimal(str(data["attendance_score"])) * Decimal("0.05"))
        weights.append(Decimal("5"))

    total_weight = sum(weights)
    if scores and total_weight > 0:
        data["total_score"] = float(sum(scores))
    else:
        data["total_score"] = data.pop("score", None) or data.get("total_score")

    # Calculate rating
    ts = data.get("total_score")
    if ts is not None:
        if ts >= 95:
            data["performance_rating"] = "Outstanding"
        elif ts >= 90:
            data["performance_rating"] = "Exceeds Expectations"
        elif ts >= 80:
            data["performance_rating"] = "Meets Expectations"
        elif ts >= 70:
            data["performance_rating"] = "Needs Improvement"
        else:
            data["performance_rating"] = "Unsatisfactory"

    # Map old field names
    data["total_score"] = data.pop("score", data.get("total_score"))
    data["performance_rating"] = data.pop("rating", data.get("performance_rating"))
    data["manager_comments"] = data.pop("comments", data.get("manager_comments"))
    data["review_status"] = data.pop("status", data.get("review_status", "Draft"))
    data["reviewer_id"] = actor.id

    row = PerformanceReview(**{k: v for k, v in data.items() if hasattr(PerformanceReview, k)})
    db.add(row)
    db.commit()
    db.refresh(row)
    return _performance_review_payload(row)


@router.put("/reviews/{review_id}")
def update_performance_review(
    review_id: int,
    payload: PerformanceReviewIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Performance review not found")
    _ensure_target_in_scope(db, actor, row.user_id)

    data = payload.model_dump()
    scores = []
    if data.get("kpi_score") is not None and data.get("kpi_weight") is not None:
        scores.append(Decimal(str(data["kpi_score"])) * Decimal(str(data["kpi_weight"])) / Decimal("100"))
    if data.get("competency_score") is not None:
        scores.append(Decimal(str(data["competency_score"])) * Decimal("0.15"))
    if data.get("behavior_score") is not None:
        scores.append(Decimal(str(data["behavior_score"])) * Decimal("0.10"))
    if data.get("attendance_score") is not None:
        scores.append(Decimal(str(data["attendance_score"])) * Decimal("0.05"))

    if scores:
        data["total_score"] = float(sum(scores))

    ts = data.get("total_score")
    if ts is not None:
        if ts >= 95:
            data["performance_rating"] = "Outstanding"
        elif ts >= 90:
            data["performance_rating"] = "Exceeds Expectations"
        elif ts >= 80:
            data["performance_rating"] = "Meets Expectations"
        elif ts >= 70:
            data["performance_rating"] = "Needs Improvement"
        else:
            data["performance_rating"] = "Unsatisfactory"

    data["total_score"] = data.pop("score", data.get("total_score"))
    data["performance_rating"] = data.pop("rating", data.get("performance_rating"))
    data["manager_comments"] = data.pop("comments", data.get("manager_comments"))
    data["review_status"] = data.pop("status", data.get("review_status"))

    for k, v in data.items():
        if hasattr(row, k) and k not in ("id", "created_at", "updated_at"):
            setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _performance_review_payload(row)


@router.delete("/reviews/{review_id}")
def delete_performance_review(
    review_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    row = db.query(PerformanceReview).filter(PerformanceReview.id == review_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Performance review not found")
    db.delete(row)
    db.commit()
    return {"message": "Performance review deleted"}


# ═══════════════════════════════════════════════════════════════
#  CAREER DEVELOPMENT (6.4)
# ═══════════════════════════════════════════════════════════════

@router.get("/career-developments")
def list_career_developments(
    user_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(CareerDevelopment).filter(CareerDevelopment.user_id.in_(user_ids))
    if user_id:
        _ensure_target_in_scope(db, actor, user_id)
        q = q.filter(CareerDevelopment.user_id == user_id)
    if status:
        q = q.filter(CareerDevelopment.dev_status == status)
    return [_career_dev_payload(r) for r in q.order_by(CareerDevelopment.created_at.desc()).all()]


@router.get("/career-developments/my")
def my_career_development(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    row = db.query(CareerDevelopment).filter(CareerDevelopment.user_id == actor.id).first()
    if not row:
        return None
    return _career_dev_payload(row)


@router.post("/career-developments")
def create_career_development(
    payload: CareerDevelopmentIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    existing = db.query(CareerDevelopment).filter(CareerDevelopment.user_id == payload.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Career development record already exists for this employee")

    data = payload.model_dump()
    latest_review = (
        db.query(PerformanceReview)
        .filter(PerformanceReview.user_id == payload.user_id, PerformanceReview.review_status == "Approved")
        .order_by(PerformanceReview.created_at.desc())
        .first()
    )
    if latest_review:
        data["performance_rating"] = latest_review.performance_rating

    row = CareerDevelopment(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _career_dev_payload(row)


@router.put("/career-developments/{dev_id}")
def update_career_development(
    dev_id: int,
    payload: CareerDevelopmentIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(CareerDevelopment).filter(CareerDevelopment.id == dev_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Career development record not found")
    _ensure_target_in_scope(db, actor, row.user_id)
    for k, v in payload.model_dump().items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _career_dev_payload(row)


@router.delete("/career-developments/{dev_id}")
def delete_career_development(
    dev_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    row = db.query(CareerDevelopment).filter(CareerDevelopment.id == dev_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Career development record not found")
    db.delete(row)
    db.commit()
    return {"message": "Career development record deleted"}


# ═══════════════════════════════════════════════════════════════
#  PIP (Performance Improvement Plan 6.5)
# ═══════════════════════════════════════════════════════════════

@router.get("/pip")
def list_pip(
    user_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    q = db.query(PerformanceImprovementPlan).filter(PerformanceImprovementPlan.user_id.in_(user_ids))
    if user_id:
        _ensure_target_in_scope(db, actor, user_id)
        q = q.filter(PerformanceImprovementPlan.user_id == user_id)
    if status:
        q = q.filter(PerformanceImprovementPlan.approval_status == status)
    return [_pip_payload(r) for r in q.order_by(PerformanceImprovementPlan.created_at.desc()).all()]


@router.get("/pip/my")
def my_pip(
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    rows = db.query(PerformanceImprovementPlan).filter(PerformanceImprovementPlan.user_id == actor.id).order_by(PerformanceImprovementPlan.created_at.desc()).all()
    return [_pip_payload(r) for r in rows]


@router.post("/pip")
def create_pip(
    payload: PerformanceImprovementPlanIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    _ensure_target_in_scope(db, actor, payload.user_id)
    data = payload.model_dump()
    data["pip_no"] = _next_pip_no(db)
    start = data.get("pip_start_date")
    end = data.get("pip_end_date")
    if start and end:
        data["pip_duration"] = (end - start).days
    row = PerformanceImprovementPlan(**data)
    db.add(row)
    db.commit()
    db.refresh(row)
    return _pip_payload(row)


@router.put("/pip/{pip_id}/progress")
def update_pip_progress(
    pip_id: int,
    payload: PipProgressIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(PerformanceImprovementPlan).filter(PerformanceImprovementPlan.id == pip_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="PIP not found")
    _ensure_target_in_scope(db, actor, row.user_id)
    row.progress_status = payload.progress_status
    if payload.progress_comment:
        row.progress_comment = payload.progress_comment
    db.commit()
    db.refresh(row)
    return _pip_payload(row)


@router.put("/pip/{pip_id}/final-eval")
def final_eval_pip(
    pip_id: int,
    payload: PipFinalEvalIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(PerformanceImprovementPlan).filter(PerformanceImprovementPlan.id == pip_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="PIP not found")
    _ensure_target_in_scope(db, actor, row.user_id)
    row.final_result = payload.final_result
    row.recommendation = payload.recommendation
    row.approval_status = payload.approval_status
    if payload.final_result == "Passed":
        row.progress_status = "Completed"
    elif payload.final_result == "Failed":
        row.progress_status = "Failed"
    elif payload.final_result == "Extended":
        row.progress_status = "Extended"
    db.commit()
    db.refresh(row)
    return _pip_payload(row)


@router.put("/pip/{pip_id}")
def update_pip(
    pip_id: int,
    payload: PerformanceImprovementPlanIn,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*MGMT_ROLES)),
):
    row = db.query(PerformanceImprovementPlan).filter(PerformanceImprovementPlan.id == pip_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="PIP not found")
    _ensure_target_in_scope(db, actor, row.user_id)
    data = payload.model_dump()
    start = data.get("pip_start_date")
    end = data.get("pip_end_date")
    if start and end:
        data["pip_duration"] = (end - start).days
    for k, v in data.items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    return _pip_payload(row)


@router.delete("/pip/{pip_id}")
def delete_pip(
    pip_id: int,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    row = db.query(PerformanceImprovementPlan).filter(PerformanceImprovementPlan.id == pip_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="PIP not found")
    db.delete(row)
    db.commit()
    return {"message": "PIP deleted"}


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════════════════

@router.get("/dashboard")
def performance_dashboard(
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles(*PM_ROLES)),
):
    user_ids = _scope_ids(db, actor, include_self=True)
    today_date = date.today()

    total_kpi_plans = db.query(KpiPlan).filter(KpiPlan.user_id.in_(user_ids)).count()
    active_kpis = db.query(KpiPlan).filter(KpiPlan.user_id.in_(user_ids), KpiPlan.final_status == "Active").count()
    pending_approval = db.query(KpiPlan).filter(KpiPlan.user_id.in_(user_ids), KpiPlan.final_status == "Pending Approval").count()

    reviewed = db.query(PerformanceReview).filter(PerformanceReview.user_id.in_(user_ids), PerformanceReview.review_status == "Approved").count()
    pending_reviews = db.query(PerformanceReview).filter(PerformanceReview.user_id.in_(user_ids), PerformanceReview.review_status == "Draft").count()

    active_pip = db.query(PerformanceImprovementPlan).filter(
        PerformanceImprovementPlan.user_id.in_(user_ids),
        PerformanceImprovementPlan.approval_status.in_(["Draft", "Active"]),
    ).count()
    completed_pip = db.query(PerformanceImprovementPlan).filter(
        PerformanceImprovementPlan.user_id.in_(user_ids),
        PerformanceImprovementPlan.final_result == "Passed",
    ).count()

    kpi_by_dept = (
        db.query(User.department, func.count(KpiPlan.id))
        .join(KpiPlan, KpiPlan.user_id == User.id)
        .filter(KpiPlan.user_id.in_(user_ids))
        .group_by(User.department)
        .all()
    )

    kpi_by_period = (
        db.query(KpiPlan.kpi_period, func.count(KpiPlan.id))
        .filter(KpiPlan.user_id.in_(user_ids))
        .group_by(KpiPlan.kpi_period)
        .all()
    )

    employees_without_kpi = (
        db.query(User)
        .filter(User.id.in_(user_ids))
        .filter(~User.id.in_(db.query(KpiPlan.user_id).filter(KpiPlan.user_id.in_(user_ids))))
        .count()
    )

    active_dev = db.query(CareerDevelopment).filter(CareerDevelopment.user_id.in_(user_ids), CareerDevelopment.dev_status == "Active").count()
    promotion_candidates = db.query(CareerDevelopment).filter(
        CareerDevelopment.user_id.in_(user_ids),
        CareerDevelopment.readiness_level.in_(["Ready Now", "Ready in 1 Year"]),
    ).count()

    return {
        "total_kpi_plans": total_kpi_plans,
        "active_kpis": active_kpis,
        "pending_approval": pending_approval,
        "reviews_completed": reviewed,
        "pending_reviews": pending_reviews,
        "active_pip": active_pip,
        "completed_pip": completed_pip,
        "kpi_by_department": [{"department": d or "Unassigned", "count": c} for d, c in kpi_by_dept],
        "kpi_by_period": [{"period": p, "count": c} for p, c in kpi_by_period],
        "employees_without_kpi": employees_without_kpi,
        "active_development_plans": active_dev,
        "promotion_candidates": promotion_candidates,
    }
