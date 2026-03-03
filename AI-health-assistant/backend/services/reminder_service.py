import base64
import json
import os
import ssl
import threading
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from database import SessionLocal
from models.notification_log import NotificationLog
from models.user import User
from models.user_metrics import UserMetrics

try:
    import certifi  # type: ignore
except Exception:
    certifi = None


REMINDER_KIND_MONTHLY_METRICS = "monthly_metrics_update"
DEFAULT_INACTIVITY_MINUTES = 1
DEFAULT_JOB_INTERVAL_SECONDS = 60

REMINDER_MESSAGE_TEMPLATE = (
    "Hi {name}. Message from Glycosense. We think your risk score is not updated. "
    "Can you please update your metrics and check your risk score immediately. "
    "Thank you.\n- Glycosense"
)


def _normalize_phone(phone_number: str) -> Optional[str]:
    if not phone_number:
        return None
    cleaned = "".join(ch for ch in phone_number if ch.isdigit() or ch == "+")
    if cleaned.startswith("00"):
        cleaned = f"+{cleaned[2:]}"
    if not cleaned.startswith("+"):
        default_cc = os.getenv("DEFAULT_PHONE_COUNTRY_CODE", "+1").strip()
        if not default_cc.startswith("+"):
            default_cc = f"+{default_cc}"
        if len(cleaned) == 10:
            cleaned = f"{default_cc}{cleaned}"
        elif len(cleaned) >= 11:
            cleaned = f"+{cleaned}"
        else:
            return None
    digits = "".join(ch for ch in cleaned if ch.isdigit())
    if len(digits) < 11:
        return None
    return f"+{digits}"


def _format_whatsapp_number(phone_number: str) -> str:
    return f"whatsapp:{phone_number}"


def _last_metric_for_user(db: Session, user_id: int) -> Optional[UserMetrics]:
    return (
        db.query(UserMetrics)
        .filter(UserMetrics.user_id == user_id)
        .order_by(UserMetrics.created_at.desc())
        .first()
    )


def _latest_reminder_for_user(db: Session, user_id: int, channel: str) -> Optional[NotificationLog]:
    return (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == user_id,
            NotificationLog.reminder_kind == REMINDER_KIND_MONTHLY_METRICS,
            NotificationLog.channel == channel,
            NotificationLog.status == "sent",
        )
        .order_by(NotificationLog.created_at.desc())
        .first()
    )


def _latest_metric_created_at(db: Session, user_id: int) -> Optional[datetime]:
    last_metric = _last_metric_for_user(db, user_id)
    return last_metric.created_at if last_metric else None


def _is_due_for_monthly_reminder(
    now_utc: datetime,
    last_metric_at: datetime,
    last_sent_at: Optional[datetime],
    threshold_minutes: int,
) -> bool:
    if last_metric_at.tzinfo is None:
        last_metric_at = last_metric_at.replace(tzinfo=timezone.utc)
    elapsed_since_metric = now_utc - last_metric_at
    if elapsed_since_metric < timedelta(minutes=threshold_minutes):
        return False
    if last_sent_at is None:
        return True
    if last_sent_at.tzinfo is None:
        last_sent_at = last_sent_at.replace(tzinfo=timezone.utc)
    return (now_utc - last_sent_at) >= timedelta(minutes=threshold_minutes)


def _get_inactivity_threshold_minutes() -> int:
    raw_value = os.getenv("REMINDER_INACTIVITY_MINUTES", str(DEFAULT_INACTIVITY_MINUTES)).strip()
    try:
        parsed = int(raw_value)
        if parsed <= 0:
            return DEFAULT_INACTIVITY_MINUTES
        return parsed
    except ValueError:
        return DEFAULT_INACTIVITY_MINUTES


def _get_scheduler_interval_seconds() -> int:
    raw_value = os.getenv("REMINDER_JOB_INTERVAL_SECONDS", str(DEFAULT_JOB_INTERVAL_SECONDS)).strip()
    try:
        parsed = int(raw_value)
        if parsed <= 0:
            return DEFAULT_JOB_INTERVAL_SECONDS
        return parsed
    except ValueError:
        return DEFAULT_JOB_INTERVAL_SECONDS


def _sms_enabled() -> bool:
    return os.getenv("REMINDER_SEND_SMS", "false").strip().lower() == "true"


def _whatsapp_enabled() -> bool:
    return os.getenv("REMINDER_SEND_WHATSAPP", "true").strip().lower() == "true"


def _twilio_post(account_sid: str, auth_token: str, data: Dict[str, str]) -> Dict:
    body = urllib.parse.urlencode(data).encode("utf-8")
    endpoint = (
        f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    )
    request = urllib.request.Request(endpoint, data=body, method="POST")
    auth_value = base64.b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("utf-8")
    request.add_header("Authorization", f"Basic {auth_value}")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")
    ssl_context = None
    if certifi is not None:
        try:
            ssl_context = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            ssl_context = None

    with urllib.request.urlopen(request, timeout=20, context=ssl_context) as response:
        return json.loads(response.read().decode("utf-8"))


