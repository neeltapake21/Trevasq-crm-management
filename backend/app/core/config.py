import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "TrevasQ Automated Marketing Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./trevasq.db"
    
    # Security
    SECRET_KEY: str = "trevasq-super-secret-key-change-in-production-2026"
    JWT_SECRET: str = "trevasq-jwt-secret-key-secure-random-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Email settings
    EMAIL_PROVIDER: str = "smtp"  # 'smtp', 'sendgrid', 'ses', 'mailgun', 'test'
    EMAIL_TEST_MODE: bool = False
    EMAIL_FROM_ADDRESS: str = "marketing@trevasq.com"
    EMAIL_FROM_NAME: str = "TrevasQ Marketing"
    
    # SMTP (defaulting to live SMTP)
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    
    # Provider API keys (optional)
    SENDGRID_API_KEY: Optional[str] = None
    AWS_SES_REGION: Optional[str] = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    MAILGUN_API_KEY: Optional[str] = None
    MAILGUN_DOMAIN: Optional[str] = None
    
    # URLs
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"
    UNSUBSCRIBE_BASE_URL: str = "http://localhost:5173/unsubscribe"
    
    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
