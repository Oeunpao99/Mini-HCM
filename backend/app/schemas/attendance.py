from datetime import date, datetime, time

from pydantic import BaseModel


class CheckInOutRequest(BaseModel):
    latitude: float | None = None
    longitude: float | None = None
    timestamp: datetime | None = None
    flexible: bool = False


class AttendanceRecordOut(BaseModel):
    id: int
    user_id: int
    date: date
    check_in_time: time | None
    check_out_time: time | None
    check_in_lat: float | None
    check_in_lon: float | None
    check_out_lat: float | None
    check_out_lon: float | None
    is_late: bool | None
    is_early_checkout: bool | None
    flexible_scan: bool | None
    worked_hours: float | None
    remark: str | None
    requires_manager_approval: bool | None = None
    manager_approved: bool | None = None
    needs_approval_reason: str | None = None

    class Config:
        from_attributes = True


class MonthlyAttendanceOut(BaseModel):
    records: list[AttendanceRecordOut]
    total_worked_days: int
    total_late_days: int
    total_ot_hours: float
