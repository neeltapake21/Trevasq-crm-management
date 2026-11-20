import io
import csv
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.security import normalize_email
from backend.app.models.entities import (
    Contact, Subscription, SuppressionRecord, Product, ConsentEvent, Inquiry, CampaignRecipient, AdminUser
)
from backend.app.schemas import (
    ContactResponse, ContactDetailResponse, ContactCreate, ContactUpdate
)
from backend.app.api.deps import get_current_user, require_roles
from backend.app.services.contact_service import get_or_create_contact
from backend.app.services.activity_service import log_activity

router = APIRouter(prefix="/contacts", tags=["Contacts"])

@router.get("", response_model=List[ContactResponse])
def list_contacts(
    search: Optional[str] = Query(None, description="Search name, email, company"),
    product_id: Optional[int] = Query(None),
    lead_source: Optional[str] = Query(None),
    status: Optional[str] = Query(None, description="Subscription status: subscribed, unsubscribed, etc."),
    country: Optional[str] = Query(None),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    query = db.query(Contact).filter(Contact.deleted_at == None)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Contact.full_name.ilike(s)) |
            (Contact.normalized_email.ilike(s)) |
            (Contact.company.ilike(s))
        )

    if lead_source:
        query = query.filter(Contact.lead_source == lead_source)

    if country:
        query = query.filter(Contact.country == country)

    if product_id:
        query = query.join(Subscription).filter(Subscription.product_id == product_id)
        if status:
            query = query.filter(Subscription.status == status)
    elif status:
        query = query.join(Subscription).filter(Subscription.status == status)

    contacts = query.order_by(Contact.created_at.desc()).offset(offset).limit(limit).all()

    # Enrich with global suppression status and product subscriptions
    result = []
    for c in contacts:
        is_glob_supp = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == c.normalized_email,
            SuppressionRecord.scope == "global"
        ).first() is not None

        subs_brief = []
        for s in c.subscriptions:
            subs_brief.append({
                "id": s.id,
                "product_id": s.product_id,
                "product_name": s.product.name,
                "product_slug": s.product.slug,
                "status": s.status,
                "consent_date": s.consent_date,
                "consent_source": s.consent_source,
                "unsubscribed_at": s.unsubscribed_at
            })

        c_dict = {
            "id": c.id,
            "full_name": c.full_name,
            "normalized_email": c.normalized_email,
            "phone": c.phone,
            "company": c.company,
            "designation": c.designation,
            "country": c.country,
            "lead_source": c.lead_source,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "is_globally_suppressed": is_glob_supp,
            "subscriptions": subs_brief
        }
        result.append(c_dict)

    return result

