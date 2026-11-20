import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import CampaignRecipient, EmailEvent, SuppressionRecord, Contact
from backend.app.schemas import ProviderWebhookPayload
from backend.app.services.activity_service import log_activity

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@router.post("/email")
async def handle_email_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Idempotent Email Provider Webhook Processor (Test 11):
    Processes delivery, bounce, open, click, and unsubscribe events.
    Duplicate provider event IDs are safely deduplicated to avoid inflated metrics.
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    events = body if isinstance(body, list) else [body]
    processed_count = 0
    duplicate_count = 0

    now = datetime.now(timezone.utc)

    for item in events:
        event_id = item.get("event_id") or item.get("sg_event_id") or item.get("id")
        event_type = (item.get("event_type") or item.get("event") or "delivered").lower()
        message_id = item.get("message_id") or item.get("sg_message_id")
        recipient_email = (item.get("recipient_email") or item.get("email") or "").strip().lower()

        # Idempotency check: Ignore duplicate event IDs (Test 11)
        if event_id:
            existing_event = db.query(EmailEvent).filter(EmailEvent.provider_event_id == str(event_id)).first()
            if existing_event:
                duplicate_count += 1
                continue

        # Find campaign recipient by message_id or email
        recipient = None
        if message_id:
            recipient = db.query(CampaignRecipient).filter(CampaignRecipient.provider_message_id == str(message_id)).first()
        if not recipient and recipient_email:
            recipient = db.query(CampaignRecipient).filter(
                CampaignRecipient.email_snapshot == recipient_email
            ).order_by(CampaignRecipient.id.desc()).first()

        if recipient:
            # Map provider event type to standard statuses
            if event_type in ("delivered", "delivery"):
                recipient.status = "delivered"
            elif event_type in ("bounced", "bounce", "dropped"):
                recipient.status = "bounced"
            elif event_type in ("spamreport", "complaint"):
                recipient.status = "bounced"
                # Add to global suppression
                supp = SuppressionRecord(
                    normalized_email=recipient_email,
                    scope="global",
                    reason="spam_complaint",
                    source="webhook_event",
                    created_at=now
                )
                db.add(supp)

            # Store the event
            evt = EmailEvent(
                campaign_recipient_id=recipient.id,
                event_type=event_type,
                provider_event_id=str(event_id) if event_id else None,
                event_timestamp=now,
                event_data=json.dumps(item)
            )
            db.add(evt)
            processed_count += 1

    db.commit()

    return {
        "success": True,
        "processed_events": processed_count,
        "duplicate_events_ignored": duplicate_count
    }
