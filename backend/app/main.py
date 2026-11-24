import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.seed_data import seed_database
from backend.app.workers.scheduler import start_scheduler, shutdown_scheduler

# Import API routers
from backend.app.api.auth import router as auth_router
from backend.app.api.contacts import router as contacts_router
from backend.app.api.inquiries import router as inquiries_router
from backend.app.api.products import router as products_router
from backend.app.api.campaigns import router as campaigns_router
from backend.app.api.templates import router as templates_router
from backend.app.api.imports import router as imports_router
from backend.app.api.unsubscribe import router as unsubscribe_router
from backend.app.api.webhooks import router as webhooks_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.activity import router as activity_router
from backend.app.api.users import router as users_router
from backend.app.api.settings import router as settings_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("trevasq.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Run schema creation & seed database
    logger.info("Initializing TrevasQ database schema...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        logger.info("Seeding initial TrevasQ dataset...")
        seed_database(db)
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

    if not os.environ.get("TESTING") and not os.environ.get("VERCEL"):
        try:
            start_scheduler()
        except Exception as e:
            logger.error(f"Error starting scheduler: {e}")

    yield

    if not os.environ.get("TESTING") and not os.environ.get("VERCEL"):
        shutdown_scheduler()

lifespan_handler = None if os.environ.get("TESTING") == "true" else lifespan

app = FastAPI(
    title="TrevasQ Automated Marketing Platform",
    description="Enterprise Lead Acquisition, CRM, Multi-Product Segmentation, Campaign Automation & Privacy Compliance Engine",
    version="1.0.0",
    lifespan=lifespan_handler
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(contacts_router, prefix="/api")
app.include_router(inquiries_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(campaigns_router, prefix="/api")
app.include_router(templates_router, prefix="/api")
app.include_router(imports_router, prefix="/api")
app.include_router(unsubscribe_router, prefix="/api")
app.include_router(webhooks_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(activity_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": "TrevasQ Automated Marketing Platform",
        "version": "1.0.0"
    }

@app.get("/")
def root():
    return {
        "name": "TrevasQ Automated Marketing & Lead Management API",
        "status": "online",
        "documentation": "/docs",
        "version": "1.0.0"
    }
