from datetime import date, datetime, time, timedelta, timezone

from app.core.config import settings

APP_TIMEZONE = timezone(timedelta(hours=7))


def parse_hhmm(value: str) -> time:
    hour, minute = value.split(":")
    return time(int(hour), int(minute))


def checkin_window() -> tuple[time, time]:
    return parse_hhmm(settings.checkin_start_time), parse_hhmm(settings.checkin_end_time)


def checkout_min_time() -> time:
    return parse_hhmm(settings.checkout_min_time)


def standard_checkin_time() -> time:
    return parse_hhmm(settings.standard_checkin_time)


def standard_checkout_time() -> time:
    return parse_hhmm(settings.standard_checkout_time)


def auto_checkout_time() -> time:
    return parse_hhmm(settings.auto_checkout_time)


def combine_today(t: time, target_date: date | None = None) -> datetime:
    return datetime.combine(target_date or app_today(), t)


def app_now() -> datetime:
    return datetime.now(APP_TIMEZONE).replace(tzinfo=None)


def app_today() -> date:
    return app_now().date()


def to_app_datetime(value: datetime | None) -> datetime:
    if value is None:
        return app_now()
    if value.tzinfo is None:
        return value
    return value.astimezone(APP_TIMEZONE).replace(tzinfo=None)
