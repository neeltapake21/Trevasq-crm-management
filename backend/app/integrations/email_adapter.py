from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
import uuid
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
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

class RobustSMTP(smtplib.SMTP):
    """SMTP client that captures the real authentication failure before disconnection."""
    def login(self, user, password, *, initial_response_ok=True):
        self.ehlo_or_helo_if_needed()
        if not self.has_extn("auth"):
            raise smtplib.SMTPNotSupportedError("SMTP AUTH extension not supported by server.")
        
        self.user, self.password = user, password
        last_exc = None
        for authmethod in ['PLAIN', 'LOGIN', 'CRAM-MD5']:
            method_name = 'auth_' + authmethod.lower().replace('-', '_')
            if not hasattr(self, method_name):
                continue
            try:
                code, resp = self.auth(
                    authmethod, getattr(self, method_name),
                    initial_response_ok=initial_response_ok
                )
                if code in (235, 503):
                    return (code, resp)
            except smtplib.SMTPAuthenticationError as e:
                last_exc = e
            except smtplib.SMTPServerDisconnected:
                if last_exc:
                    raise last_exc
                raise
        if last_exc:
            raise last_exc


class RobustSMTP_SSL(smtplib.SMTP_SSL):
    """SMTP_SSL client that captures the real authentication failure before disconnection."""
    def login(self, user, password, *, initial_response_ok=True):
        self.ehlo_or_helo_if_needed()
        if not self.has_extn("auth"):
            raise smtplib.SMTPNotSupportedError("SMTP AUTH extension not supported by server.")
        
        self.user, self.password = user, password
        last_exc = None
        for authmethod in ['PLAIN', 'LOGIN', 'CRAM-MD5']:
            method_name = 'auth_' + authmethod.lower().replace('-', '_')
            if not hasattr(self, method_name):
                continue
            try:
                code, resp = self.auth(
                    authmethod, getattr(self, method_name),
                    initial_response_ok=initial_response_ok
                )
                if code in (235, 503):
                    return (code, resp)
            except smtplib.SMTPAuthenticationError as e:
                last_exc = e
            except smtplib.SMTPServerDisconnected:
                if last_exc:
                    raise last_exc
                raise
        if last_exc:
            raise last_exc


