from sqlalchemy.orm import declarative_base

from app.models.attendance.models import Attendance
from app.models.app_setting import AppSetting
from app.models.company_location import CompanyLocation
from app.models.hris import (
    CareerDevelopment,
    CompetencyAssessment,
    EmployeeHistory,
    EmployeeMovementRequest,
    EmployeeProfile,
    KpiMonitoring,
    KpiPlan,
    KpiRecord,
    PayrollRecord,
    PerformanceImprovementPlan,
    PerformanceReview,
    PublicHoliday,
    ScheduleChange,
    ShiftSchedule,
    TrainingPlan,
    TrainingRecord,
)
from app.models.leave.models import LeaveEntitlement, LeaveRequest
from app.models.location_alert import LocationAlert
from app.models.ot.models import OtRequest
from app.models.request import Request
from app.models.shift.models import ShiftMaster
from app.models.swap_request import SwapRequest
from app.models.user import User

Base = declarative_base()


__all__ = [
    "Base",
    "User",
    "AppSetting",
    "CompanyLocation",
    "Attendance",
    "LeaveRequest",
    "LeaveEntitlement",
    "OtRequest",
    "Request",
    "SwapRequest",
    "LocationAlert",
    "EmployeeProfile",
    "EmployeeHistory",
    "EmployeeMovementRequest",
    "ShiftMaster",
    "ShiftSchedule",
    "ScheduleChange",
    "PayrollRecord",
    "PerformanceReview",
    "KpiRecord",
    "PublicHoliday",
    "TrainingPlan",
    "TrainingRecord",
    "CompetencyAssessment",
    "KpiPlan",
    "KpiMonitoring",
    "CareerDevelopment",
    "PerformanceImprovementPlan",
]
