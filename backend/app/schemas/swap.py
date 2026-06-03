from datetime import date

from pydantic import BaseModel


class SwapCreateIn(BaseModel):
    target_user_id: int
    swap_date: date


class SwapRespondIn(BaseModel):
    swap_request_id: int
    action: str


class SwapOut(BaseModel):
    id: int
    requester_id: int
    target_user_id: int
    swap_date: date
    status: str

    class Config:
        from_attributes = True
