import logging
import threading
from datetime import datetime, timezone
from backend.app.core.database import SessionLocal
from backend.app.models.entities import Campaign
from backend.app.services.campaign_service import execute_campaign

logger = logging.getLogger("trevasq.scheduler")

_stop_event = threading.Event()
_worker_thread = None

def check_and_execute_scheduled_campaigns():
    """Checks for due scheduled campaigns and triggers background dispatch."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_campaigns = db.query(Campaign).filter(
            Campaign.status == "scheduled",
            Campaign.scheduled_at <= now
        ).all()

        for c in due_campaigns:
            logger.info(f"Triggering scheduled campaign ID {c.id}: {c.name}")
            try:
                execute_campaign(db, c.id)
            except Exception as e:
                logger.error(f"Error executing scheduled campaign {c.id}: {e}")
                c.status = "failed"
                db.commit()
    except Exception as e:
        logger.error(f"Scheduler execution error: {e}")
    finally:
        db.close()

def _scheduler_loop():
    logger.info("Background campaign scheduler loop running (10s interval)...")
    while not _stop_event.is_set():
        try:
            check_and_execute_scheduled_campaigns()
        except Exception as e:
            logger.error(f"Error in scheduler tick: {e}")
        # Wait for 10 seconds or until stopped
        _stop_event.wait(10)
    logger.info("Background campaign scheduler loop stopped.")

def start_scheduler():
    global _worker_thread
    if _worker_thread is None or not _worker_thread.is_alive():
        _stop_event.clear()
        _worker_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="CampaignSchedulerThread")
        _worker_thread.start()
        logger.info("Background campaign scheduler thread started")

def shutdown_scheduler():
    _stop_event.set()
    logger.info("Background campaign scheduler signal sent to stop")
