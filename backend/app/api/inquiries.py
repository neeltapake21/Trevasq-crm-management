from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import Inquiry, Product, AdminUser
from backend.app.schemas import PublicInquiryCreate, InquiryResponse
from backend.app.services.contact_service import process_inquiry
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/inquiries", tags=["Inquiries"])

@router.post("", response_model=InquiryResponse)
def submit_public_inquiry(
    inquiry_in: PublicInquiryCreate,
    db: Session = Depends(get_db)
):
    """
    Public Inquiry Submission:
    Accepts inquiry from website or product-specific contact form.
    Automatically identifies or creates contact, deduplicates by normalized email,
    records inquiry, stores consent only if explicitly given, and updates mailing list.
    """
    inquiry, contact, is_created = process_inquiry(
        db=db,
        full_name=inquiry_in.full_name,
        email=inquiry_in.email,
        company=inquiry_in.company,
        designation=inquiry_in.designation,
        phone=inquiry_in.phone,
        country=inquiry_in.country,
        product_id=inquiry_in.product_id,
        product_slug=inquiry_in.product_slug,
        message=inquiry_in.message,
        marketing_consent=inquiry_in.marketing_consent,
        source="website_inquiry",
        evidence_reference="Web Inquiry Form Submission"
    )

    return {
        "id": inquiry.id,
        "contact_id": contact.id,
        "contact_name": contact.full_name,
        "contact_email": contact.normalized_email,
        "product_id": inquiry.product_id,
        "product_name": inquiry.product.name if inquiry.product else "General",
        "source": inquiry.source,
        "message": inquiry.message,
        "consent_given": inquiry.consent_given,
        "created_at": inquiry.created_at
    }

@router.get("", response_model=List[InquiryResponse])
def list_inquiries(
    product_id: Optional[int] = Query(None),
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    query = db.query(Inquiry)
    if product_id:
        query = query.filter(Inquiry.product_id == product_id)
    
    inquiries = query.order_by(Inquiry.created_at.desc()).offset(offset).limit(limit).all()

    result = []
    for inq in inquiries:
        result.append({
            "id": inq.id,
            "contact_id": inq.contact_id,
            "contact_name": inq.contact.full_name if inq.contact else "Unknown",
            "contact_email": inq.contact.normalized_email if inq.contact else "Unknown",
            "product_id": inq.product_id,
            "product_name": inq.product.name if inq.product else "General",
            "source": inq.source,
            "message": inq.message,
            "consent_given": inq.consent_given,
            "created_at": inq.created_at
        })
    return result
