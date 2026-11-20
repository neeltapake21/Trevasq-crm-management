from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import Campaign, CampaignRecipient, Product, AdminUser, EmailEvent
from backend.app.schemas import (
    CampaignCreate, CampaignUpdate, CampaignResponse, CampaignRecipientResponse, AudienceCheckResponse
)
from backend.app.api.deps import get_current_user, require_roles
from backend.app.services.campaign_service import execute_campaign
from backend.app.services.eligibility_service import get_product_campaign_audience
from backend.app.services.template_renderer import render_personalized_email
from backend.app.services.activity_service import log_activity
from backend.app.integrations.email_adapter import get_email_adapter

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

def build_campaign_response(c: Campaign, db: Session) -> dict:
    recipients_count = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == c.id).count()
    sent_count = db.query(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == c.id,
        CampaignRecipient.status.in_(("sent", "delivered"))
    ).count()
    delivered_count = db.query(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == c.id,
        CampaignRecipient.status == "delivered"
    ).count()
    if delivered_count == 0 and sent_count > 0:
        delivered_count = sent_count
    
    bounced_count = db.query(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == c.id,
        CampaignRecipient.status == "bounced"
    ).count()
    
    opened_count = db.query(EmailEvent).join(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == c.id,
        EmailEvent.event_type == "opened"
    ).count()
    
    clicked_count = db.query(EmailEvent).join(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == c.id,
        EmailEvent.event_type == "clicked"
    ).count()

    unsub_count = db.query(EmailEvent).join(CampaignRecipient).filter(
        CampaignRecipient.campaign_id == c.id,
        EmailEvent.event_type == "unsubscribed"
    ).count()

    # Calculate real-time eligible count
    eligible, _, _ = get_product_campaign_audience(db, c.product_id, c.id)

    return {
        "id": c.id,
        "name": c.name,
        "product_id": c.product_id,
        "product_name": c.product.name if c.product else "N/A",
        "subject": c.subject,
        "html_content": c.html_content,
        "text_content": c.text_content,
        "status": c.status,
        "scheduled_at": c.scheduled_at,
        "sent_at": c.sent_at,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
        "eligible_count": len(eligible),
        "recipients_count": recipients_count,
        "sent_count": sent_count,
        "delivered_count": delivered_count,
        "opened_count": opened_count,
        "clicked_count": clicked_count,
        "bounced_count": bounced_count,
        "unsubscribed_count": unsub_count
    }

