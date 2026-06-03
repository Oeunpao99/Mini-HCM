from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    emp_code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(
        Enum(
            "staff",
            "line_manager",
            "department_head",
            "management_hr",
            "payroll_officer",
            "employee",
            "manager",
            "admin",
            name="user_role",
        ),
        default="staff",
        nullable=False,
    )
    department = Column(String(100), nullable=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, server_default=func.now())

    attendances = relationship("Attendance", back_populates="user", foreign_keys="Attendance.user_id")
    requests = relationship("Request", back_populates="user", foreign_keys="Request.user_id")
    manager = relationship("User", remote_side=[id], back_populates="direct_reports")
    direct_reports = relationship("User", back_populates="manager")
