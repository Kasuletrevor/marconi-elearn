"""Minimal HTML email templates for Marconi Elearn.

Each function returns ``(subject, html_body, text_body)``.
"""

from __future__ import annotations

from app.core.config import settings

# ---------------------------------------------------------------------------
# Shared layout
# ---------------------------------------------------------------------------

_BRAND_COLOR = "#193E74"
_BG_COLOR = "#F5F2ED"


def _wrap(inner_html: str) -> str:
    """Wrap content in a branded email shell."""
    return f"""\
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:{_BG_COLOR};font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1A1A1A;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:{_BG_COLOR};">
<tr><td align="center" style="padding:32px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;border:1px solid #D8E3EE;">
  <tr><td style="padding:32px 28px 0;">
    <h2 style="margin:0 0 4px;font-size:20px;color:{_BRAND_COLOR};font-family:'Playfair Display',Georgia,serif;">
      Marconi Elearn
    </h2>
    <hr style="border:none;border-top:2px solid {_BRAND_COLOR};margin:12px 0 24px;">
  </td></tr>
  <tr><td style="padding:0 28px 28px;font-size:15px;line-height:1.6;">
    {inner_html}
  </td></tr>
  <tr><td style="padding:0 28px 24px;font-size:12px;color:#475569;">
    This is an automated message from Marconi Elearn. Please do not reply directly.
  </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>"""


def _btn(url: str, label: str) -> str:
    return (
        f'<a href="{url}" style="display:inline-block;padding:12px 28px;'
        f"background:{_BRAND_COLOR};color:#ffffff;text-decoration:none;"
        f'border-radius:6px;font-weight:600;font-size:15px;">{label}</a>'
    )


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------


def invite_email(
    *,
    recipient_name: str,
    organization_name: str,
    course_name: str | None,
    invite_url: str,
) -> tuple[str, str, str]:
    if course_name:
        subject = f"You're invited to {course_name} on Marconi Elearn"
        context_line = f"You have been invited to join <strong>{course_name}</strong> at <strong>{organization_name}</strong>."
    else:
        subject = f"You're invited to {organization_name} on Marconi Elearn"
        context_line = (
            f"You have been invited to join <strong>{organization_name}</strong> on Marconi Elearn."
        )

    greeting = f"Hi {recipient_name}," if recipient_name else "Hello,"

    html = _wrap(f"""\
<p>{greeting}</p>
<p>{context_line}</p>
<p>Click the button below to set your password and activate your account. This link expires in 7 days.</p>
<p style="text-align:center;margin:24px 0;">{_btn(invite_url, "Accept Invite")}</p>
<p style="font-size:13px;color:#475569;">If the button doesn't work, copy and paste this URL into your browser:<br>
<a href="{invite_url}" style="color:{_BRAND_COLOR};word-break:break-all;">{invite_url}</a></p>
""")

    text = (
        f"{greeting}\n\n"
        f"{'You have been invited to join ' + course_name + ' at ' + organization_name if course_name else 'You have been invited to join ' + organization_name + ' on Marconi Elearn'}.\n\n"
        f"Set your password here (link expires in 7 days):\n{invite_url}\n"
    )

    return subject, html, text


def password_reset_email(
    *,
    reset_url: str,
) -> tuple[str, str, str]:
    subject = "Reset your Marconi Elearn password"

    html = _wrap(f"""\
<p>Hello,</p>
<p>We received a request to reset your password. Click the button below to choose a new password.
This link expires in 1 hour.</p>
<p style="text-align:center;margin:24px 0;">{_btn(reset_url, "Reset Password")}</p>
<p style="font-size:13px;color:#475569;">If you didn't request this, you can safely ignore this email.
Your password will not be changed.</p>
<p style="font-size:13px;color:#475569;">If the button doesn't work, copy and paste this URL:<br>
<a href="{reset_url}" style="color:{_BRAND_COLOR};word-break:break-all;">{reset_url}</a></p>
""")

    text = (
        "Hello,\n\n"
        "We received a request to reset your password.\n"
        f"Reset your password here (link expires in 1 hour):\n{reset_url}\n\n"
        "If you didn't request this, you can safely ignore this email.\n"
    )

    return subject, html, text


def submission_graded_email(
    *,
    student_name: str,
    course_name: str,
    assignment_title: str,
    score: int | None,
    max_points: int | None,
    detail_url: str,
) -> tuple[str, str, str]:
    subject = f"Your submission for {assignment_title} has been graded"
    greeting = f"Hi {student_name}," if student_name else "Hello,"

    score_line = ""
    if score is not None:
        pts = f"{score}/{max_points}" if max_points else str(score)
        score_line = f"<p><strong>Score:</strong> {pts}</p>"

    html = _wrap(f"""\
<p>{greeting}</p>
<p>Your submission for <strong>{assignment_title}</strong> in <strong>{course_name}</strong> has been graded.</p>
{score_line}
<p style="text-align:center;margin:24px 0;">{_btn(detail_url, "View Results")}</p>
""")

    score_text = ""
    if score is not None:
        pts = f"{score}/{max_points}" if max_points else str(score)
        score_text = f"Score: {pts}\n"

    text = (
        f"{greeting}\n\n"
        f"Your submission for {assignment_title} in {course_name} has been graded.\n"
        f"{score_text}\n"
        f"View results: {detail_url}\n"
    )

    return subject, html, text


def assignment_due_reminder_email(
    *,
    student_name: str,
    course_name: str,
    assignment_title: str,
    due_date_str: str,
    assignment_url: str,
) -> tuple[str, str, str]:
    subject = f"Reminder: {assignment_title} is due {due_date_str}"
    greeting = f"Hi {student_name}," if student_name else "Hello,"

    html = _wrap(f"""\
<p>{greeting}</p>
<p><strong>{assignment_title}</strong> in <strong>{course_name}</strong> is due on
<strong>{due_date_str}</strong>.</p>
<p>Make sure to submit your work before the deadline.</p>
<p style="text-align:center;margin:24px 0;">{_btn(assignment_url, "Go to Assignment")}</p>
""")

    text = (
        f"{greeting}\n\n"
        f"{assignment_title} in {course_name} is due on {due_date_str}.\n"
        f"Submit your work here: {assignment_url}\n"
    )

    return subject, html, text


def staff_submission_digest_email(
    *,
    staff_name: str,
    course_code: str,
    count: int,
    latest_student: str,
    latest_assignment: str,
    submissions_url: str,
) -> tuple[str, str, str]:
    subject = f"New submissions ({count}) in {course_code}"
    greeting = f"Hi {staff_name}," if staff_name else "Hello,"

    html = _wrap(f"""\
<p>{greeting}</p>
<p><strong>{count}</strong> new submission{"s" if count != 1 else ""} received in <strong>{course_code}</strong>.</p>
<p>Latest: <strong>{latest_student}</strong> &mdash; {latest_assignment}</p>
<p style="text-align:center;margin:24px 0;">{_btn(submissions_url, "Review Submissions")}</p>
""")

    text = (
        f"{greeting}\n\n"
        f"{count} new submission{'s' if count != 1 else ''} in {course_code}.\n"
        f"Latest: {latest_student} -- {latest_assignment}\n"
        f"Review: {submissions_url}\n"
    )

    return subject, html, text
