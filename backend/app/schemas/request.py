from datetime import date, datetime, time

from pydantic import BaseModel


class CreateRequestIn(BaseModel):
    type: str
    date: date
    start_time: time | None = None
    end_time: time | None = None
    leave_type: str | None = None
    backup_user_id: int | None = None
    reason: str | None = None


class UpdateRequestStatusIn(BaseModel):
    request_id: int
    status: str
    admin_remarks: str | None = None


class CancelRequestIn(BaseModel):
    request_id: int


class ApprovalFlowIn(BaseModel):
    stages: list[str]


class ApprovalFlowOut(BaseModel):
    stages: list[str]


class RequestOut(BaseModel):
    id: int
    user_id: int
    type: str
    date: date
    start_time: time | None
    end_time: time | None
    leave_type: str | None = None
    backup_user_id: int | None = None
    backup_status: str | None = None
    backup_approved_at: datetime | None = None
    line_manager_status: str | None = None
    line_manager_approved_by: int | None = None
    line_manager_approved_at: datetime | None = None
    department_head_status: str | None = None
    department_head_approved_by: int | None = None
    department_head_approved_at: datetime | None = None
    hr_status: str | None = None
    hr_approved_by: int | None = None
    hr_approved_at: datetime | None = None
    reason: str | None
    status: str
    admin_remarks: str | None

    class Config:
        from_attributes = True
