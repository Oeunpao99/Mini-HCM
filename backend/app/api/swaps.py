from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    ensure_user_in_scope,
    get_current_user,
    get_db,
    normalize_role,
    require_roles,
    scoped_user_ids,
)
from app.models.attendance import Attendance
from app.models.swap_request import SwapRequest
from app.models.user import User
from app.schemas.swap import SwapCreateIn, SwapOut, SwapRespondIn

router = APIRouter(prefix="/api/swap", tags=["swap"])


@router.post("/request", response_model=SwapOut)
def create_swap_request(
    payload: SwapCreateIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.target_user_id == user.id:
        raise HTTPException(status_code=400, detail="Cannot swap with self")

    swap = SwapRequest(
        requester_id=user.id,
        target_user_id=payload.target_user_id,
        swap_date=payload.swap_date,
        status="pending",
    )
    db.add(swap)
    db.commit()
    db.refresh(swap)
    return swap


@router.put("/respond", response_model=SwapOut)
def respond_swap(
    payload: SwapRespondIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    swap = db.query(SwapRequest).filter(SwapRequest.id == payload.swap_request_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    action = payload.action.lower()
    if user.id == swap.target_user_id:
        if action == "accept":
            swap.status = "accepted_by_target"
        elif action == "reject":
            swap.status = "rejected"
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
    elif normalize_role(user.role) in {LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE}:
        ensure_user_in_scope(db, user, swap.requester_id)
        ensure_user_in_scope(db, user, swap.target_user_id)
        if action == "approve":
            if swap.status != "accepted_by_target":
                raise HTTPException(status_code=400, detail="Target user must accept before final approval")
            swap.status = (
                "approved_by_admin"
                if normalize_role(user.role) == MANAGEMENT_HR_ROLE
                else "approved_by_manager"
            )
            _apply_swap(db, swap)
        elif action == "reject":
            swap.status = "rejected"
        else:
            raise HTTPException(status_code=400, detail="Invalid action")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    db.commit()
    db.refresh(swap)
    return swap


def _apply_swap(db: Session, swap: SwapRequest) -> None:
    requester_att = (
        db.query(Attendance)
        .filter(Attendance.user_id == swap.requester_id, Attendance.date == swap.swap_date)
        .first()
    )
    target_att = (
        db.query(Attendance)
        .filter(Attendance.user_id == swap.target_user_id, Attendance.date == swap.swap_date)
        .first()
    )

    if requester_att and target_att:
        req_payload = {
            "check_in_time": requester_att.check_in_time,
            "check_in_lat": requester_att.check_in_lat,
            "check_in_lon": requester_att.check_in_lon,
            "check_out_time": requester_att.check_out_time,
            "check_out_lat": requester_att.check_out_lat,
            "check_out_lon": requester_att.check_out_lon,
            "is_late": requester_att.is_late,
            "is_early_checkout": requester_att.is_early_checkout,
            "worked_hours": requester_att.worked_hours,
            "remark": requester_att.remark,
        }

        requester_att.check_in_time = target_att.check_in_time
        requester_att.check_in_lat = target_att.check_in_lat
        requester_att.check_in_lon = target_att.check_in_lon
        requester_att.check_out_time = target_att.check_out_time
        requester_att.check_out_lat = target_att.check_out_lat
        requester_att.check_out_lon = target_att.check_out_lon
        requester_att.is_late = target_att.is_late
        requester_att.is_early_checkout = target_att.is_early_checkout
        requester_att.worked_hours = target_att.worked_hours
        requester_att.remark = target_att.remark

        target_att.check_in_time = req_payload["check_in_time"]
        target_att.check_in_lat = req_payload["check_in_lat"]
        target_att.check_in_lon = req_payload["check_in_lon"]
        target_att.check_out_time = req_payload["check_out_time"]
        target_att.check_out_lat = req_payload["check_out_lat"]
        target_att.check_out_lon = req_payload["check_out_lon"]
        target_att.is_late = req_payload["is_late"]
        target_att.is_early_checkout = req_payload["is_early_checkout"]
        target_att.worked_hours = req_payload["worked_hours"]
        target_att.remark = req_payload["remark"]


@router.get("/my", response_model=list[SwapOut])
def my_swaps(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(SwapRequest)
        .filter(or_(SwapRequest.requester_id == user.id, SwapRequest.target_user_id == user.id))
        .order_by(SwapRequest.id.desc())
        .all()
    )


@router.get("/all", response_model=list[SwapOut])
def all_swaps(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    user_ids = scoped_user_ids(db, user, include_self=True)
    return (
        db.query(SwapRequest)
        .filter(
            or_(
                SwapRequest.requester_id.in_(user_ids),
                SwapRequest.target_user_id.in_(user_ids),
            )
        )
        .order_by(SwapRequest.id.desc())
        .all()
    )
