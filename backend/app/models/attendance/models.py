from sqlalchemy import (
    DATE,
    DECIMAL,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class Attendance(Base):
    __tablename__ = "attendance"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_attendance_user_date"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DATE, nullable=False, index=True)
    check_in_time = Column(Time, nullable=True)
    check_in_lat = Column(DECIMAL(10, 8), nullable=True)
    check_in_lon = Column(DECIMAL(11, 8), nullable=True)
    check_out_time = Column(Time, nullable=True)
    check_out_lat = Column(DECIMAL(10, 8), nullable=True)
    check_out_lon = Column(DECIMAL(11, 8), nullable=True)
    is_late = Column(Boolean, default=False)
    is_early_checkout = Column(Boolean, default=False)
    flexible_scan = Column(Boolean, default=False)
    worked_hours = Column(DECIMAL(5, 2), nullable=True)
    remark = Column(String(255), nullable=True)
    requires_manager_approval = Column(Boolean, default=False)
    manager_approved = Column(Boolean, nullable=True)
    manager_approved_at = Column(DateTime, nullable=True)
    manager_approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    needs_approval_reason = Column(String(255), nullable=True)
    swapped_out = Column(Boolean, default=False)

    user = relationship("User", back_populates="attendances", foreign_keys=[user_id])
