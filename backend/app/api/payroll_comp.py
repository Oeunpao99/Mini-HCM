from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.api.deps import get_current_user, get_db
from app.models.hris import (
    BENEFIT_TYPES,
    MOVEMENT_TYPES,
    PAYROLL_BATCH_STATUSES,
    PAYROLL_CYCLES,
    Compensation,
    EmployeeBenefit,
    EmployeeProfile,
    PayrollBatch,
    PayrollEmployee,
    SenioritySeverance,
    StaffMovement,
)
from app.models.user import User
from app.schemas.hris import (
    CompensationIn,
    CompensationOut,
    EmployeeBenefitIn,
    EmployeeBenefitOut,
    PayrollBatchIn,
    PayrollBatchOut,
    PayrollDashboardOut,
    PayrollEmployeeIn,
    PayrollEmployeeOut,
    SenioritySeveranceIn,
    SenioritySeveranceOut,
    StaffMovementIn,
    StaffMovementOut,
)

router = APIRouter(prefix="/api/payroll-comp", tags=["payroll-comp"])


def _emp_data(user_id: int, db: Session) -> dict:
    emp = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not emp:
        return {"employee_name": None, "department": None}
    return {"employee_name": emp.name, "department": emp.department}


# ── Payroll Batch ──

@router.get("/batches", response_model=list[PayrollBatchOut])
def list_batches(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(PayrollBatch).order_by(PayrollBatch.created_at.desc()).all()


@router.post("/batches", response_model=PayrollBatchOut)
def create_batch(data: PayrollBatchIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(func.count(PayrollBatch.id)).scalar() + 1
    batch_no = f"PR-{data.year}{data.month:02d}-{count:04d}"
    batch = PayrollBatch(batch_no=batch_no, **data.model_dump(exclude={"notes"}), notes=data.notes)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/batches/{batch_id}", response_model=PayrollBatchOut)
def get_batch(batch_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    batch = db.query(PayrollBatch).filter(PayrollBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found")
    return batch


@router.put("/batches/{batch_id}/status")
def update_batch_status(batch_id: int, status: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    batch = db.query(PayrollBatch).filter(PayrollBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found")
    if status not in PAYROLL_BATCH_STATUSES:
        raise HTTPException(400, f"Invalid status. Valid: {', '.join(PAYROLL_BATCH_STATUSES)}")
    batch.status = status
    db.commit()
    return {"status": status}


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    batch = db.query(PayrollBatch).filter(PayrollBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found")
    db.query(PayrollEmployee).filter(PayrollEmployee.batch_id == batch_id).delete()
    db.delete(batch)
    db.commit()
    return {"ok": True}


# ── Payroll Employee ──

@router.get("/batches/{batch_id}/employees", response_model=list[PayrollEmployeeOut])
def list_payroll_employees(batch_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(PayrollEmployee).filter(PayrollEmployee.batch_id == batch_id).all()
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        emp = _emp_data(r.user_id, db)
        d["employee_name"] = emp["employee_name"]
        d["department"] = emp["department"]
        result.append(d)
    return result


@router.post("/batches/{batch_id}/employees", response_model=PayrollEmployeeOut)
def add_payroll_employee(batch_id: int, data: PayrollEmployeeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    batch = db.query(PayrollBatch).filter(PayrollBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(404, "Batch not found")
    gross = data.basic_salary + (sum(data.allowances.values()) if data.allowances else 0)
    deductions = data.late_deduction + data.nssf + data.tax + (sum(data.other_deductions.values()) if data.other_deductions else 0)
    net = gross + data.ot_amount - deductions
    emp = PayrollEmployee(batch_id=batch_id, gross_salary=gross, net_salary=net, **data.model_dump(exclude={"allowances", "other_deductions"}), allowances=data.allowances, other_deductions=data.other_deductions)
    db.add(emp)

    total_emp = db.query(func.count(PayrollEmployee.id)).filter(PayrollEmployee.batch_id == batch_id).scalar()
    batch.employee_count = total_emp
    batch.total_basic += data.basic_salary
    batch.total_allowances += gross - data.basic_salary
    batch.total_overtime += data.ot_amount
    batch.total_deductions += deductions
    batch.total_net += net
    db.commit()
    db.refresh(emp)

    d = {c.name: getattr(emp, c.name) for c in emp.__table__.columns}
    emp_data = _emp_data(emp.user_id, db)
    d["employee_name"] = emp_data["employee_name"]
    d["department"] = emp_data["department"]
    return d


@router.put("/payroll-employees/{emp_id}", response_model=PayrollEmployeeOut)
def update_payroll_employee(emp_id: int, data: PayrollEmployeeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    emp = db.query(PayrollEmployee).filter(PayrollEmployee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Payroll employee not found")
    batch = db.query(PayrollBatch).filter(PayrollBatch.id == emp.batch_id).first()

    batch.total_basic -= emp.basic_salary
    batch.total_allowances -= (emp.gross_salary - emp.basic_salary)
    batch.total_overtime -= emp.ot_amount
    old_ded = emp.late_deduction + emp.nssf + emp.tax + (sum(emp.other_deductions.values()) if emp.other_deductions else 0)
    batch.total_deductions -= old_ded
    batch.total_net -= emp.net_salary

    gross = data.basic_salary + (sum(data.allowances.values()) if data.allowances else 0)
    deductions = data.late_deduction + data.nssf + data.tax + (sum(data.other_deductions.values()) if data.other_deductions else 0)
    net = gross + data.ot_amount - deductions

    for k, v in data.model_dump(exclude={"allowances", "other_deductions"}).items():
        setattr(emp, k, v)
    emp.gross_salary = gross
    emp.net_salary = net
    emp.allowances = data.allowances
    emp.other_deductions = data.other_deductions

    batch.total_basic += data.basic_salary
    batch.total_allowances += gross - data.basic_salary
    batch.total_overtime += data.ot_amount
    batch.total_deductions += deductions
    batch.total_net += net
    db.commit()
    db.refresh(emp)

    d = {c.name: getattr(emp, c.name) for c in emp.__table__.columns}
    emp_data = _emp_data(emp.user_id, db)
    d["employee_name"] = emp_data["employee_name"]
    d["department"] = emp_data["department"]
    return d


@router.delete("/payroll-employees/{emp_id}")
def delete_payroll_employee(emp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    emp = db.query(PayrollEmployee).filter(PayrollEmployee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Payroll employee not found")
    batch = db.query(PayrollBatch).filter(PayrollBatch.id == emp.batch_id).first()
    old_ded = emp.late_deduction + emp.nssf + emp.tax + (sum(emp.other_deductions.values()) if emp.other_deductions else 0)
    batch.total_basic -= emp.basic_salary
    batch.total_allowances -= (emp.gross_salary - emp.basic_salary)
    batch.total_overtime -= emp.ot_amount
    batch.total_deductions -= old_ded
    batch.total_net -= emp.net_salary
    batch.employee_count -= 1
    db.delete(emp)
    db.commit()
    return {"ok": True}


# ── Compensation ──

@router.get("/compensations", response_model=list[CompensationOut])
def list_compensations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Compensation).order_by(Compensation.created_at.desc()).all()
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        emp = _emp_data(r.user_id, db)
        d["employee_name"] = emp["employee_name"]
        d["department"] = emp["department"]
        result.append(d)
    return result


@router.post("/compensations", response_model=CompensationOut)
def create_compensation(data: CompensationIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    existing = db.query(Compensation).filter(Compensation.user_id == data.user_id).order_by(Compensation.created_at.desc()).first()
    prev = existing.new_salary if existing and existing.new_salary else (existing.basic_salary if existing else 0)
    adj_amt = (data.new_salary - prev) if data.new_salary else None
    comp = Compensation(previous_salary=prev, adjustment_amount=adj_amt, **data.model_dump())
    db.add(comp)
    db.commit()
    db.refresh(comp)
    d = {c.name: getattr(comp, c.name) for c in comp.__table__.columns}
    emp = _emp_data(comp.user_id, db)
    d["employee_name"] = emp["employee_name"]
    d["department"] = emp["department"]
    return d


@router.put("/compensations/{comp_id}", response_model=CompensationOut)
def update_compensation(comp_id: int, data: CompensationIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    comp = db.query(Compensation).filter(Compensation.id == comp_id).first()
    if not comp:
        raise HTTPException(404, "Compensation not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(comp, k, v)
    if data.new_salary:
        comp.adjustment_amount = data.new_salary - (comp.previous_salary or 0)
    db.commit()
    db.refresh(comp)
    d = {c.name: getattr(comp, c.name) for c in comp.__table__.columns}
    emp = _emp_data(comp.user_id, db)
    d["employee_name"] = emp["employee_name"]
    d["department"] = emp["department"]
    return d


@router.delete("/compensations/{comp_id}")
def delete_compensation(comp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    comp = db.query(Compensation).filter(Compensation.id == comp_id).first()
    if not comp:
        raise HTTPException(404, "Compensation not found")
    db.delete(comp)
    db.commit()
    return {"ok": True}


# ── Benefits ──

@router.get("/benefits", response_model=list[EmployeeBenefitOut])
def list_benefits(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(EmployeeBenefit).order_by(EmployeeBenefit.created_at.desc()).all()
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        emp = _emp_data(r.user_id, db)
        d["employee_name"] = emp["employee_name"]
        d["department"] = emp["department"]
        result.append(d)
    return result


@router.post("/benefits", response_model=EmployeeBenefitOut)
def create_benefit(data: EmployeeBenefitIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ben = EmployeeBenefit(**data.model_dump())
    db.add(ben)
    db.commit()
    db.refresh(ben)
    d = {c.name: getattr(ben, c.name) for c in ben.__table__.columns}
    emp = _emp_data(ben.user_id, db)
    d["employee_name"] = emp["employee_name"]
    d["department"] = emp["department"]
    return d


@router.put("/benefits/{ben_id}", response_model=EmployeeBenefitOut)
def update_benefit(ben_id: int, data: EmployeeBenefitIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ben = db.query(EmployeeBenefit).filter(EmployeeBenefit.id == ben_id).first()
    if not ben:
        raise HTTPException(404, "Benefit not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ben, k, v)
    db.commit()
    db.refresh(ben)
    d = {c.name: getattr(ben, c.name) for c in ben.__table__.columns}
    emp = _emp_data(ben.user_id, db)
    d["employee_name"] = emp["employee_name"]
    d["department"] = emp["department"]
    return d


@router.delete("/benefits/{ben_id}")
def delete_benefit(ben_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ben = db.query(EmployeeBenefit).filter(EmployeeBenefit.id == ben_id).first()
    if not ben:
        raise HTTPException(404, "Benefit not found")
    db.delete(ben)
    db.commit()
    return {"ok": True}


# ── Seniority & Severance ──

@router.get("/seniority-severances", response_model=list[SenioritySeveranceOut])
def list_seniority_severances(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(SenioritySeverance).order_by(SenioritySeverance.created_at.desc()).all()
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        emp = _emp_data(r.user_id, db)
        d["employee_name"] = emp["employee_name"]
        d["department"] = emp["department"]
        result.append(d)
    return result


@router.post("/seniority-severances", response_model=SenioritySeveranceOut)
def create_seniority_severance(data: SenioritySeveranceIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = SenioritySeverance(**data.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    emp = _emp_data(row.user_id, db)
    d["employee_name"] = emp["employee_name"]
    d["department"] = emp["department"]
    return d


@router.put("/seniority-severances/{ss_id}", response_model=SenioritySeveranceOut)
def update_seniority_severance(ss_id: int, data: SenioritySeveranceIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(SenioritySeverance).filter(SenioritySeverance.id == ss_id).first()
    if not row:
        raise HTTPException(404, "Record not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    db.commit()
    db.refresh(row)
    d = {c.name: getattr(row, c.name) for c in row.__table__.columns}
    emp = _emp_data(row.user_id, db)
    d["employee_name"] = emp["employee_name"]
    d["department"] = emp["department"]
    return d


@router.put("/seniority-severances/{ss_id}/status")
def update_ss_status(ss_id: int, status: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(SenioritySeverance).filter(SenioritySeverance.id == ss_id).first()
    if not row:
        raise HTTPException(404, "Record not found")
    row.status = status
    db.commit()
    return {"status": status}


@router.delete("/seniority-severances/{ss_id}")
def delete_seniority_severance(ss_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = db.query(SenioritySeverance).filter(SenioritySeverance.id == ss_id).first()
    if not row:
        raise HTTPException(404, "Record not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ── Staff Movement ──

@router.get("/movements", response_model=list[StaffMovementOut])
def list_movements(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(StaffMovement).order_by(StaffMovement.created_at.desc()).all()
    result = []
    for r in rows:
        d = {c.name: getattr(r, c.name) for c in r.__table__.columns}
        emp = _emp_data(r.user_id, db)
        req = _emp_data(r.requested_by, db)
        d["employee_name"] = emp["employee_name"]
        d["department"] = emp["department"]
        d["requester_name"] = req["employee_name"]
        result.append(d)
    return result


@router.post("/movements", response_model=StaffMovementOut)
def create_movement(data: StaffMovementIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    count = db.query(func.count(StaffMovement.id)).scalar() + 1
    movement_no = f"SM-{count:04d}"
    emp = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == data.user_id).first()
    current_dept = emp.department if emp else None
    current_pos = emp.position if emp else None
    cur_salary = None
    comp = db.query(Compensation).filter(Compensation.user_id == data.user_id).order_by(Compensation.created_at.desc()).first()
    if comp and comp.new_salary:
        cur_salary = comp.new_salary
    elif comp:
        cur_salary = comp.basic_salary
    salary_diff = (data.new_salary - cur_salary) if (data.new_salary and cur_salary) else None
    mov = StaffMovement(
        movement_no=movement_no,
        current_department=current_dept,
        current_position=current_pos,
        current_salary=cur_salary,
        salary_difference=salary_diff,
        requested_by=user.id,
        **data.model_dump(),
    )
    db.add(mov)
    db.commit()
    db.refresh(mov)
    d = {c.name: getattr(mov, c.name) for c in mov.__table__.columns}
    emp_data = _emp_data(mov.user_id, db)
    req_data = _emp_data(mov.requested_by, db)
    d["employee_name"] = emp_data["employee_name"]
    d["department"] = emp_data["department"]
    d["requester_name"] = req_data["employee_name"]
    return d


@router.put("/movements/{mov_id}", response_model=StaffMovementOut)
def update_movement(mov_id: int, data: StaffMovementIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mov = db.query(StaffMovement).filter(StaffMovement.id == mov_id).first()
    if not mov:
        raise HTTPException(404, "Movement not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(mov, k, v)
    if data.new_salary and mov.current_salary:
        mov.salary_difference = data.new_salary - mov.current_salary
    db.commit()
    db.refresh(mov)
    d = {c.name: getattr(mov, c.name) for c in mov.__table__.columns}
    emp_data = _emp_data(mov.user_id, db)
    req_data = _emp_data(mov.requested_by, db)
    d["employee_name"] = emp_data["employee_name"]
    d["department"] = emp_data["department"]
    d["requester_name"] = req_data["employee_name"]
    return d


@router.put("/movements/{mov_id}/status")
def update_movement_status(mov_id: int, status: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mov = db.query(StaffMovement).filter(StaffMovement.id == mov_id).first()
    if not mov:
        raise HTTPException(404, "Movement not found")
    mov.approval_status = status
    if status == "Approved":
        mov.approved_by = user.id
        mov.approval_date = date.today()
        emp = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == mov.user_id).first()
        if emp:
            if mov.new_department:
                emp.department = mov.new_department
            if mov.new_position:
                emp.position = mov.new_position
    db.commit()
    return {"status": status}


@router.delete("/movements/{mov_id}")
def delete_movement(mov_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    mov = db.query(StaffMovement).filter(StaffMovement.id == mov_id).first()
    if not mov:
        raise HTTPException(404, "Movement not found")
    db.delete(mov)
    db.commit()
    return {"ok": True}


# ── Dashboard ──

@router.get("/dashboard", response_model=PayrollDashboardOut)
def payroll_comp_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total_payroll = db.query(func.coalesce(func.sum(PayrollBatch.total_net), 0)).scalar()
    net_amount = db.query(func.coalesce(func.sum(PayrollEmployee.net_salary), 0)).filter(PayrollEmployee.status == "Paid").scalar()
    emp_paid = db.query(func.count(func.distinct(PayrollEmployee.user_id))).filter(PayrollEmployee.status == "Paid").scalar()
    pending = db.query(func.count(PayrollBatch.id)).filter(PayrollBatch.status.in_(["Draft", "Calculated"])).scalar()
    total_comp = db.query(func.coalesce(func.sum(Compensation.basic_salary), 0)).scalar()
    emp_count = db.query(func.count(func.distinct(Compensation.user_id))).scalar() or 1
    avg_sal = total_comp / emp_count
    active_ben = db.query(func.count(EmployeeBenefit.id)).filter(EmployeeBenefit.status == "Active").scalar()
    pending_ss = db.query(func.count(SenioritySeverance.id)).filter(SenioritySeverance.status.in_(["Draft", "Pending Approval"])).scalar()
    pending_mov = db.query(func.count(StaffMovement.id)).filter(StaffMovement.approval_status.in_(["Draft", "Pending Approval"])).scalar()
    return PayrollDashboardOut(
        total_payroll_cost=total_payroll or 0,
        net_payroll_amount=net_amount or 0,
        employees_paid=emp_paid or 0,
        pending_payroll=pending or 0,
        total_compensation_cost=total_comp or 0,
        avg_salary=avg_sal,
        active_benefits=active_ben or 0,
        pending_seniority=pending_ss or 0,
        pending_movements=pending_mov or 0,
    )
