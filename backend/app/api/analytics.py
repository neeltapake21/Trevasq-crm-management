from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.schemas import AnalyticsOverviewResponse
from backend.app.api.deps import get_current_user
from backend.app.services.analytics_service import get_analytics_overview
from backend.app.models.entities import AdminUser

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_overview(
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Returns real computed KPI numbers and visualization breakdowns."""
    return get_analytics_overview(db)
