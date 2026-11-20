import json
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import ActivityLog, AdminUser
from backend.app.schemas import ActivityLogResponse
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])

@router.get("", response_model=List[ActivityLogResponse])
def list_activity_logs(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    logs = db.query(ActivityLog).order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit).all()
    result = []
    for l in logs:
        meta = None
        if l.metadata_json:
            try:
                meta = json.loads(l.metadata_json)
            except Exception:
                meta = {"raw": l.metadata_json}
        
        result.append({
            "id": l.id,
            "actor_email": l.actor_email or (l.actor.email if l.actor else "System"),
            "action": l.action,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "metadata": meta,
            "created_at": l.created_at
        })
    return result
