import json
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.app.models.entities import ActivityLog, AdminUser

def log_activity(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    actor_id: Optional[int] = None,
    actor_email: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityLog:
    """Centralized activity logging function."""
    metadata_str = json.dumps(metadata) if metadata else None
    log_entry = ActivityLog(
        actor_id=actor_id,
        actor_email=actor_email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        metadata_json=metadata_str
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry
