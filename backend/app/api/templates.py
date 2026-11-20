from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import EmailTemplate, Product, AdminUser, Contact
from backend.app.schemas import (
    TemplateCreate, TemplateUpdate, TemplateResponse, TemplatePreviewRequest, TemplatePreviewResponse
)
from backend.app.api.deps import get_current_user, require_roles
from backend.app.services.template_renderer import render_personalized_email

router = APIRouter(prefix="/templates", tags=["Email Templates"])

@router.get("", response_model=List[TemplateResponse])
def list_templates(
    product_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    query = db.query(EmailTemplate)
    if product_id:
        query = query.filter((EmailTemplate.product_id == product_id) | (EmailTemplate.product_id == None))
    
    templates = query.order_by(EmailTemplate.name.asc()).all()
    result = []
    for t in templates:
        result.append({
            "id": t.id,
            "name": t.name,
            "product_id": t.product_id,
            "product_name": t.product.name if t.product else "Universal",
            "subject": t.subject,
            "html_content": t.html_content,
            "text_content": t.text_content,
            "created_at": t.created_at,
            "updated_at": t.updated_at
        })
    return result

@router.post("", response_model=TemplateResponse)
def create_template(
    template_in: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    now = datetime.now(timezone.utc)
    template = EmailTemplate(
        name=template_in.name,
        product_id=template_in.product_id,
        subject=template_in.subject,
        html_content=template_in.html_content,
        text_content=template_in.text_content,
        created_at=now,
        updated_at=now
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    return {
        "id": template.id,
        "name": template.name,
        "product_id": template.product_id,
        "product_name": template.product.name if template.product else "Universal",
        "subject": template.subject,
        "html_content": template.html_content,
        "text_content": template.text_content,
        "created_at": template.created_at,
        "updated_at": template.updated_at
    }

@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    return {
        "id": t.id,
        "name": t.name,
        "product_id": t.product_id,
        "product_name": t.product.name if t.product else "Universal",
        "subject": t.subject,
        "html_content": t.html_content,
        "text_content": t.text_content,
        "created_at": t.created_at,
        "updated_at": t.updated_at
    }

@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    template_in: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")

    if template_in.name is not None:
        t.name = template_in.name
    if template_in.product_id is not None:
        t.product_id = template_in.product_id
    if template_in.subject is not None:
        t.subject = template_in.subject
    if template_in.html_content is not None:
        t.html_content = template_in.html_content
    if template_in.text_content is not None:
        t.text_content = template_in.text_content
    t.updated_at = datetime.now(timezone.utc)
    db.commit()

    return get_template(t.id, db, current_user)

@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(t)
    db.commit()
    return {"message": "Template deleted successfully"}

@router.post("/preview", response_model=TemplatePreviewResponse)
def preview_template(
    preview_in: TemplatePreviewRequest,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    # Retrieve sample contact or generate fallback
    contact_data = {
        "full_name": "Dr. Sarah Jenkins",
        "company": "Apex Quantum Technologies",
        "designation": "Chief Information Security Officer",
        "email": "s.jenkins@apexquantum.io"
    }
    if preview_in.sample_contact_id:
        c = db.query(Contact).filter(Contact.id == preview_in.sample_contact_id).first()
        if c:
            contact_data = {
                "full_name": c.full_name,
                "company": c.company or "Your Enterprise",
                "designation": c.designation or "Leader",
                "email": c.normalized_email
            }

    product_data = {"name": "QGuard", "slug": "qguard"}
    if preview_in.product_id:
        p = db.query(Product).filter(Product.id == preview_in.product_id).first()
        if p:
            product_data = {"name": p.name, "slug": p.slug}

    rendered_subj, rendered_html, rendered_text = render_personalized_email(
        subject_template=preview_in.subject,
        html_template=preview_in.html_content,
        text_template="",
        contact_data=contact_data,
        product_data=product_data,
        unsubscribe_url="http://localhost:5173/unsubscribe/sample-token-123",
        global_unsubscribe_url="http://localhost:5173/unsubscribe/sample-token-123?scope=global"
    )

    vars_used = ["{{first_name}}", "{{full_name}}", "{{company}}", "{{product_name}}", "{{unsubscribe_url}}"]

    return {
        "rendered_subject": rendered_subj,
        "rendered_html": rendered_html,
        "rendered_text": rendered_text,
        "variables_used": vars_used
    }
