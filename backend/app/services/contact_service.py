from datetime import datetime, timezone
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Contact, Inquiry, Subscription, SuppressionRecord, ConsentEvent, Product
)
from backend.app.core.security import normalize_email
from backend.app.services.activity_service import log_activity

def get_or_create_contact(
    db: Session,
    email: str,
    full_name: str,
    phone: Optional[str] = None,
    company: Optional[str] = None,
    designation: Optional[str] = None,
    country: Optional[str] = None,
    lead_source: str = "website"
) -> Tuple[Contact, bool]:
    """
    Finds existing contact by normalized email or creates a new one.
    Returns (contact, is_created).
    """
    normalized = normalize_email(email)
    contact = db.query(Contact).filter(Contact.normalized_email == normalized).first()
    
    if contact:
        # Update contact details where provided
        if full_name and (not contact.full_name or contact.full_name == "Unknown"):
            contact.full_name = full_name
        if phone:
            contact.phone = phone
        if company:
            contact.company = company
        if designation:
            contact.designation = designation
        if country:
            contact.country = country
        contact.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(contact)
        return contact, False
    else:
        contact = Contact(
            full_name=full_name,
            normalized_email=normalized,
            phone=phone,
            company=company,
            designation=designation,
            country=country,
            lead_source=lead_source
        )
        db.add(contact)
        db.commit()
        db.refresh(contact)
        return contact, True

def process_inquiry(
    db: Session,
    full_name: str,
    email: str,
    company: Optional[str] = None,
    designation: Optional[str] = None,
    phone: Optional[str] = None,
    country: Optional[str] = None,
    product_id: Optional[int] = None,
    product_slug: Optional[str] = None,
    message: Optional[str] = None,
    marketing_consent: bool = False,
    source: str = "website_inquiry",
    evidence_reference: Optional[str] = "Website form submission"
) -> Tuple[Inquiry, Contact, bool]:
    """
    Full automated workflow for an inquiry submission:
    1. Resolve product if slug provided
    2. Get or create contact (deduplicating by normalized email)
    3. Create inquiry record
    4. If marketing_consent is True:
       - Check if suppressed
       - If not suppressed, subscribe contact to the product
       - Record consent event
    5. Log activity
    """
    # 1. Resolve product
    target_product = None
    if product_id:
        target_product = db.query(Product).filter(Product.id == product_id).first()
    elif product_slug:
        target_product = db.query(Product).filter(Product.slug == product_slug).first()
        if target_product:
            product_id = target_product.id

    # 2. Get or create contact
    contact, is_created = get_or_create_contact(
        db=db,
        email=email,
        full_name=full_name,
        phone=phone,
        company=company,
        designation=designation,
        country=country,
        lead_source=source
    )

    # 3. Create inquiry record
    inquiry = Inquiry(
        contact_id=contact.id,
        product_id=product_id,
        source=source,
        message=message,
        consent_given=marketing_consent
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    # 4. Handle consent and subscription if explicit consent was given
    if marketing_consent and target_product:
        now = datetime.now(timezone.utc)
        normalized = contact.normalized_email

        # Check global suppression
        is_globally_suppressed = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == normalized,
            SuppressionRecord.scope == "global"
        ).first() is not None

        # Check product suppression
        is_product_suppressed = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == normalized,
            SuppressionRecord.product_id == target_product.id
        ).first() is not None

        # Record consent event
        consent_event = ConsentEvent(
            contact_id=contact.id,
            product_id=target_product.id,
            event_type="consent_given",
            consent_source=source,
            consent_method="checkbox_form",
            evidence_reference=f"{evidence_reference} (Inquiry ID: {inquiry.id})"
        )
        db.add(consent_event)

        # Update or create subscription if NOT suppressed
        if not is_globally_suppressed and not is_product_suppressed:
            sub = db.query(Subscription).filter(
                Subscription.contact_id == contact.id,
                Subscription.product_id == target_product.id
            ).first()

            if sub:
                sub.status = "subscribed"
                sub.consent_date = now
                sub.consent_source = source
                sub.consent_method = "checkbox_form"
                sub.unsubscribed_at = None
                sub.updated_at = now
            else:
                sub = Subscription(
                    contact_id=contact.id,
                    product_id=target_product.id,
                    status="subscribed",
                    consent_date=now,
                    consent_source=source,
                    consent_method="checkbox_form"
                )
                db.add(sub)
        db.commit()

    # 5. Log activity
    log_activity(
        db=db,
        action="inquiry_submitted",
        entity_type="inquiry",
        entity_id=str(inquiry.id),
        actor_email=contact.normalized_email,
        metadata={
            "contact_id": contact.id,
            "product_id": product_id,
            "product_name": target_product.name if target_product else None,
            "marketing_consent": marketing_consent,
            "is_new_contact": is_created
        }
    )

    return inquiry, contact, is_created
