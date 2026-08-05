"""Transactional authentication email delivery over SMTP.

The backend is implemented with FastAPI/Python, so this module provides the
same SMTP behaviour that Nodemailer would provide in a Node.js service.  SMTP
credentials are read exclusively from environment variables and are never
stored in source control.
"""

from __future__ import annotations

import asyncio
import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path

from dotenv import load_dotenv


# Email configuration must not depend on app.db being imported first. This
# keeps CLI checks, tests and background workers consistent with FastAPI.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class EmailConfigurationError(RuntimeError):
    """Raised when required SMTP environment variables are missing/invalid."""


class EmailDeliveryError(RuntimeError):
    """Raised when an SMTP server rejects or cannot deliver a message."""


@dataclass(frozen=True)
class SmtpSettings:
    host: str
    port: int
    username: str
    password: str
    sender: str
    use_ssl: bool
    timeout_seconds: float


def _env_bool(name: str, default: bool) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def get_smtp_settings() -> SmtpSettings:
    """Load and validate SMTP settings without exposing secret values."""

    host = os.getenv("AUTH_SMTP_HOST", "").strip()
    username = os.getenv("AUTH_SMTP_USER", "").strip()
    password = os.getenv("AUTH_SMTP_PASS", "")
    missing = [
        name
        for name, value in (
            ("AUTH_SMTP_HOST", host),
            ("AUTH_SMTP_USER", username),
            ("AUTH_SMTP_PASS", password),
        )
        if not value
    ]
    if missing:
        raise EmailConfigurationError(
            "Thiếu cấu hình SMTP bắt buộc: " + ", ".join(missing)
        )

    try:
        port = int(os.getenv("AUTH_SMTP_PORT", "465"))
        timeout_seconds = float(os.getenv("AUTH_SMTP_TIMEOUT_SECONDS", "20"))
    except ValueError as exc:
        raise EmailConfigurationError("Cổng hoặc thời gian chờ SMTP không hợp lệ.") from exc

    if not 1 <= port <= 65535 or timeout_seconds <= 0:
        raise EmailConfigurationError("Cổng hoặc thời gian chờ SMTP không hợp lệ.")

    sender = os.getenv("AUTH_SMTP_FROM", username).strip() or username
    return SmtpSettings(
        host=host,
        port=port,
        username=username,
        password=password,
        sender=sender,
        use_ssl=_env_bool("AUTH_SMTP_USE_SSL", port == 465),
        timeout_seconds=timeout_seconds,
    )


def ensure_email_delivery_configured() -> None:
    """Fail fast before creating an account that cannot receive verification."""

    get_smtp_settings()


def is_email_delivery_configured() -> bool:
    """Return a sanitized configuration status for health diagnostics."""

    try:
        get_smtp_settings()
    except EmailConfigurationError:
        return False
    return True


def _deliver_message(message: EmailMessage, settings: SmtpSettings) -> None:
    context = ssl.create_default_context()
    try:
        if settings.use_ssl:
            with smtplib.SMTP_SSL(
                settings.host,
                settings.port,
                timeout=settings.timeout_seconds,
                context=context,
            ) as smtp:
                smtp.login(settings.username, settings.password)
                smtp.send_message(message)
            return

        with smtplib.SMTP(
            settings.host,
            settings.port,
            timeout=settings.timeout_seconds,
        ) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            smtp.login(settings.username, settings.password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        # Do not include the low-level exception in an API response: SMTP
        # libraries can include server details that belong only in server logs.
        raise EmailDeliveryError("Không thể gửi email xác thực qua máy chủ SMTP.") from exc


async def send_auth_email(
    *,
    recipient: str,
    subject: str,
    text_body: str,
    html_body: str,
) -> None:
    """Send an authentication email without blocking the FastAPI event loop."""

    settings = get_smtp_settings()
    try:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.sender
        message["To"] = recipient
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")
    except ValueError as exc:
        raise EmailConfigurationError("Địa chỉ người gửi SMTP không hợp lệ.") from exc
    await asyncio.to_thread(_deliver_message, message, settings)
