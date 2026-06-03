from sqlalchemy import Column, DateTime, String, Text, func

from app.db.session import Base


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(Text, nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
