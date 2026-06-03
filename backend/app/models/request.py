from sqlalchemy import (
    DATE,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class Request(Base):
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum("leave", "permission", "flexible", "ot", name="request_type"), nullable=False)
    date = Column(DATE, nullable=False, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    leave_type = Column(String(50), nullable=True)
    backup_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    backup_status = Column(String(20), default="skipped", nullable=False)
    backup_approved_at = Column(DateTime, nullable=True)
    line_manager_status = Column(String(20), default="pending", nullable=False)
    line_manager_approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    line_manager_approved_at = Column(DateTime, nullable=True)
    department_head_status = Column(String(20), default="pending", nullable=False)
    department_head_approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    department_head_approved_at = Column(DateTime, nullable=True)
    hr_status = Column(String(20), default="pending", nullable=False)
    hr_approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    hr_approved_at = Column(DateTime, nullable=True)
    reason = Column(Text, nullable=True)
    status = Column(Enum("pending", "approved", "rejected", "cancelled", name="request_status"), default="pending")
    admin_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="requests", foreign_keys=[user_id])
    backup_user = relationship("User", foreign_keys=[backup_user_id])
