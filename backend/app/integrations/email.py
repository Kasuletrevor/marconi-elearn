"""Async SMTP email sender.

When ``settings.smtp_enabled`` is ``False`` the helpers log the email
subject/recipient instead of delivering it, so tests and local dev
work without a real mail server.
"""

from __future__ import annotations

import logging
from email.message import EmailMessage

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    *,
    to: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> bool:
    """Send a single email.  Returns ``True`` on success."""

    if not settings.smtp_enabled:
        logger.info("SMTP disabled – would send to=%s subject=%r", to, subject)
        return False

    msg = EmailMessage()
    msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
    msg["To"] = to
    msg["Subject"] = subject

    if text_body:
        msg.set_content(text_body)
        msg.add_alternative(html_body, subtype="html")
    else:
        msg.set_content(html_body, subtype="html")

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_user,
            password=settings.smtp_pass,
            start_tls=True,
        )
        logger.info("Email sent to=%s subject=%r", to, subject)
        return True
    except Exception:
        logger.exception("Failed to send email to=%s subject=%r", to, subject)
        return False


async def send_email_to_many(
    *,
    recipients: list[str],
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> int:
    """Send the same email to multiple recipients.  Returns count of successes."""
    ok = 0
    for addr in recipients:
        if await send_email(to=addr, subject=subject, html_body=html_body, text_body=text_body):
            ok += 1
    return ok
