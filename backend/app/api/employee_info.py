from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import MANAGEMENT_HR_ROLE, get_current_user, get_db, require_roles
from app.models.hris import (
    Department,
    EmployeeDocument,
    EmployeeProfile,
    Position,
)
from app.models.user import User
from app.schemas.hris import (
    DepartmentIn,
    DepartmentOut,
    EmployeeDocumentIn,
    EmployeeDocumentOut,
    EmployeeFullOut,
    EmployeePersonalInfoIn,
    EmployeeProfileIn,
    EmpInfoDashboardOut,
    PositionIn,
    PositionOut,
)

router = APIRouter(
    prefix="/api/employee-info",
    tags=["employee-info"],
    dependencies=[Depends(require_roles(MANAGEMENT_HR_ROLE))],
)


def _full_payload(profile: EmployeeProfile) -> dict:
    u = profile.user
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "name": u.name if u else None,
        "email": u.email if u else None,
        "emp_code": u.emp_code if u else None,
        "name_khmer": profile.name_khmer,
        "gender": profile.gender,
        "date_of_birth": profile.date_of_birth,
        "place_of_birth": profile.place_of_birth,
        "marital_status": profile.marital_status,
        "nationality": profile.nationality,
        "phone": profile.phone,
        "personal_email": profile.personal_email,
        "address": profile.address,
        "permanent_address": profile.permanent_address,
        "national_id": profile.national_id,
        "id_issue_date": profile.id_issue_date,
        "id_expiry_date": profile.id_expiry_date,
        "passport_no": profile.passport_no,
        "passport_expiry_date": profile.passport_expiry_date,
        "emergency_contact_name": profile.emergency_contact_name,
        "emergency_contact_relation": profile.emergency_contact_relation,
        "emergency_contact_phone": profile.emergency_contact_phone,
        "spouse_name": profile.spouse_name,
        "children_count": profile.children_count,
        "bank_name": profile.bank_name,
        "bank_account_name": profile.bank_account_name,
        "bank_account": profile.bank_account,
        "profile_photo": profile.profile_photo,
        "join_date": profile.join_date,
        "confirmation_date": profile.confirmation_date,
        "probation_end_date": profile.probation_end_date,
        "contract_type": profile.contract_type,
        "employment_status": profile.employment_status,
        "contract_start_date": profile.contract_start_date,
        "contract_end_date": profile.contract_end_date,
        "resignation_date": profile.resignation_date,
        "department": profile.department,
        "sub_department": profile.sub_department,
        "position": profile.position,
        "job_grade": profile.job_grade,
        "job_level": profile.job_level,
        "supervisor_id": profile.supervisor_id,
        "department_head_id": profile.department_head_id,
        "work_email": profile.work_email,
        "extension_no": profile.extension_no,
        "workstation": profile.workstation,
        "basic_salary": profile.basic_salary,
        "payroll_group": profile.payroll_group,
        "cost_center": profile.cost_center,
        "employee_category": profile.employee_category,
        "status": profile.employment_status,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


# ── Personal Information ──

