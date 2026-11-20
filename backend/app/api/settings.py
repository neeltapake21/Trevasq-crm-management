from typing import Dict, Any
from fastapi import APIRouter, Depends
from backend.app.core.config import settings
from backend.app.models.entities import AdminUser
from backend.app.api.deps import get_current_user, require_roles
from backend.app.integrations.email_adapter import TestMockEmailAdapter

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("")
def get_system_settings(current_user: AdminUser = Depends(get_current_user)):
    return {
        "app_name": settings.APP_NAME,
        "app_env": settings.APP_ENV,
        "email_provider": settings.EMAIL_PROVIDER,
        "email_test_mode": settings.EMAIL_TEST_MODE,
        "email_from_address": settings.EMAIL_FROM_ADDRESS,
        "email_from_name": settings.EMAIL_FROM_NAME,
        "smtp_host": settings.SMTP_HOST,
        "smtp_port": settings.SMTP_PORT,
        "has_sendgrid_key": bool(settings.SENDGRID_API_KEY),
        "frontend_url": settings.FRONTEND_URL,
        "backend_url": settings.BACKEND_URL
    }

@router.post("")
def update_system_settings(
    payload: Dict[str, Any],
    current_user: AdminUser = Depends(require_roles(["admin"]))
):
    if "email_provider" in payload:
        settings.EMAIL_PROVIDER = str(payload["email_provider"])
    if "email_test_mode" in payload:
        settings.EMAIL_TEST_MODE = bool(payload["email_test_mode"])
    if "email_from_address" in payload:
        settings.EMAIL_FROM_ADDRESS = str(payload["email_from_address"])
    if "email_from_name" in payload:
        settings.EMAIL_FROM_NAME = str(payload["email_from_name"])
    
    return {"message": "Settings updated successfully", "current_provider": settings.EMAIL_PROVIDER}

@router.get("/sent-mailbox")
def get_mock_sent_mailbox(current_user: AdminUser = Depends(get_current_user)):
    """Inspection endpoint for test mode: view emails dispatched by TestMockEmailAdapter."""
    return {
        "count": len(TestMockEmailAdapter.get_sent_emails()),
        "emails": TestMockEmailAdapter.get_sent_emails()
    }
