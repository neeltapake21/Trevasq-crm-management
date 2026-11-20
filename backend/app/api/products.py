import re
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import Product, Subscription, AdminUser, SuppressionRecord
from backend.app.schemas import ProductCreate, ProductUpdate, ProductResponse, SubscriptionBrief
from backend.app.api.deps import get_current_user, require_roles
from backend.app.services.activity_service import log_activity

router = APIRouter(prefix="/products", tags=["Products"])

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

@router.get("", response_model=List[ProductResponse])
def list_products(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    query = db.query(Product)
    if status:
        query = query.filter(Product.status == status)
    
    products = query.order_by(Product.name.asc()).all()
    result = []

    for p in products:
        total = db.query(Subscription).filter(Subscription.product_id == p.id).count()
        active = db.query(Subscription).filter(
            Subscription.product_id == p.id,
            Subscription.status == "subscribed"
        ).count()
        unsub = db.query(Subscription).filter(
            Subscription.product_id == p.id,
            Subscription.status == "unsubscribed"
        ).count()

        result.append({
            "id": p.id,
            "name": p.name,
            "slug": p.slug,
            "description": p.description,
            "status": p.status,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "total_contacts": total,
            "active_subscribers": active,
            "unsubscribed_count": unsub
        })

    return result

@router.post("", response_model=ProductResponse)
def create_product(
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    slug = prod_in.slug or slugify(prod_in.name)
    existing = db.query(Product).filter((Product.name == prod_in.name) | (Product.slug == slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Product with this name or slug already exists")

    product = Product(
        name=prod_in.name,
        slug=slug,
        description=prod_in.description,
        status=prod_in.status
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    log_activity(
        db=db,
        action="product_created",
        entity_type="product",
        entity_id=str(product.id),
        actor_id=current_user.id,
        actor_email=current_user.email,
        metadata={"name": product.name, "slug": product.slug}
    )

    return {
        "id": product.id,
        "name": product.name,
        "slug": product.slug,
        "description": product.description,
        "status": product.status,
        "created_at": product.created_at,
        "updated_at": product.updated_at,
        "total_contacts": 0,
        "active_subscribers": 0,
        "unsubscribed_count": 0
    }

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    total = db.query(Subscription).filter(Subscription.product_id == p.id).count()
    active = db.query(Subscription).filter(
        Subscription.product_id == p.id,
        Subscription.status == "subscribed"
    ).count()
    unsub = db.query(Subscription).filter(
        Subscription.product_id == p.id,
        Subscription.status == "unsubscribed"
    ).count()

    return {
        "id": p.id,
        "name": p.name,
        "slug": p.slug,
        "description": p.description,
        "status": p.status,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
        "total_contacts": total,
        "active_subscribers": active,
        "unsubscribed_count": unsub
    }

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    prod_in: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    p = db.query(Product).filter(Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    if prod_in.name is not None:
        p.name = prod_in.name
    if prod_in.description is not None:
        p.description = prod_in.description
    if prod_in.status is not None:
        p.status = prod_in.status
    p.updated_at = datetime.now(timezone.utc)
    db.commit()

    log_activity(
        db=db,
        action="product_updated",
        entity_type="product",
        entity_id=str(p.id),
        actor_id=current_user.id,
        actor_email=current_user.email
    )

    return get_product(p.id, db, current_user)

@router.get("/{product_id}/subscribers")
def get_product_subscribers(
    product_id: int,
    status: Optional[str] = Query("subscribed"),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    query = db.query(Subscription).filter(Subscription.product_id == product_id)
    if status:
        query = query.filter(Subscription.status == status)

    subs = query.all()
    subscribers = []
    for s in subs:
        c = s.contact
        is_suppressed = db.query(SuppressionRecord).filter(
            SuppressionRecord.normalized_email == c.normalized_email,
            SuppressionRecord.scope == "global"
        ).first() is not None

        subscribers.append({
            "subscription_id": s.id,
            "contact_id": c.id,
            "full_name": c.full_name,
            "email": c.normalized_email,
            "company": c.company,
            "status": s.status,
            "consent_date": s.consent_date,
            "consent_source": s.consent_source,
            "unsubscribed_at": s.unsubscribed_at,
            "is_globally_suppressed": is_suppressed
        })

    return {
        "product_id": product.id,
        "product_name": product.name,
        "count": len(subscribers),
        "subscribers": subscribers
    }
