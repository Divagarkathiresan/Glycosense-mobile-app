from fastapi import APIRouter, Depends, HTTPException, Query

from auth.auth_utils import get_current_user
from database import SessionLocal
from models.notification_log import NotificationLog
from models.user import User
from services.reminder_service import get_user_reminder_status, run_monthly_metric_reminders

router = APIRouter()


@router.post("/reminders/monthly-metrics/run")
def run_monthly_metrics_reminder_job(
    dry_run: bool = Query(False),
    current_user: User = Depends(get_current_user),
):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    stats = run_monthly_metric_reminders(dry_run=dry_run)
    return {
        "ok": True,
        "dry_run": dry_run,
        "stats": stats,
    }


@router.get("/reminders/monthly-metrics/logs")
def get_monthly_metrics_reminder_logs(
    limit: int = Query(100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
):
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Forbidden: admin access required")

    db = SessionLocal()
    try:
        rows = (
            db.query(NotificationLog)
            .filter(NotificationLog.reminder_kind == "monthly_metrics_update")
            .order_by(NotificationLog.created_at.desc())
            .limit(limit)
            .all()
        )
        return {
            "logs": [
                {
                    "id": r.id,
                    "user_id": r.user_id,
                    "channel": r.channel,
                    "recipient": r.recipient,
                    "reminder_date": r.reminder_date.isoformat() if r.reminder_date else None,
                    "status": r.status,
                    "error_message": r.error_message,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
        }
    finally:
        db.close()


@router.get("/reminders/monthly-metrics/self-status")
def get_self_monthly_metrics_reminder_status(
    current_user: User = Depends(get_current_user),
):
    return get_user_reminder_status(current_user.id)
