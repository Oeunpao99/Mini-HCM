from sqlalchemy import (
    DATE,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
    func,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class OtRequest(Base):
    __tablename__ = "ot_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DATE, nullable=False, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    reason = Column(Text, nullable=True)
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
    status = Column(String(20), default="pending")
    admin_remarks = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="ot_requests", foreign_keys=[user_id])
    backup_user = relationship("User", foreign_keys=[backup_user_id])
