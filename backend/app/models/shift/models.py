from sqlalchemy import (
    DECIMAL,
    Boolean,
    Column,
    DateTime,
    Enum,
    Integer,
    String,
    Time,
    func,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class ShiftMaster(Base):
    __tablename__ = "shift_master"

    id = Column(Integer, primary_key=True, index=True)
    shift_code = Column(String(50), unique=True, nullable=False, index=True)
    shift_name = Column(String(100), nullable=False)
    shift_type = Column(
        Enum("fixed", "rotational", "flexible", "night", "split", name="shift_type"),
        nullable=False,
    )
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    break_start_time = Column(Time, nullable=True)
    break_end_time = Column(Time, nullable=True)
    working_hours = Column(DECIMAL(5, 2), nullable=True)
    late_tolerance_minutes = Column(Integer, default=0, nullable=True)
    early_leave_tolerance_minutes = Column(Integer, default=0, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
