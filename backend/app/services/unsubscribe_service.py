from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Contact, Product, Subscription, SuppressionRecord, ConsentEvent, UnsubscribeToken
)
from backend.app.core.security import generate_secure_token, normalize_email
from backend.app.core.config import settings
from backend.app.services.activity_service import log_activity

def create_unsubscribe_token(
    db: Session,
    contact_id: int,
    product_id: Optional[int] = None,
    expiry_days: int = 90
) -> Tuple[str, str]:
    """
    Creates or retrieves an active unguessable token for a contact and product.
    Returns (product_unsubscribe_url, global_unsubscribe_url).
    """
    # Check if a recent token already exists
    token_record = db.query(UnsubscribeToken).filter(
        UnsubscribeToken.contact_id == contact_id,
        UnsubscribeToken.product_id == product_id,
        UnsubscribeToken.used_at == None
    ).first()

    if not token_record:
        token_str = generate_secure_token(32)
        now = datetime.now(timezone.utc)
        token_record = UnsubscribeToken(
            token=token_str,
            contact_id=contact_id,
            product_id=product_id,
            created_at=now,
            expires_at=now + timedelta(days=expiry_days)
        )
        db.add(token_record)
        db.commit()
        db.refresh(token_record)

    product_url = f"{settings.UNSUBSCRIBE_BASE_URL}/{token_record.token}"
    global_url = f"{settings.UNSUBSCRIBE_BASE_URL}/{token_record.token}?scope=global"
    return product_url, global_url

def verify_unsubscribe_token(db: Session, token: str) -> Tuple[bool, Optional[Contact], Optional[Product]]:
    """
    Validates token and returns (is_valid, contact, product).
    """
    token_record = db.query(UnsubscribeToken).filter(UnsubscribeToken.token == token).first()
    if not token_record:
        return False, None, None

    contact = db.query(Contact).filter(Contact.id == token_record.contact_id).first()
    product = None
    if token_record.product_id:
        product = db.query(Product).filter(Product.id == token_record.product_id).first()

    return True, contact, product

def execute_unsubscribe(
    db: Session,
    token: str,
    scope: str = "product",
    reason: str = "User requested unsubscribe"
) -> Tuple[bool, str, Contact, Optional[Product]]:
    """
    Executes unsubscribe action:
    - scope == 'product': Unsubscribes from product and adds product suppression.
    - scope == 'global': Unsubscribes from all products and adds global suppression.
    """
    is_valid, contact, product = verify_unsubscribe_token(db, token)
    if not is_valid or not contact:
        return False, "Invalid or expired unsubscribe link", None, None

    now = datetime.now(timezone.utc)
    normalized = contact.normalized_email

    if scope == "global" or not product:
        # 1. Global unsubscribe
        # Mark all subscriptions as unsubscribed
        subs = db.query(Subscription).filter(Subscription.contact_id == contact.id).all()
        for s in subs:
            s.status = "unsubscribed"
            s.unsubscribed_at = now
            s.updated_at = now

        # Record in central suppression database
        existing_supp = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == normalized,
            SuppressionRecord.scope == "global"
        ).first()
        if not existing_supp:
            supp = SuppressionRecord(
                normalized_email=normalized,
                scope="global",
                product_id=None,
                reason=reason,
                source="unsubscribe_link",
                created_at=now
            )
            db.add(supp)

        # Record consent event
        consent_event = ConsentEvent(
            contact_id=contact.id,
            product_id=None,
            event_type="opt_out",
            consent_source="unsubscribe_link",
            consent_method="global_unsubscribe",
            event_timestamp=now,
            evidence_reference=f"Unsubscribe token: {token[:8]}..."
        )
        db.add(consent_event)

        # Log activity
        log_activity(
            db=db,
            action="global_unsubscribe",
            entity_type="contact",
            entity_id=str(contact.id),
            actor_email=normalized,
            metadata={"scope": "global", "reason": reason}
        )

        db.commit()
        return True, "You have been successfully unsubscribed from all TrevasQ marketing communications.", contact, None

    else:
        # 2. Product-specific unsubscribe
        sub = db.query(Subscription).filter(
            Subscription.contact_id == contact.id,
            Subscription.product_id == product.id
        ).first()
        if sub:
            sub.status = "unsubscribed"
            sub.unsubscribed_at = now
            sub.updated_at = now

        # Add product suppression record
        existing_supp = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == normalized,
            SuppressionRecord.product_id == product.id
        ).first()
        if not existing_supp:
            supp = SuppressionRecord(
                normalized_email=normalized,
                scope="product",
                product_id=product.id,
                reason=reason,
                source="unsubscribe_link",
                created_at=now
            )
            db.add(supp)

        # Record consent event
        consent_event = ConsentEvent(
            contact_id=contact.id,
            product_id=product.id,
            event_type="consent_withdrawn",
            consent_source="unsubscribe_link",
            consent_method="product_unsubscribe",
            event_timestamp=now,
            evidence_reference=f"Unsubscribed from {product.name}"
        )
        db.add(consent_event)

        # Log activity
        log_activity(
            db=db,
            action="product_unsubscribe",
            entity_type="subscription",
            entity_id=str(sub.id) if sub else None,
            actor_email=normalized,
            metadata={"product_id": product.id, "product_name": product.name, "reason": reason}
        )

        db.commit()
        return True, f"You have been successfully unsubscribed from {product.name} communications.", contact, product

def is_email_suppressed(db: Session, email: str, product_id: Optional[int] = None) -> Tuple[bool, Optional[str]]:
    """
    Checks if an email is suppressed globally or for a specific product.
    Returns (is_suppressed, reason).
    """
    normalized = normalize_email(email)
    
    # 1. Check global suppression
    global_supp = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == normalized,
        SuppressionRecord.scope == "global"
    ).first()
    if global_supp:
        return True, f"Globally suppressed ({global_supp.reason or 'User opted out'})"

    # 2. Check product suppression if product_id is specified
    if product_id:
        prod_supp = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == normalized,
            SuppressionRecord.product_id == product_id
        ).first()
        if prod_supp:
            return True, f"Suppressed for this product ({prod_supp.reason or 'Unsubscribed'})"

    return False, None
