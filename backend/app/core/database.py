import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.core.config import settings

db_url = settings.DATABASE_URL
if os.environ.get("VERCEL"):
    tmp_db = "/tmp/trevasq.db"
    if not os.path.exists(tmp_db):
        for candidate in ["trevasq.db", "./trevasq.db", "../trevasq.db"]:
            if os.path.exists(candidate):
                try:
                    shutil.copy2(candidate, tmp_db)
                    break
                except Exception:
                    pass
    db_url = f"sqlite:///{tmp_db}"

connect_args = {}
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
