from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from backend.app.models.entities import SystemSetting
from backend.app.core.config import settings

SENSITIVE_KEYS = {
    "smtp_password",
    "sendgrid_api_key",
    "aws_secret_access_key",
    "mailgun_api_key",
    "secret_key"
}

DEFAULTS = {
    "email_provider": "smtp",
    "email_test_mode": "false",
    "email_from_address": "marketing@trevasq.com",
    "email_from_name": "TrevasQ Quantum Security",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": "587",
    "smtp_username": "",
    "smtp_password": "",
    "smtp_use_tls": "true",
    "sendgrid_api_key": "",
    "aws_region": "us-east-1",
    "aws_access_key_id": "",
    "aws_secret_access_key": "",
    "mailgun_api_key": "",
    "mailgun_domain": "",
    "frontend_url": "http://localhost:5173",
    "backend_url": "http://localhost:8000"
}

def get_setting_raw(db: Session, key: str, default: Optional[str] = None) -> str:
    """Retrieve raw setting value from database or fallback."""
    record = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if record and record.value is not None:
        return record.value
    
    # Fallback to settings config or defaults
    config_val = getattr(settings, key.upper(), None)
    if config_val is not None:
        if isinstance(config_val, bool):
            return "true" if config_val else "false"
        return str(config_val)
    
    return DEFAULTS.get(key, default or "")

def get_all_settings_dict(db: Session) -> Dict[str, Any]:
    """Return all system settings with sensitive keys masked for UI display."""
    result = {}
    for key in DEFAULTS.keys():
        val = get_setting_raw(db, key)
        if key == "email_test_mode" or key == "smtp_use_tls":
            result[key] = val.lower() == "true"
        elif key == "smtp_port":
            try:
                result[key] = int(val) if val else 587
            except ValueError:
                result[key] = 587
        elif key in SENSITIVE_KEYS:
            result[key] = "••••••••" if val else ""
            result[f"has_{key}"] = bool(val)
        else:
            result[key] = val

    return result

def update_system_settings_db(db: Session, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Persist updated settings to database."""
    now = datetime.now(timezone.utc)
    for key, raw_val in updates.items():
        if key not in DEFAULTS:
            continue
        
        # Don't overwrite existing sensitive password with masked string
        if key in SENSITIVE_KEYS and raw_val == "••••••••":
            continue

        if isinstance(raw_val, bool):
            str_val = "true" if raw_val else "false"
        elif raw_val is None:
            str_val = ""
        else:
            str_val = str(raw_val)

        record = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if record:
            record.value = str_val
            record.updated_at = now
        else:
            record = SystemSetting(
                key=key,
                value=str_val,
                updated_at=now
            )
            db.add(record)

        # Also reflect into in-memory settings
        attr_name = key.upper()
        if hasattr(settings, attr_name):
            if isinstance(getattr(settings, attr_name), bool):
                setattr(settings, attr_name, str_val.lower() == "true")
            elif isinstance(getattr(settings, attr_name), int):
                try:
                    setattr(settings, attr_name, int(str_val))
                except ValueError:
                    pass
            else:
                setattr(settings, attr_name, str_val)

    db.commit()
    return get_all_settings_dict(db)