@router.get("/employees", response_model=list[EmployeeFullOut])
def list_employees(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profiles = db.query(EmployeeProfile).order_by(EmployeeProfile.created_at.desc()).all()
    return [_full_payload(p) for p in profiles]


@router.get("/employees/{user_id}", response_model=EmployeeFullOut)
def get_employee(user_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Employee not found")
    return _full_payload(profile)


@router.put("/employees/{user_id}/personal-info")
def update_personal_info(user_id: int, data: EmployeePersonalInfoIn, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Employee not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)
    db.commit()
    return _full_payload(profile)


@router.put("/employees/{user_id}/profile")
def update_employee_profile(user_id: int, data: EmployeeProfileIn, db: Session = Depends(get_db), u: User = Depends(get_current_user)):
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(404, "Employee not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(profile, k, v)
    db.commit()
    return _full_payload(profile)


# ── Departments ──

@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Department).order_by(Department.name).all()
    result = []
    for r in rows:
        d = {
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "parent_id": r.parent_id,
            "department_head_id": r.department_head_id,
            "effective_date": r.effective_date,
            "status": r.status,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "head_name": r.head.name if r.head else None,
            "parent_name": r.parent.name if r.parent else None,
        }
        result.append(d)
    return result


@router.post("/departments", response_model=DepartmentOut)
def create_department(data: DepartmentIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return {
        "id": dept.id,
        "code": dept.code,
        "name": dept.name,
        "parent_id": dept.parent_id,
        "department_head_id": dept.department_head_id,
        "effective_date": dept.effective_date,
        "status": dept.status,
        "created_at": dept.created_at,
        "updated_at": dept.updated_at,
        "head_name": dept.head.name if dept.head else None,
        "parent_name": dept.parent.name if dept.parent else None,
    }


@router.put("/departments/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(dept, k, v)
    db.commit()
    db.refresh(dept)
    return {
        "id": dept.id,
        "code": dept.code,
        "name": dept.name,
        "parent_id": dept.parent_id,
        "department_head_id": dept.department_head_id,
        "effective_date": dept.effective_date,
        "status": dept.status,
        "created_at": dept.created_at,
        "updated_at": dept.updated_at,
        "head_name": dept.head.name if dept.head else None,
        "parent_name": dept.parent.name if dept.parent else None,
    }


@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(404, "Department not found")
    db.delete(dept)
    db.commit()
    return {"ok": True}


# ── Positions ──

@router.get("/positions", response_model=list[PositionOut])
def list_positions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(Position).order_by(Position.title).all()
    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "code": r.code,
            "title": r.title,
            "job_level": r.job_level,
            "grade": r.grade,
            "department_id": r.department_id,
            "reports_to_id": r.reports_to_id,
            "headcount_budget": r.headcount_budget,
            "current_headcount": r.current_headcount,
            "effective_date": r.effective_date,
            "status": r.status,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "department_name": r.department.name if r.department else None,
            "reports_to_title": r.reports_to.title if r.reports_to else None,
        })
    return result


@router.post("/positions", response_model=PositionOut)
def create_position(data: PositionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pos = Position(**data.model_dump())
    db.add(pos)
    db.commit()
    db.refresh(pos)
    return {
        "id": pos.id,
        "code": pos.code,
        "title": pos.title,
        "job_level": pos.job_level,
        "grade": pos.grade,
        "department_id": pos.department_id,
        "reports_to_id": pos.reports_to_id,
        "headcount_budget": pos.headcount_budget,
        "current_headcount": pos.current_headcount,
        "effective_date": pos.effective_date,
        "status": pos.status,
        "created_at": pos.created_at,
        "updated_at": pos.updated_at,
        "department_name": pos.department.name if pos.department else None,
        "reports_to_title": pos.reports_to.title if pos.reports_to else None,
    }


@router.put("/positions/{pos_id}", response_model=PositionOut)
def update_position(pos_id: int, data: PositionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(404, "Position not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(pos, k, v)
    db.commit()
    db.refresh(pos)
    return {
        "id": pos.id,
        "code": pos.code,
        "title": pos.title,
        "job_level": pos.job_level,
        "grade": pos.grade,
        "department_id": pos.department_id,
        "reports_to_id": pos.reports_to_id,
        "headcount_budget": pos.headcount_budget,
        "current_headcount": pos.current_headcount,
        "effective_date": pos.effective_date,
        "status": pos.status,
        "created_at": pos.created_at,
        "updated_at": pos.updated_at,
        "department_name": pos.department.name if pos.department else None,
        "reports_to_title": pos.reports_to.title if pos.reports_to else None,
    }


@router.delete("/positions/{pos_id}")
def delete_position(pos_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    pos = db.query(Position).filter(Position.id == pos_id).first()
    if not pos:
        raise HTTPException(404, "Position not found")
    db.delete(pos)
    db.commit()
    return {"ok": True}


# ── Documents ──

@router.get("/documents", response_model=list[EmployeeDocumentOut])
def list_documents(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rows = db.query(EmployeeDocument).order_by(EmployeeDocument.created_at.desc()).all()
    result = []
    for r in rows:
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "doc_type": r.doc_type,
            "doc_name": r.doc_name,
            "doc_number": r.doc_number,
            "issue_date": r.issue_date,
            "expiry_date": r.expiry_date,
            "file_path": r.file_path,
            "file_version": r.file_version,
            "status": r.status,
            "remarks": r.remarks,
            "uploaded_by": r.uploaded_by,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
            "employee_name": r.user.name if r.user else None,
            "uploader_name": r.uploader.name if r.uploader else None,
        })
    return result


@router.post("/documents", response_model=EmployeeDocumentOut)
def create_document(data: EmployeeDocumentIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = EmployeeDocument(uploaded_by=user.id, **data.model_dump())
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "doc_type": doc.doc_type,
        "doc_name": doc.doc_name,
        "doc_number": doc.doc_number,
        "issue_date": doc.issue_date,
        "expiry_date": doc.expiry_date,
        "file_path": doc.file_path,
        "file_version": doc.file_version,
        "status": doc.status,
        "remarks": doc.remarks,
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "employee_name": doc.user.name if doc.user else None,
        "uploader_name": doc.uploader.name if doc.uploader else None,
    }


@router.put("/documents/{doc_id}", response_model=EmployeeDocumentOut)
def update_document(doc_id: int, data: EmployeeDocumentIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(doc, k, v)
    doc.file_version = (doc.file_version or 1) + 1
    db.commit()
    db.refresh(doc)
    return {
        "id": doc.id,
        "user_id": doc.user_id,
        "doc_type": doc.doc_type,
        "doc_name": doc.doc_name,
        "doc_number": doc.doc_number,
        "issue_date": doc.issue_date,
        "expiry_date": doc.expiry_date,
        "file_path": doc.file_path,
        "file_version": doc.file_version,
        "status": doc.status,
        "remarks": doc.remarks,
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
        "employee_name": doc.user.name if doc.user else None,
        "uploader_name": doc.uploader.name if doc.uploader else None,
    }


@router.delete("/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    doc = db.query(EmployeeDocument).filter(EmployeeDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    db.delete(doc)
    db.commit()
    return {"ok": True}


# ── Dashboard ──

@router.get("/dashboard", response_model=EmpInfoDashboardOut)
def emp_info_dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    total = db.query(func.count(EmployeeProfile.id)).scalar()
    male = db.query(func.count(EmployeeProfile.id)).filter(EmployeeProfile.gender == "Male").scalar()
    female = db.query(func.count(EmployeeProfile.id)).filter(EmployeeProfile.gender == "Female").scalar()
    active = db.query(func.count(EmployeeProfile.id)).filter(EmployeeProfile.employment_status == "Active").scalar()
    depts = db.query(func.count(Department.id)).scalar()
    positions = db.query(func.count(Position.id)).scalar()
    docs = db.query(func.count(EmployeeDocument.id)).scalar()
    expired = db.query(func.count(EmployeeDocument.id)).filter(EmployeeDocument.status == "Expired").scalar()
    today = date.today()
    bdays = db.query(func.count(EmployeeProfile.id)).filter(
        func.extract("month", EmployeeProfile.date_of_birth) == today.month
    ).scalar()
    return EmpInfoDashboardOut(
        total_employees=total or 0,
        male_count=male or 0,
        female_count=female or 0,
        active_employees=active or 0,
        total_departments=depts or 0,
        total_positions=positions or 0,
        total_documents=docs or 0,
        expired_documents=expired or 0,
        upcoming_birthdays=bdays or 0,
    )
