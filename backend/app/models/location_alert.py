from sqlalchemy import (
    DATE,
    DECIMAL,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)

from app.db.session import Base


class LocationAlert(Base):
    __tablename__ = "location_alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DATE, nullable=False)
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    distance_meters = Column(DECIMAL(10, 2), nullable=False)
    action_type = Column(String(20), nullable=False)
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
