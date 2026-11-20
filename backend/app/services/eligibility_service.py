import re
from typing import List, Tuple, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Contact, Subscription, SuppressionRecord, CampaignRecipient, Product
)

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

def is_valid_email_syntax(email: str) -> bool:
    if not email:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def verify_single_recipient_eligibility(
    db: Session,
    contact_id: int,
    product_id: int,
    campaign_id: Optional[int] = None
) -> Tuple[bool, Optional[str]]:
    """
    Strict eligibility check performed immediately before sending every email.
    Returns (is_eligible, reason_if_excluded).
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        return False, "Contact not found"

    # 1. Email syntax check
    if not is_valid_email_syntax(contact.normalized_email):
        return False, "Invalid email syntax"

    # 2. Global suppression check
    global_suppressed = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == contact.normalized_email,
        SuppressionRecord.scope == "global"
    ).first()
    if global_suppressed:
        return False, f"Contact is globally suppressed ({global_suppressed.reason or 'opt-out'})"

    # 3. Product-specific suppression check
    product_suppressed = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == contact.normalized_email,
        SuppressionRecord.product_id == product_id
    ).first()
    if product_suppressed:
        return False, f"Contact is suppressed for this product ({product_suppressed.reason or 'unsubscribed'})"

    # 4. Product subscription check
    sub = db.query(Subscription).filter(
        Subscription.contact_id == contact.id,
        Subscription.product_id == product_id
    ).first()
    if not sub:
        return False, "Contact is not subscribed to this product"
    if sub.status != "subscribed":
        return False, f"Product subscription status is '{sub.status}'"

    # 5. Idempotency check: Already sent in this campaign
    if campaign_id:
        existing_recipient = db.query(CampaignRecipient).filter(
            CampaignRecipient.campaign_id == campaign_id,
            CampaignRecipient.contact_id == contact.id
        ).first()
        if existing_recipient and existing_recipient.status in ("sent", "delivered"):
            return False, f"Already sent to this recipient in this campaign (status: {existing_recipient.status})"

    return True, None

def get_product_campaign_audience(
    db: Session,
    product_id: int,
    campaign_id: Optional[int] = None
) -> Tuple[List[Contact], List[Dict[str, Any]], Dict[str, int]]:
    """
    Fetches all candidate contacts for a product and partitions them into:
    - eligible_contacts: List[Contact]
    - excluded_contacts: List[{"contact": Contact, "reason": str}]
    - stats: Dict[reason, count]
    """
    # Candidate contacts are all contacts with a subscription or inquiry for this product
    subscriptions = db.query(Subscription).filter(Subscription.product_id == product_id).all()
    
    eligible_contacts: List[Contact] = []
    excluded_contacts: List[Dict[str, Any]] = []
    reason_stats: Dict[str, int] = {}

    for sub in subscriptions:
        contact = sub.contact
        is_eligible, reason = verify_single_recipient_eligibility(
            db=db,
            contact_id=contact.id,
            product_id=product_id,
            campaign_id=campaign_id
        )
        if is_eligible:
            eligible_contacts.append(contact)
        else:
            excluded_contacts.append({
                "contact_id": contact.id,
                "email": contact.normalized_email,
                "name": contact.full_name,
                "reason": reason
            })
            reason_stats[reason] = reason_stats.get(reason, 0) + 1

    return eligible_contacts, excluded_contacts, reason_stats