@router.get("/export")
def export_contacts_csv(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Exports all contacts as a CSV file."""
    contacts = db.query(Contact).filter(Contact.deleted_at == None).order_by(Contact.created_at.desc()).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Full Name", "Email", "Company", "Designation", "Country", "Phone", "Lead Source", "Date Added"])

    for c in contacts:
        writer.writerow([
            c.id, c.full_name, c.normalized_email, c.company or "",
            c.designation or "", c.country or "", c.phone or "", c.lead_source,
            c.created_at.strftime("%Y-%m-%d %H:%M:%S")
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trevasq_contacts.csv"}
    )

@router.get("/{contact_id}", response_model=ContactDetailResponse)
def get_contact_detail(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.deleted_at == None).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    is_glob_supp = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == contact.normalized_email,
        SuppressionRecord.scope == "global"
    ).first() is not None

    subs_brief = []
    for s in contact.subscriptions:
        subs_brief.append({
            "id": s.id,
            "product_id": s.product_id,
            "product_name": s.product.name,
            "product_slug": s.product.slug,
            "status": s.status,
            "consent_date": s.consent_date,
            "consent_source": s.consent_source,
            "unsubscribed_at": s.unsubscribed_at
        })

    inquiries_brief = []
    for inq in contact.inquiries:
        inquiries_brief.append({
            "id": inq.id,
            "product_id": inq.product_id,
            "product_name": inq.product.name if inq.product else "General",
            "source": inq.source,
            "message": inq.message,
            "consent_given": inq.consent_given,
            "created_at": inq.created_at
        })

    consent_events_brief = []
    for ce in contact.consent_events:
        consent_events_brief.append({
            "id": ce.id,
            "product_id": ce.product_id,
            "event_type": ce.event_type,
            "consent_source": ce.consent_source,
            "consent_method": ce.consent_method,
            "event_timestamp": ce.event_timestamp,
            "evidence_reference": ce.evidence_reference
        })

    # Campaign engagement history
    campaign_history = []
    recipients = db.query(CampaignRecipient).filter(CampaignRecipient.contact_id == contact.id).all()
    for r in recipients:
        campaign_history.append({
            "campaign_id": r.campaign_id,
            "campaign_name": r.campaign.name,
            "product_name": r.campaign.product.name,
            "status": r.status,
            "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            "events_count": len(r.events)
        })

    return {
        "id": contact.id,
        "full_name": contact.full_name,
        "normalized_email": contact.normalized_email,
        "phone": contact.phone,
        "company": contact.company,
        "designation": contact.designation,
        "country": contact.country,
        "lead_source": contact.lead_source,
        "created_at": contact.created_at,
        "updated_at": contact.updated_at,
        "is_globally_suppressed": is_glob_supp,
        "subscriptions": subs_brief,
        "inquiries": inquiries_brief,
        "consent_events": consent_events_brief,
        "campaign_history": campaign_history
    }

@router.post("", response_model=ContactResponse)
def create_contact_manual(
    contact_in: ContactCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    contact, is_created = get_or_create_contact(
        db=db,
        email=contact_in.email,
        full_name=contact_in.full_name,
        phone=contact_in.phone,
        company=contact_in.company,
        designation=contact_in.designation,
        country=contact_in.country,
        lead_source=contact_in.lead_source or "manual"
    )

    # Check suppression
    norm_email = contact.normalized_email
    is_glob_supp = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == norm_email,
        SuppressionRecord.scope == "global"
    ).first() is not None

    # Handle product interests and subscriptions
    now = datetime.now(timezone.utc)
    if contact_in.product_interests:
        for pid in contact_in.product_interests:
            product = db.query(Product).filter(Product.id == pid).first()
            if not product:
                continue
            is_prod_supp = db.query(SuppressionRecord).filter(
                SuppressionRecord.normalized_email == norm_email,
                SuppressionRecord.product_id == pid
            ).first() is not None

            sub = db.query(Subscription).filter(
                Subscription.contact_id == contact.id,
                Subscription.product_id == pid
            ).first()

            if contact_in.consent_given and not is_glob_supp and not is_prod_supp:
                if sub:
                    sub.status = "subscribed"
                    sub.consent_date = now
                    sub.consent_source = contact_in.consent_source or "manual_entry"
                else:
                    sub = Subscription(
                        contact_id=contact.id,
                        product_id=pid,
                        status="subscribed",
                        consent_date=now,
                        consent_source=contact_in.consent_source or "manual_entry"
                    )
                    db.add(sub)
                
                # Record consent
                ce = ConsentEvent(
                    contact_id=contact.id,
                    product_id=pid,
                    event_type="consent_given",
                    consent_source=contact_in.consent_source or "manual_entry",
                    consent_method="admin_manual_input",
                    event_timestamp=now,
                    evidence_reference=f"Added by admin user ID {current_user.id}"
                )
                db.add(ce)
            else:
                if not sub:
                    sub = Subscription(
                        contact_id=contact.id,
                        product_id=pid,
                        status="not_subscribed"
                    )
                    db.add(sub)

        db.commit()

    log_activity(
        db=db,
        action="contact_created_manual" if is_created else "contact_updated_manual",
        entity_type="contact",
        entity_id=str(contact.id),
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"email": contact.normalized_email, "is_new": is_created}
    )

    return get_contact_detail(contact.id, db, current_user)

@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(
    contact_id: int,
    contact_in: ContactUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    contact = db.query(Contact).filter(Contact.id == contact_id, Contact.deleted_at == None).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    if contact_in.full_name is not None:
        contact.full_name = contact_in.full_name
    if contact_in.company is not None:
        contact.company = contact_in.company
    if contact_in.phone is not None:
        contact.phone = contact_in.phone
    if contact_in.designation is not None:
        contact.designation = contact_in.designation
    if contact_in.country is not None:
        contact.country = contact_in.country
    contact.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_activity(
        db=db,
        action="contact_updated",
        entity_type="contact",
        entity_id=str(contact.id),
        actor_id=current_user.id,
        actor_email=current_user.email
    )

    return get_contact_detail(contact.id, db, current_user)

@router.delete("/{contact_id}")
def delete_contact(
    contact_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin"]))
):
    """
    Privacy-compliant deletion:
    Soft deletes or cleans personal contact info, but preserves suppression records
    to prevent future unwanted marketing under electronic marketing privacy rules.
    """
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    now = datetime.now(timezone.utc)
    contact.deleted_at = now
    db.commit()

    log_activity(
        db=db,
        action="contact_deleted_privacy_request",
        entity_type="contact",
        entity_id=str(contact_id),
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"email": contact.normalized_email}
    )

    return {"message": "Contact deleted successfully. Suppression records preserved."}
