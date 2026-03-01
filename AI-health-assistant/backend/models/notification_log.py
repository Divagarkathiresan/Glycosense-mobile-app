from datetime import datetime

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, UniqueConstraint

from database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "reminder_kind",
            "channel",
            "reminder_date",
            name="uq_notification_logs_user_kind_channel_date",
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reminder_kind = Column(String(50), nullable=False, index=True)
    channel = Column(String(20), nullable=False, index=True)
    recipient = Column(String(40), nullable=False)
    reminder_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="sent")
    error_message = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
