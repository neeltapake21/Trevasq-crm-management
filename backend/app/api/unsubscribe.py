from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas import (
    UnsubscribeTokenVerifyResponse, UnsubscribeExecuteRequest, UnsubscribeExecuteResponse
)
from backend.app.services.unsubscribe_service import verify_unsubscribe_token, execute_unsubscribe
from backend.app.models.entities import SuppressionRecord, Subscription

router = APIRouter(prefix="/unsubscribe", tags=["Unsubscribe"])

@router.get("/{token}", response_model=UnsubscribeTokenVerifyResponse)
def verify_token(token: str, db: Session = Depends(get_db)):
    """
    Public token verification endpoint.
    Returns contact and product details for rendering the unsubscribe preferences page.
    """
    is_valid, contact, product = verify_unsubscribe_token(db, token)
    if not is_valid or not contact:
        raise HTTPException(status_code=404, detail="Invalid or expired unsubscribe link")

    # Check suppression
    is_glob_supp = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == contact.normalized_email,
        SuppressionRecord.scope == "global"
    ).first() is not None

    is_prod_unsub = False
    if product:
        sub = db.query(Subscription).filter(
            Subscription.contact_id == contact.id,
            Subscription.product_id == product.id
        ).first()
        if sub and sub.status == "unsubscribed":
            is_prod_unsub = True

    return {
        "valid": True,
        "contact_name": contact.full_name,
        "contact_email": contact.normalized_email,
        "product_id": product.id if product else None,
        "product_name": product.name if product else None,
        "is_globally_suppressed": is_glob_supp,
        "is_product_unsubscribed": is_prod_unsub
    }

@router.post("/{token}", response_model=UnsubscribeExecuteResponse)
def perform_unsubscribe(
    token: str,
    payload: UnsubscribeExecuteRequest,
    db: Session = Depends(get_db)
):
    """
    Public unsubscribe execution endpoint.
    Supports product-specific and global unsubscribe without login.
    """
    success, message, contact, product = execute_unsubscribe(
        db=db,
        token=token,
        scope=payload.scope,
        reason=payload.reason or "User clicked unsubscribe"
    )

    if not success:
        raise HTTPException(status_code=400, detail=message)

    return {
        "success": True,
        "message": message,
        "contact_email": contact.normalized_email,
        "scope": payload.scope,
        "product_name": product.name if product else None
    }
