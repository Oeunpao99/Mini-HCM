import pytest
from app.api import attendance, auth, company, hris, requests
from app.api.deps import get_db
from app.core.security import get_password_hash
from app.db.session import Base
from app.models.company_location import CompanyLocation
from app.models.hris import EmployeeProfile
from app.models.user import User
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


@pytest.fixture()
def client(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI()
    app.include_router(auth.router)
    app.include_router(company.router)
    app.include_router(attendance.router)
    app.include_router(requests.router)
    app.include_router(hris.router)
    app.dependency_overrides[get_db] = override_get_db

    with TestingSessionLocal() as db:
        db.add(
            CompanyLocation(
                id=1,
                latitude=28.6139,
                longitude=77.2090,
                radius_meters=100,
            )
        )
        db.add(
            User(
                emp_code="EMP001",
                name="Employee",
                email="emp@example.com",
                password_hash=get_password_hash("password123"),
                role="employee",
            )
        )
        db.add(
            User(
                emp_code="MGR001",
                name="Manager",
                email="mgr@example.com",
                password_hash=get_password_hash("password123"),
                role="manager",
            )
        )
        db.add(
            User(
                emp_code="HR001",
                name="HR Manager",
                email="hr@example.com",
                password_hash=get_password_hash("password123"),
                role="management_hr",
            )
        )
        db.commit()
        employee = db.query(User).filter(User.emp_code == "EMP001").first()
        manager = db.query(User).filter(User.emp_code == "MGR001").first()
        employee.manager_id = manager.id
        db.add(
            EmployeeProfile(
                user_id=employee.id,
                basic_salary=1500,
                bank_account="TEST001",
                status="active",
            )
        )
        db.commit()

    yield TestClient(app)


@pytest.fixture()
def employee_token(client):
    res = client.post(
        "/api/auth/login",
        json={"emp_code": "EMP001", "password": "password123"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture()
def manager_token(client):
    res = client.post(
        "/api/auth/login",
        json={"emp_code": "MGR001", "password": "password123"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture()
def hr_token(client):
    res = client.post(
        "/api/auth/login",
        json={"emp_code": "HR001", "password": "password123"},
    )
    assert res.status_code == 200
    return res.json()["access_token"]
