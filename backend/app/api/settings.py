from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from backend.app.core.database import get_db
from backend.app.models.entities import AdminUser
from backend.app.api.deps import get_current_user, require_roles
from backend.app.integrations.email_adapter import TestMockEmailAdapter, get_email_adapter
from backend.app.services.settings_service import get_all_settings_dict, update_system_settings_db
from backend.app.services.activity_service import log_activity

router = APIRouter(prefix="/settings", tags=["Settings"])

class LiveTestEmailRequest(BaseModel):
    to_email: str
    subject: Optional[str] = "TrevasQ Live Connection Test"
    override_config: Optional[Dict[str, Any]] = None

@router.get("")
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Retrieve all dynamic platform settings from database."""
    return get_all_settings_dict(db)

@router.post("")
def update_system_settings(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin"]))
):
    """Dynamically save platform settings to database without requiring restarts."""
    updated = update_system_settings_db(db, payload)
    
    log_activity(
        db=db,
        action="settings_updated",
        entity_type="system_settings",
        entity_id="global",
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"provider": updated.get("email_provider"), "test_mode": updated.get("email_test_mode")}
    )

    return {"message": "Settings updated successfully", "settings": updated}

@router.post("/test-email")
def send_live_test_email(
    payload: LiveTestEmailRequest,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    """
    Dispatches a real-time test email to any recipient (e.g. neeltapake21@gmail.com).
    Uses the live database settings or temporary override configuration to verify SMTP/SendGrid deliverability.
    """
    adapter = get_email_adapter(db=db, override_config=payload.override_config)
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #4f46e5; margin: 0; font-size: 20px; font-weight: 700;">TrevasQ Live Connection Test</h2>
        </div>
        <p style="font-size: 14px; color: #1e293b; line-height: 1.6;">
          Hello,
        </p>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          This is a live connection verification email dispatched by the <strong>TrevasQ Automated Marketing & Lead Management Platform</strong>.
        </p>
        <div style="background-color: #f1f5f9; padding: 14px 18px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #475569;">
          <strong>Dispatch Details:</strong><br/>
          • Recipient: {payload.to_email}<br/>
          • Initiated By: {current_user.name} ({current_user.email})<br/>
          • Timestamp: {adapter.__class__.__name__}
        </div>
        <p style="font-size: 13px; color: #64748b;">
          If you received this message, your outbound email delivery configuration is functioning properly.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #94a3b8; text-align: center;">
          TrevasQ Technologies Inc. • Quantum-Ready Cryptographic Architecture
        </p>
      </div>
    </body>
    </html>
    """

    res = adapter.send_email(
        to_email=payload.to_email,
        to_name="Recipient",
        subject=payload.subject or "TrevasQ Live Connection Test",
        html_content=html_body,
        text_content=f"TrevasQ Connection Test - Dispatched to {payload.to_email}"
    )

    if not res.success:
        return {
            "success": False,
            "status": "failed",
            "provider": res.provider,
            "error_message": res.error_message or "Failed to connect to email provider. Check credentials.",
            "message": f"Delivery failed: {res.error_message}"
        }

    return {
        "success": True,
        "status": "sent",
        "provider": res.provider,
        "message_id": res.message_id,
        "message": f"Email successfully dispatched to {payload.to_email} via {res.provider}!"
    }

@router.get("/sent-mailbox")
def get_mock_sent_mailbox(current_user: AdminUser = Depends(get_current_user)):
    """Inspection endpoint for test mode: view emails dispatched by TestMockEmailAdapter."""
    return {
        "count": len(TestMockEmailAdapter.get_sent_emails()),
        "emails": TestMockEmailAdapter.get_sent_emails()
    }

@router.delete("/sent-mailbox")
def clear_mock_sent_mailbox(current_user: AdminUser = Depends(require_roles(["admin"]))):
    """Clear test outbox records."""
    TestMockEmailAdapter.clear_sent_emails()
    return {"message": "Test mailbox cleared"}
