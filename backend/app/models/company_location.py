from sqlalchemy import DECIMAL, Column, Integer

from app.db.session import Base


class CompanyLocation(Base):
    __tablename__ = "company_location"

    id = Column(Integer, primary_key=True)
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    radius_meters = Column(Integer, default=100, nullable=False)