class SMTPEmailAdapter(BaseEmailAdapter):
    def __init__(
        self,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        use_tls: Optional[bool] = None,
        from_address: Optional[str] = None,
        from_name: Optional[str] = None
    ):
        self.host = host or settings.SMTP_HOST
        self.port = port or settings.SMTP_PORT or 587
        self.username = username if username is not None else settings.SMTP_USERNAME
        self.password = password if password is not None else settings.SMTP_PASSWORD
        self.use_tls = use_tls if use_tls is not None else settings.SMTP_USE_TLS
        self.from_address = from_address or settings.EMAIL_FROM_ADDRESS
        self.from_name = from_name or settings.EMAIL_FROM_NAME

    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailSendResult:
        clean_user = (self.username or "").strip()
        # Automatically remove all spaces from Google 16-character App Passwords (e.g. "abcd efgh ijkl mnop")
        clean_pass = (self.password or "").replace(" ", "").strip()
        if "•" in clean_pass:
            clean_pass = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()
        clean_to = to_email.strip()
        clean_from = (self.from_address or "").strip()
        clean_host = (self.host or "").strip()
        port_num = int(self.port) if self.port else 587

        server = None
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = Header(subject, "utf-8").encode()
            
            from_display = Header(self.from_name, "utf-8").encode() if self.from_name else ""
            msg["From"] = formataddr((from_display, clean_from)) if from_display else clean_from
            
            to_display = Header(to_name, "utf-8").encode() if to_name else ""
            msg["To"] = formataddr((to_display, clean_to)) if to_display else clean_to
            msg["Message-ID"] = f"<{uuid.uuid4()}@{clean_host}>"
            
            if headers:
                for k, v in headers.items():
                    msg[k] = v

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

            if port_num == 465:
                # Direct SSL (Port 465)
                ssl_ctx = ssl.create_default_context()
                server = RobustSMTP_SSL(clean_host, port_num, context=ssl_ctx, timeout=25)
                server.ehlo()
            else:
                # STARTTLS (Port 587 or 25)
                server = RobustSMTP(clean_host, port_num, timeout=25)
                server.ehlo()
                if self.use_tls:
                    ssl_ctx = ssl.create_default_context()
                    server.starttls(context=ssl_ctx)
                    server.ehlo()

            if clean_user and clean_pass:
                server.login(clean_user, clean_pass)

            # Robust UTF-8 transmission: send_message or raw bytes (never ascii string)
            try:
                server.send_message(msg)
            except Exception:
                server.sendmail(clean_from, [clean_to], msg.as_bytes())

            server.quit()
            server = None

            return EmailSendResult(
                success=True,
                message_id=msg["Message-ID"],
                status="sent",
                provider="smtp"
            )
        except smtplib.SMTPAuthenticationError as e:
            err_text = str(e)
            if "BadCredentials" in err_text or "535" in err_text or "not accepted" in err_text.lower():
                user_msg = (
                    "Authentication Failed (Bad Credentials): Gmail and Google Workspace require a 16-character "
                    "Google App Password (e.g. 'abcd efgh ijkl mnop') instead of your regular account password. "
                    "Please generate one at https://myaccount.google.com/apppasswords and paste it in Settings."
                )
            else:
                user_msg = f"SMTP Authentication Error: {e}"
            return EmailSendResult(
                success=False,
                status="failed",
                error_message=user_msg,
                provider="smtp"
            )
        except smtplib.SMTPServerDisconnected as e:
            user_msg = (
                "Connection disconnected by SMTP server. "
                "If you are using Gmail or Google Workspace, ensure you use a 16-character App Password, "
                "or try switching Port from 587 to 465 in Settings if your ISP blocks port 587."
            )
            return EmailSendResult(
                success=False,
                status="failed",
                error_message=user_msg,
                provider="smtp"
            )
        except Exception as e:
            return EmailSendResult(
                success=False,
                status="failed",
                error_message=f"SMTP Delivery Error: {str(e)}",
                provider="smtp"
            )
        finally:
            if server:
                try:
                    server.close()
                except Exception:
                    pass

class SendGridEmailAdapter(BaseEmailAdapter):
    def __init__(
        self,
        api_key: Optional[str] = None,
        from_address: Optional[str] = None,
        from_name: Optional[str] = None
    ):
        self.api_key = api_key or settings.SENDGRID_API_KEY
        self.from_address = from_address or settings.EMAIL_FROM_ADDRESS
        self.from_name = from_name or settings.EMAIL_FROM_NAME

    def send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> EmailSendResult:
        if not self.api_key:
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
            "from": {"email": self.from_address, "name": self.from_name},
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
            with httpx.Client(timeout=12.0) as client:
                res = client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json=payload
                )
                if res.status_code in (200, 202):
                    msg_id = res.headers.get("X-Message-Id", f"sg-{uuid.uuid4().hex[:12]}")
                    return EmailSendResult(success=True, message_id=msg_id, provider="sendgrid")
                else:
                    return EmailSendResult(success=False, status="failed", error_message=res.text, provider="sendgrid")
        except Exception as e:
            return EmailSendResult(success=False, status="failed", error_message=str(e), provider="sendgrid")

