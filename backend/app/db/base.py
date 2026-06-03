# app/db/base.py
from sqlalchemy.orm import declarative_base


# Now import all your models
from app.models.attendance import Attendance
from app.models.app_setting import AppSetting
from app.models.company_location import CompanyLocation
from app.models.hris import (
    EmployeeHistory,
    EmployeeMovementRequest,
    EmployeeProfile,
    KpiRecord,
    PayrollRecord,
    PerformanceReview,
    PublicHoliday,
    ScheduleChange,
    ShiftSchedule,
    TrainingRecord,
)
from app.models.location_alert import LocationAlert
from app.models.request import Request
from app.models.swap_request import SwapRequest
from app.models.user import User

# Create the declarative base
Base = declarative_base()


__all__ = [
    "Base",  # Add Base to exports
    "User",
    "AppSetting",
    "CompanyLocation",
    "Attendance",
    "Request",
    "SwapRequest",
    "LocationAlert",
    "EmployeeProfile",
    "EmployeeHistory",
    "EmployeeMovementRequest",
    "ShiftSchedule",
    "ScheduleChange",
    "PayrollRecord",
    "PerformanceReview",
    "KpiRecord",
    "PublicHoliday",
    "TrainingRecord",
]