@router.get("", response_model=List[CampaignResponse])
def list_campaigns(
    product_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    query = db.query(Campaign)
    if product_id:
        query = query.filter(Campaign.product_id == product_id)
    if status:
        query = query.filter(Campaign.status == status)

    campaigns = query.order_by(Campaign.created_at.desc()).all()
    return [build_campaign_response(c, db) for c in campaigns]

@router.post("", response_model=CampaignResponse)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    product = db.query(Product).filter(Product.id == campaign_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Target product not found")

    status = "scheduled" if campaign_in.schedule_time else "draft"
    now = datetime.now(timezone.utc)

    campaign = Campaign(
        name=campaign_in.name,
        product_id=campaign_in.product_id,
        subject=campaign_in.subject,
        html_content=campaign_in.html_content,
        text_content=campaign_in.text_content,
        status=status,
        scheduled_at=campaign_in.schedule_time,
        created_at=now,
        updated_at=now
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    log_activity(
        db=db,
        action="campaign_created",
        entity_type="campaign",
        entity_id=str(campaign.id),
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"name": campaign.name, "status": status}
    )

    return build_campaign_response(campaign, db)

@router.get("/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return build_campaign_response(campaign, db)

@router.put("/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    campaign_in: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if c.status in ("sent", "processing"):
        raise HTTPException(status_code=400, detail="Cannot edit a campaign that is processing or already sent")

    if campaign_in.name is not None:
        c.name = campaign_in.name
    if campaign_in.subject is not None:
        c.subject = campaign_in.subject
    if campaign_in.html_content is not None:
        c.html_content = campaign_in.html_content
    if campaign_in.text_content is not None:
        c.text_content = campaign_in.text_content
    if campaign_in.schedule_time is not None:
        c.scheduled_at = campaign_in.schedule_time
        c.status = "scheduled"

    c.updated_at = datetime.now(timezone.utc)
    db.commit()

    return build_campaign_response(c, db)

@router.get("/{campaign_id}/audience-check", response_model=AudienceCheckResponse)
def check_campaign_audience(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    eligible, excluded, stats = get_product_campaign_audience(db, campaign.product_id, campaign.id)

    samples = []
    for c in eligible[:5]:
        samples.append({
            "contact_id": c.id,
            "full_name": c.full_name,
            "email": c.normalized_email,
            "company": c.company or "N/A"
        })

    return {
        "product_id": campaign.product_id,
        "product_name": campaign.product.name,
        "total_contacts": len(eligible) + len(excluded),
        "eligible_count": len(eligible),
        "excluded_count": len(excluded),
        "exclusion_reasons": stats,
        "sample_recipients": samples
    }

@router.get("/{campaign_id}/recipients", response_model=List[CampaignRecipientResponse])
def get_campaign_recipients(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    recipients = db.query(CampaignRecipient).filter(CampaignRecipient.campaign_id == campaign_id).all()
    result = []
    for r in recipients:
        result.append({
            "id": r.id,
            "contact_id": r.contact_id,
            "contact_name": r.contact.full_name if r.contact else "Unknown",
            "contact_email": r.email_snapshot,
            "company": r.contact.company if r.contact else None,
            "status": r.status,
            "provider_message_id": r.provider_message_id,
            "sent_at": r.sent_at,
            "error_message": r.error_message,
            "events_count": len(r.events)
        })
    return result

@router.post("/{campaign_id}/execute")
def send_campaign_now(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    try:
        result = execute_campaign(db, campaign_id)
        return {"success": True, "details": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{campaign_id}/schedule")
def schedule_campaign(
    campaign_id: int,
    schedule_time: datetime,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    c.scheduled_at = schedule_time
    c.status = "scheduled"
    c.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_activity(
        db=db,
        action="campaign_scheduled",
        entity_type="campaign",
        entity_id=str(c.id),
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"scheduled_at": schedule_time.isoformat()}
    )

    return {"message": "Campaign scheduled successfully", "scheduled_at": schedule_time}

@router.post("/{campaign_id}/pause")
def pause_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    c.status = "paused"
    db.commit()
    return {"message": "Campaign paused"}

@router.post("/{campaign_id}/resume")
def resume_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    c.status = "scheduled" if c.scheduled_at else "draft"
    db.commit()
    return {"message": "Campaign resumed", "status": c.status}

@router.post("/{campaign_id}/cancel")
def cancel_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    c.status = "cancelled"
    db.commit()
    return {"message": "Campaign cancelled"}

@router.post("/{campaign_id}/test-send")
def send_test_email(
    campaign_id: int,
    test_email: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    """Dispatches a safe single test email to the current admin for preview validation."""
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")

    recipient_email = test_email or current_user.email
    email_adapter = get_email_adapter()

    subj, html_body, text_body = render_personalized_email(
        subject_template=c.subject,
        html_template=c.html_content,
        text_template=c.text_content or "",
        contact_data={"full_name": current_user.name, "company": "TrevasQ Admin Preview", "email": recipient_email},
        product_data={"name": c.product.name, "slug": c.product.slug},
        unsubscribe_url="http://localhost:5173/unsubscribe/sample-token-preview",
        global_unsubscribe_url="http://localhost:5173/unsubscribe/sample-token-preview?scope=global"
    )

    res = email_adapter.send_email(
        to_email=recipient_email,
        to_name=f"[TEST] {current_user.name}",
        subject=f"[TEST PREVIEW] {subj}",
        html_content=html_body,
        text_content=text_body
    )

    return {
        "success": res.success,
        "message": f"Test email sent to {recipient_email}",
        "message_id": res.message_id,
        "provider": res.provider
    }
