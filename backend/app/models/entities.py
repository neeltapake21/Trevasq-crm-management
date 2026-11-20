from datetime import datetime, timezone
import uuid
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, ForeignKey, 
    UniqueConstraint, Index, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def utc_now():
    return datetime.now(timezone.utc)

class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="admin", nullable=False)  # admin, marketing_manager, analyst
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    activity_logs = relationship("ActivityLog", back_populates="actor")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    slug = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, inactive
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    inquiries = relationship("Inquiry", back_populates="product")
    subscriptions = relationship("Subscription", back_populates="product")
    campaigns = relationship("Campaign", back_populates="product")
    templates = relationship("EmailTemplate", back_populates="product")

class Contact(Base):
    __tablename__ = "contacts"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    normalized_email = Column(String(255), unique=True, index=True, nullable=False)
    phone = Column(String(50), nullable=True)
    company = Column(String(255), nullable=True)
    designation = Column(String(255), nullable=True)
    country = Column(String(100), nullable=True)
    lead_source = Column(String(100), default="website", nullable=False)  # website, product_form, csv_import, manual, api
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    inquiries = relationship("Inquiry", back_populates="contact", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="contact", cascade="all, delete-orphan")
    campaign_recipients = relationship("CampaignRecipient", back_populates="contact")
    consent_events = relationship("ConsentEvent", back_populates="contact", cascade="all, delete-orphan")
    unsubscribe_tokens = relationship("UnsubscribeToken", back_populates="contact", cascade="all, delete-orphan")

class Inquiry(Base):
    __tablename__ = "inquiries"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    source = Column(String(100), default="website_inquiry", nullable=False)
    message = Column(Text, nullable=True)
    consent_given = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    contact = relationship("Contact", back_populates="inquiries")
    product = relationship("Product", back_populates="inquiries")

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="subscribed", nullable=False)  # subscribed, unsubscribed, pending, not_subscribed, suppressed
    consent_date = Column(DateTime, nullable=True)
    consent_source = Column(String(100), nullable=True)
    consent_method = Column(String(100), nullable=True)
    unsubscribed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    contact = relationship("Contact", back_populates="subscriptions")
    product = relationship("Product", back_populates="subscriptions")
    
    __table_args__ = (
        UniqueConstraint("contact_id", "product_id", name="uq_contact_product_subscription"),
    )

class SuppressionRecord(Base):
    __tablename__ = "suppression_records"
    
    id = Column(Integer, primary_key=True, index=True)
    normalized_email = Column(String(255), index=True, nullable=False)
    scope = Column(String(50), default="global", nullable=False)  # global, product
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    reason = Column(String(255), nullable=True)  # user_unsubscribed, admin_suppressed, complaint, hard_bounce
    source = Column(String(100), default="unsubscribe_link", nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    product = relationship("Product")
    
    __table_args__ = (
        Index("ix_suppression_email_scope", "normalized_email", "scope"),
        Index("ix_suppression_email_product", "normalized_email", "product_id"),
    )

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(255), nullable=False)
    html_content = Column(Text, nullable=False)
    text_content = Column(Text, nullable=True)
    status = Column(String(50), default="draft", nullable=False)  # draft, scheduled, processing, sent, paused, failed, cancelled
    scheduled_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    product = relationship("Product", back_populates="campaigns")
    recipients = relationship("CampaignRecipient", back_populates="campaign", cascade="all, delete-orphan")

class CampaignRecipient(Base):
    __tablename__ = "campaign_recipients"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    email_snapshot = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, sent, delivered, bounced, failed
    provider_message_id = Column(String(255), nullable=True, index=True)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    campaign = relationship("Campaign", back_populates="recipients")
    contact = relationship("Contact", back_populates="campaign_recipients")
    events = relationship("EmailEvent", back_populates="recipient", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint("campaign_id", "contact_id", name="uq_campaign_contact_recipient"),
    )

class EmailEvent(Base):
    __tablename__ = "email_events"
    
    id = Column(Integer, primary_key=True, index=True)
    campaign_recipient_id = Column(Integer, ForeignKey("campaign_recipients.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False)  # sent, delivered, opened, clicked, bounced, complaint, unsubscribed
    provider_event_id = Column(String(255), unique=True, index=True, nullable=True)  # for webhook idempotency!
    event_timestamp = Column(DateTime, default=utc_now, nullable=False)
    event_data = Column(Text, nullable=True)
    
    recipient = relationship("CampaignRecipient", back_populates="events")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True, index=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    metadata_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    
    actor = relationship("AdminUser", back_populates="activity_logs")

class ImportJob(Base):
    __tablename__ = "import_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    status = Column(String(50), default="pending", nullable=False)  # pending, processing, completed, failed
    total_rows = Column(Integer, default=0, nullable=False)
    successful_rows = Column(Integer, default=0, nullable=False)
    updated_rows = Column(Integer, default=0, nullable=False)
    skipped_rows = Column(Integer, default=0, nullable=False)
    suppressed_rows = Column(Integer, default=0, nullable=False)
    failed_rows = Column(Integer, default=0, nullable=False)
    error_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    completed_at = Column(DateTime, nullable=True)

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True, index=True)
    subject = Column(String(255), nullable=False)
    html_content = Column(Text, nullable=False)
    text_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    
    product = relationship("Product", back_populates="templates")

class ConsentEvent(Base):
    __tablename__ = "consent_events"
    
    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type = Column(String(50), nullable=False)  # consent_given, consent_withdrawn, opt_out, import_declared
    consent_source = Column(String(100), nullable=True)
    consent_method = Column(String(100), nullable=True)
    event_timestamp = Column(DateTime, default=utc_now, nullable=False)
    evidence_reference = Column(Text, nullable=True)
    
    contact = relationship("Contact", back_populates="consent_events")

class UnsubscribeToken(Base):
    __tablename__ = "unsubscribe_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    token = Column(String(128), unique=True, index=True, nullable=False)
    contact_id = Column(Integer, ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=True, index=True)  # None = global link
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    used_at = Column(DateTime, nullable=True)
    
    contact = relationship("Contact", back_populates="unsubscribe_tokens")
