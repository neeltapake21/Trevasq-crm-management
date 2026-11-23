from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Campaign, CampaignRecipient, EmailEvent, Product, Contact, Subscription
)
from backend.app.services.eligibility_service import verify_single_recipient_eligibility, get_product_campaign_audience
from backend.app.services.template_renderer import render_personalized_email
from backend.app.services.unsubscribe_service import create_unsubscribe_token
from backend.app.services.activity_service import log_activity
from backend.app.integrations.email_adapter import get_email_adapter

def execute_campaign(db: Session, campaign_id: int) -> Dict[str, Any]:
    """
    Executes a campaign with complete eligibility verification, personalization,
    idempotent sending, and recipient logging.
    """
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise ValueError(f"Campaign {campaign_id} not found")

    if campaign.status in ("cancelled", "paused"):
        return {"status": campaign.status, "message": f"Campaign is {campaign.status}, skipping execution"}

    # Mark as processing
    campaign.status = "processing"
    db.commit()

    product = campaign.product
    now = datetime.now(timezone.utc)
    email_adapter = get_email_adapter(db=db)

    # Step 1: Find all candidate subscriptions for this product
    subscriptions = db.query(Subscription).filter(Subscription.product_id == product.id).all()

    processed_count = 0
    sent_count = 0
    skipped_count = 0
    failed_count = 0

    for sub in subscriptions:
        contact = sub.contact
        processed_count += 1

        # Step 2: Strict eligibility check immediately before sending (Test 4, Module 8.4)
        is_eligible, reason = verify_single_recipient_eligibility(
            db=db,
            contact_id=contact.id,
            product_id=product.id,
            campaign_id=campaign.id
        )

        if not is_eligible:
            skipped_count += 1
            continue

        # Step 3: Idempotency check: Has this recipient already been sent this campaign? (Test 8)
        existing_rec = db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign.id,
            CampaignRecipient.contact_id == contact.id
        ).first()

        if existing_rec and existing_rec.status in ("sent", "delivered"):
            skipped_count += 1
            continue

        # Step 4: Create unguessable tokens for unsubscribe
        prod_unsub_url, global_unsub_url = create_unsubscribe_token(
            db=db,
            contact_id=contact.id,
            product_id=product.id
        )

        # Step 5: Render personalized email (Test 9)
        contact_dict = {
            "full_name": contact.full_name,
            "company": contact.company,
            "designation": contact.designation,
            "email": contact.normalized_email
        }
        product_dict = {
            "name": product.name,
            "slug": product.slug
        }

        subj, html_body, text_body = render_personalized_email(
            subject_template=campaign.subject,
            html_template=campaign.html_content,
            text_template=campaign.text_content or "",
            contact_data=contact_dict,
            product_data=product_dict,
            unsubscribe_url=prod_unsub_url,
            global_unsubscribe_url=global_unsub_url
        )

        # Step 6: Dispatch email via provider adapter
        send_result = email_adapter.send_email(
            to_email=contact.normalized_email,
            to_name=contact.full_name,
            subject=subj,
            html_content=html_body,
            text_content=text_body,
            headers={
                "List-Unsubscribe": f"<{global_unsub_url}>",
                "X-Campaign-ID": str(campaign.id)
            }
        )

        # Step 7: Record CampaignRecipient
        rec_status = "sent" if send_result.success else "failed"
        if existing_rec:
            recipient_record = existing_rec
            recipient_record.status = rec_status
            recipient_record.provider_message_id = send_result.message_id
            recipient_record.sent_at = now if send_result.success else None
            recipient_record.error_message = send_result.error_message
        else:
            recipient_record = CampaignRecipient(
                campaign_id=campaign.id,
                contact_id=contact.id,
                email_snapshot=contact.normalized_email,
                status=rec_status,
                provider_message_id=send_result.message_id,
                sent_at=now if send_result.success else None,
                error_message=send_result.error_message
            )
            db.add(recipient_record)

        db.flush()

        # Step 8: Log email event
        event = EmailEvent(
            campaign_recipient_id=recipient_record.id,
            event_type="sent" if send_result.success else "failed",
            provider_event_id=f"send-{send_result.message_id}" if send_result.message_id else None,
            event_timestamp=now,
            event_data=f"Provider: {send_result.provider}"
        )
        db.add(event)

        if send_result.success:
            sent_count += 1
        else:
            failed_count += 1

    # Mark campaign as sent or failed
    campaign.status = "sent" if sent_count > 0 or skipped_count > 0 else ("failed" if failed_count > 0 else "sent")
    campaign.sent_at = now
    campaign.updated_at = now
    db.commit()

    log_activity(
        db=db,
        action="campaign_sent",
        entity_type="campaign",
        entity_id=str(campaign.id),
        metadata={
            "name": campaign.name,
            "product_id": product.id,
            "sent_count": sent_count,
            "skipped_count": skipped_count,
            "failed_count": failed_count
        }
    )

    return {
        "status": campaign.status,
        "sent_count": sent_count,
        "skipped_count": skipped_count,
        "failed_count": failed_count,
        "total_processed": processed_count
    }