def _send_sms_via_twilio(to_phone: str, message: str) -> Tuple[bool, Optional[str]]:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_sms = os.getenv("TWILIO_SMS_FROM", "").strip()
    if not (account_sid and auth_token and from_sms):
        return False, "Twilio SMS credentials are not configured"
    try:
        _twilio_post(
            account_sid,
            auth_token,
            {
                "To": to_phone,
                "From": from_sms,
                "Body": message,
            },
        )
        return True, None
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")
        except Exception:
            body = ""
        return False, f"Twilio SMS HTTP error: {exc.code}. {body}"
    except Exception as exc:
        return False, f"Twilio SMS error: {str(exc)}"


def _send_whatsapp_via_twilio(to_phone: str, message: str) -> Tuple[bool, Optional[str]]:
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_whatsapp = os.getenv("TWILIO_WHATSAPP_FROM", "").strip()
    if not (account_sid and auth_token and from_whatsapp):
        return False, "Twilio WhatsApp credentials are not configured"
    if not from_whatsapp.startswith("whatsapp:"):
        from_whatsapp = f"whatsapp:{from_whatsapp}"
    try:
        to_formatted = _format_whatsapp_number(to_phone)
        print(f"[WhatsApp] Sending to: {to_formatted}, from: {from_whatsapp}")
        response = _twilio_post(
            account_sid,
            auth_token,
            {
                "To": to_formatted,
                "From": from_whatsapp,
                "Body": message,
            },
        )
        print(f"[WhatsApp] Success: {response.get('sid', 'no-sid')}")
        return True, None
    except urllib.error.HTTPError as exc:
        try:
            body = exc.read().decode("utf-8")
        except Exception:
            body = ""
        error_msg = f"Twilio WhatsApp HTTP error: {exc.code}. {body}"
        print(f"[WhatsApp] Error: {error_msg}")
        return False, error_msg
    except Exception as exc:
        error_msg = f"Twilio WhatsApp error: {str(exc)}"
        print(f"[WhatsApp] Error: {error_msg}")
        return False, error_msg


def _log_notification(
    db: Session,
    user_id: int,
    channel: str,
    recipient: str,
    reminder_date: date,
    status: str,
    error_message: Optional[str],
) -> None:
    existing = (
        db.query(NotificationLog)
        .filter(
            NotificationLog.user_id == user_id,
            NotificationLog.reminder_kind == REMINDER_KIND_MONTHLY_METRICS,
            NotificationLog.channel == channel,
            NotificationLog.reminder_date == reminder_date,
        )
        .first()
    )
    if existing:
        existing.status = status
        existing.error_message = error_message
        existing.recipient = recipient
        existing.created_at = datetime.utcnow()
        db.add(existing)
        db.commit()
        return

    entry = NotificationLog(
        user_id=user_id,
        reminder_kind=REMINDER_KIND_MONTHLY_METRICS,
        channel=channel,
        recipient=recipient,
        reminder_date=reminder_date,
        status=status,
        error_message=error_message,
    )
    db.add(entry)
    db.commit()


