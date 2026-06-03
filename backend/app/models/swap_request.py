from sqlalchemy import DATE, Column, Enum, ForeignKey, Integer

from app.db.session import Base


class SwapRequest(Base):
    __tablename__ = "swap_requests"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    swap_date = Column(DATE, nullable=False, index=True)
    status = Column(
        Enum(
            "pending",
            "accepted_by_target",
            "approved_by_manager",
            "approved_by_admin",
            "rejected",
            name="swap_status",
        ),
        default="pending",
        nullable=False,
    )
