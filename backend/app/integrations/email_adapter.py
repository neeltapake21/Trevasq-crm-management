from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import uuid
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import httpx
from backend.app.core.config import settings

@dataclass
class EmailSendResult:
    success: bool
    message_id: Optional[str] = None
    status: str = "sent"  # 'sent', 'failed'
    error_message: Optional[str] = None
    provider: str = "test"
    sent_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

class BaseEmailAdapter(ABC):
    @abstractmethod
    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailSendResult:
        pass

class TestMockEmailAdapter(BaseEmailAdapter):
    """
    Safe testing and development adapter.
    Never sends emails to real users.
    Records all dispatched emails into an inspectable in-memory registry.
    """
    _sent_mailbox: List[Dict[str, Any]] = []

    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailSendResult:
        msg_id = f"mock-msg-{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        
        email_record = {
            "message_id": msg_id,
            "to_email": to_email,
            "to_name": to_name,
            "subject": subject,
            "html_content": html_content,
            "text_content": text_content,
            "headers": headers or {},
            "sent_at": now.isoformat(),
            "status": "sent"
        }
        self._sent_mailbox.append(email_record)
        
        return EmailSendResult(
            success=True,
            message_id=msg_id,
            status="sent",
            provider="mock_test_mode",
            sent_at=now
        )

    @classmethod
    def get_sent_emails(cls) -> List[Dict[str, Any]]:
        return cls._sent_mailbox

    @classmethod
    def clear_sent_emails(cls) -> None:
        cls._sent_mailbox.clear()

class SMTPEmailAdapter(BaseEmailAdapter):
    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailSendResult:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
            msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
            msg["Message-ID"] = f"<{uuid.uuid4()}@{settings.SMTP_HOST}>"
            
            if headers:
                for k, v in headers.items():
                    msg[k] = v

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 25) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.EMAIL_FROM_ADDRESS, [to_email], msg.as_string())

            return EmailSendResult(
                success=True,
                message_id=msg["Message-ID"],
                status="sent",
                provider="smtp"
            )
        except Exception as e:
            return EmailSendResult(
                success=False,
                status="failed",
                error_message=str(e),
                provider="smtp"
            )

class SendGridEmailAdapter(BaseEmailAdapter):
    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailSendResult:
        if not settings.SENDGRID_API_KEY:
            return EmailSendResult(
                success=False,
                status="failed",
                error_message="SendGrid API key not configured",
                provider="sendgrid"
            )
        
        payload = {
            "personalizations": [{
                "to": [{"email": to_email, "name": to_name}]
            }],
            "from": {"email": settings.EMAIL_FROM_ADDRESS, "name": settings.EMAIL_FROM_NAME},
            "subject": subject,
            "content": [
                {"type": "text/html", "value": html_content}
            ]
        }
        if text_content:
            payload["content"].insert(0, {"type": "text/plain", "value": text_content})
        if headers:
            payload["headers"] = headers

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
                    json=payload
                )
                if res.status_code in (200, 202):
                    msg_id = res.headers.get("X-Message-Id", f"sg-{uuid.uuid4().hex[:12]}")
                    return EmailSendResult(success=True, message_id=msg_id, provider="sendgrid")
                else:
                    return EmailSendResult(success=False, status="failed", error_message=res.text, provider="sendgrid")
        except Exception as e:
            return EmailSendResult(success=False, status="failed", error_message=str(e), provider="sendgrid")

def get_email_adapter() -> BaseEmailAdapter:
    """Factory to retrieve current email adapter based on configuration."""
    provider = settings.EMAIL_PROVIDER.lower()
    if settings.EMAIL_TEST_MODE or provider in ("test", "mock"):
        return TestMockEmailAdapter()
    elif provider == "smtp":
        return SMTPEmailAdapter()
    elif provider == "sendgrid":
        return SendGridEmailAdapter()
    else:
        # Default to safe mock
        return TestMockEmailAdapter()