def run_monthly_metric_reminders(dry_run: bool = False) -> Dict[str, int]:
    db = SessionLocal()
    inactivity_minutes = _get_inactivity_threshold_minutes()
    sms_enabled = _sms_enabled()
    whatsapp_enabled = _whatsapp_enabled()
    stats = {
        "users_checked": 0,
        "eligible_users": 0,
        "sent_sms": 0,
        "sent_whatsapp": 0,
        "failed_sms": 0,
        "failed_whatsapp": 0,
        "skipped_invalid_phone": 0,
        "inactivity_threshold_minutes": inactivity_minutes,
        "sms_enabled": int(sms_enabled),
        "whatsapp_enabled": int(whatsapp_enabled),
    }
    now_utc = datetime.now(timezone.utc)

    try:
        users: List[User] = db.query(User).all()
        for user in users:
            stats["users_checked"] += 1
            last_metric = _last_metric_for_user(db, user.id)
            if not last_metric or not last_metric.created_at:
                continue

            phone_e164 = _normalize_phone(user.phone_number or "")
            if not phone_e164:
                stats["skipped_invalid_phone"] += 1
                continue

            latest_sms = _latest_reminder_for_user(db, user.id, "sms")
            latest_whatsapp = _latest_reminder_for_user(db, user.id, "whatsapp")

            sms_due = False
            if sms_enabled:
                sms_due = _is_due_for_monthly_reminder(
                    now_utc,
                    last_metric.created_at,
                    latest_sms.created_at if latest_sms else None,
                    threshold_minutes=inactivity_minutes,
                )

            whatsapp_due = False
            if whatsapp_enabled:
                whatsapp_due = _is_due_for_monthly_reminder(
                    now_utc,
                    last_metric.created_at,
                    latest_whatsapp.created_at if latest_whatsapp else None,
                    threshold_minutes=inactivity_minutes,
                )
            if not sms_due and not whatsapp_due:
                continue

            stats["eligible_users"] += 1
            message = REMINDER_MESSAGE_TEMPLATE.format(name=user.name or "User")

            if sms_due:
                if dry_run:
                    stats["sent_sms"] += 1
                else:
                    sms_ok, sms_err = _send_sms_via_twilio(phone_e164, message)
                    if sms_ok:
                        stats["sent_sms"] += 1
                        _log_notification(
                            db=db,
                            user_id=user.id,
                            channel="sms",
                            recipient=phone_e164,
                            reminder_date=now_utc.date(),
                            status="sent",
                            error_message=None,
                        )
                    else:
                        print(f"[reminder] SMS failed for user_id={user.id}: {sms_err}")
                        stats["failed_sms"] += 1
                        _log_notification(
                            db=db,
                            user_id=user.id,
                            channel="sms",
                            recipient=phone_e164,
                            reminder_date=now_utc.date(),
                            status="failed",
                            error_message=sms_err,
                        )

            if whatsapp_due:
                if dry_run:
                    stats["sent_whatsapp"] += 1
                else:
                    wa_ok, wa_err = _send_whatsapp_via_twilio(phone_e164, message)
                    if wa_ok:
                        stats["sent_whatsapp"] += 1
                        _log_notification(
                            db=db,
                            user_id=user.id,
                            channel="whatsapp",
                            recipient=_format_whatsapp_number(phone_e164),
                            reminder_date=now_utc.date(),
                            status="sent",
                            error_message=None,
                        )
                    else:
                        print(f"[reminder] WhatsApp failed for user_id={user.id}: {wa_err}")
                        stats["failed_whatsapp"] += 1
                        _log_notification(
                            db=db,
                            user_id=user.id,
                            channel="whatsapp",
                            recipient=_format_whatsapp_number(phone_e164),
                            reminder_date=now_utc.date(),
                            status="failed",
                            error_message=wa_err,
                        )
    finally:
        db.close()

    return stats


def get_user_reminder_status(user_id: int) -> Dict[str, Optional[str]]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return {"error": "User not found"}

        inactivity_minutes = _get_inactivity_threshold_minutes()
        now_utc = datetime.now(timezone.utc)
        last_metric_at = _latest_metric_created_at(db, user_id)
        latest_sms = _latest_reminder_for_user(db, user_id, "sms")
        latest_whatsapp = _latest_reminder_for_user(db, user_id, "whatsapp")
        normalized_phone = _normalize_phone(user.phone_number or "")

        sms_due = False
        whatsapp_due = False
        if last_metric_at:
            sms_due = _is_due_for_monthly_reminder(
                now_utc,
                last_metric_at,
                latest_sms.created_at if latest_sms else None,
                threshold_minutes=inactivity_minutes,
            )
            whatsapp_due = _is_due_for_monthly_reminder(
                now_utc,
                last_metric_at,
                latest_whatsapp.created_at if latest_whatsapp else None,
                threshold_minutes=inactivity_minutes,
            )

        return {
            "user_id": user_id,
            "normalized_phone": normalized_phone,
            "inactivity_threshold_minutes": str(inactivity_minutes),
            "last_metric_at": last_metric_at.isoformat() if last_metric_at else None,
            "latest_sms_sent_at": latest_sms.created_at.isoformat() if latest_sms else None,
            "latest_whatsapp_sent_at": latest_whatsapp.created_at.isoformat() if latest_whatsapp else None,
            "sms_due_now": str(sms_due).lower(),
            "whatsapp_due_now": str(whatsapp_due).lower(),
            "twilio_sms_configured": str(
                bool(
                    os.getenv("TWILIO_ACCOUNT_SID")
                    and os.getenv("TWILIO_AUTH_TOKEN")
                    and os.getenv("TWILIO_SMS_FROM")
                )
            ).lower(),
            "twilio_whatsapp_configured": str(
                bool(
                    os.getenv("TWILIO_ACCOUNT_SID")
                    and os.getenv("TWILIO_AUTH_TOKEN")
                    and os.getenv("TWILIO_WHATSAPP_FROM")
                )
            ).lower(),
            "sms_enabled": str(_sms_enabled()).lower(),
            "whatsapp_enabled": str(_whatsapp_enabled()).lower(),
        }
    finally:
        db.close()


class ReminderScheduler:
    def __init__(self) -> None:
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _run_loop(self) -> None:
        # Run immediately at startup, then periodically.
        while not self._stop_event.is_set():
            try:
                run_monthly_metric_reminders(dry_run=False)
            except Exception:
                # Keep scheduler alive even if one run fails.
                pass
            self._stop_event.wait(timeout=_get_scheduler_interval_seconds())


reminder_scheduler = ReminderScheduler()