def get_email_adapter(db=None, override_config: Optional[Dict[str, Any]] = None) -> BaseEmailAdapter:
    """
    Factory to retrieve current email adapter.
    Dynamically loads configuration from:
    1. override_config (if provided)
    2. database SystemSetting table (if db provided)
    3. settings (.env / environment variables)
    """
    import os
    if os.environ.get("TESTING") == "true" and not override_config:
        return TestMockEmailAdapter()

    # 1. Check override
    if override_config:
        raw_test_mode = override_config.get("email_test_mode", False)
        if isinstance(raw_test_mode, str):
            test_mode = raw_test_mode.lower() == "true"
        else:
            test_mode = bool(raw_test_mode)

        provider = str(override_config.get("email_provider", "test")).lower()
        if test_mode or provider in ("test", "mock"):
            return TestMockEmailAdapter()
        elif provider == "smtp":
            pwd = override_config.get("smtp_password")
            # If the client sent masked placeholder bullets (e.g. "••••••••") or empty, use real stored credentials
            if not pwd or "•" in str(pwd):
                if db is not None:
                    from backend.app.services.settings_service import get_setting_raw
                    pwd = get_setting_raw(db, "smtp_password", settings.SMTP_PASSWORD)
                else:
                    pwd = settings.SMTP_PASSWORD

            user = override_config.get("smtp_username")
            if not user and db is not None:
                from backend.app.services.settings_service import get_setting_raw
                user = get_setting_raw(db, "smtp_username", settings.SMTP_USERNAME)

            from_addr = override_config.get("email_from_address")
            if not from_addr and db is not None:
                from backend.app.services.settings_service import get_setting_raw
                from_addr = get_setting_raw(db, "email_from_address", settings.EMAIL_FROM_ADDRESS)

            return SMTPEmailAdapter(
                host=override_config.get("smtp_host") or settings.SMTP_HOST,
                port=override_config.get("smtp_port") or settings.SMTP_PORT,
                username=user,
                password=pwd,
                use_tls=override_config.get("smtp_use_tls") if override_config.get("smtp_use_tls") is not None else settings.SMTP_USE_TLS,
                from_address=from_addr,
                from_name=override_config.get("email_from_name") or settings.EMAIL_FROM_NAME
            )
        elif provider == "sendgrid":
            sg_key = override_config.get("sendgrid_api_key")
            if not sg_key or "•" in str(sg_key):
                if db is not None:
                    from backend.app.services.settings_service import get_setting_raw
                    sg_key = get_setting_raw(db, "sendgrid_api_key", settings.SENDGRID_API_KEY)
                else:
                    sg_key = settings.SENDGRID_API_KEY

            return SendGridEmailAdapter(
                api_key=sg_key,
                from_address=override_config.get("email_from_address"),
                from_name=override_config.get("email_from_name")
            )
        return TestMockEmailAdapter()

    # 2. Check Database
    if db is not None:
        from backend.app.services.settings_service import get_setting_raw
        test_mode = get_setting_raw(db, "email_test_mode", "false").lower() == "true"
        provider = get_setting_raw(db, "email_provider", "smtp").lower()

        if test_mode or provider in ("test", "mock"):
            return TestMockEmailAdapter()
        elif provider == "smtp":
            port_str = get_setting_raw(db, "smtp_port", "587")
            try:
                port = int(port_str)
            except ValueError:
                port = 587

            return SMTPEmailAdapter(
                host=get_setting_raw(db, "smtp_host", "smtp.gmail.com"),
                port=port,
                username=get_setting_raw(db, "smtp_username", ""),
                password=get_setting_raw(db, "smtp_password", ""),
                use_tls=get_setting_raw(db, "smtp_use_tls", "true").lower() == "true",
                from_address=get_setting_raw(db, "email_from_address", "marketing@trevasq.com"),
                from_name=get_setting_raw(db, "email_from_name", "TrevasQ Quantum Security")
            )
        elif provider == "sendgrid":
            return SendGridEmailAdapter(
                api_key=get_setting_raw(db, "sendgrid_api_key", ""),
                from_address=get_setting_raw(db, "email_from_address", "marketing@trevasq.com"),
                from_name=get_setting_raw(db, "email_from_name", "TrevasQ Quantum Security")
            )

    # 3. Fallback to settings (.env)
    provider = settings.EMAIL_PROVIDER.lower()
    if settings.EMAIL_TEST_MODE or provider in ("test", "mock"):
        return TestMockEmailAdapter()
    elif provider == "smtp":
        return SMTPEmailAdapter()
    elif provider == "sendgrid":
        return SendGridEmailAdapter()
    else:
        return TestMockEmailAdapter()
