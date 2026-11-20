from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Auth & User schemas
class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "marketing_manager"  # admin, marketing_manager, analyst

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Product schemas
class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class ProductResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    total_contacts: Optional[int] = 0
    active_subscribers: Optional[int] = 0
    unsubscribed_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

# Contact schemas
class ContactCreate(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    country: Optional[str] = None
    lead_source: str = "manual"
    product_interests: Optional[List[int]] = []
    consent_given: bool = False
    consent_source: Optional[str] = "manual_entry"

class ContactUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    country: Optional[str] = None

class SubscriptionBrief(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_slug: str
    status: str
    consent_date: Optional[datetime] = None
    consent_source: Optional[str] = None
    unsubscribed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class InquiryBrief(BaseModel):
    id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    source: str
    message: Optional[str] = None
    consent_given: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ConsentEventBrief(BaseModel):
    id: int
    product_id: Optional[int] = None
    event_type: str
    consent_source: Optional[str] = None
    consent_method: Optional[str] = None
    event_timestamp: datetime
    evidence_reference: Optional[str] = None
    
    class Config:
        from_attributes = True

class ContactResponse(BaseModel):
    id: int
    full_name: str
    normalized_email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    designation: Optional[str] = None
    country: Optional[str] = None
    lead_source: str
    created_at: datetime
    updated_at: datetime
    is_globally_suppressed: bool = False
    subscriptions: List[SubscriptionBrief] = []
    
    class Config:
        from_attributes = True

class ContactDetailResponse(ContactResponse):
    inquiries: List[InquiryBrief] = []
    consent_events: List[ConsentEventBrief] = []
    campaign_history: List[Dict[str, Any]] = []

# Public Inquiry schema
class PublicInquiryCreate(BaseModel):
    full_name: str
    email: str
    company: Optional[str] = None
    designation: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    product_id: Optional[int] = None
    product_slug: Optional[str] = None
    message: Optional[str] = None
    marketing_consent: bool = False
    privacy_policy_accepted: bool = True

class InquiryResponse(BaseModel):
    id: int
    contact_id: int
    contact_name: str
    contact_email: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    source: str
    message: Optional[str] = None
    consent_given: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

# Campaign Schemas
class CampaignCreate(BaseModel):
    name: str
    product_id: int
    subject: str
    html_content: str
    text_content: Optional[str] = None
    schedule_time: Optional[datetime] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    schedule_time: Optional[datetime] = None

class CampaignRecipientResponse(BaseModel):
    id: int
    contact_id: int
    contact_name: str
    contact_email: str
    company: Optional[str] = None
    status: str
    provider_message_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    events_count: int = 0
    
    class Config:
        from_attributes = True

class CampaignResponse(BaseModel):
    id: int
    name: str
    product_id: int
    product_name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    status: str
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    eligible_count: Optional[int] = 0
    recipients_count: Optional[int] = 0
    sent_count: Optional[int] = 0
    delivered_count: Optional[int] = 0
    opened_count: Optional[int] = 0
    clicked_count: Optional[int] = 0
    bounced_count: Optional[int] = 0
    unsubscribed_count: Optional[int] = 0
    
    class Config:
        from_attributes = True

# Audience check response
class AudienceCheckResponse(BaseModel):
    product_id: int
    product_name: str
    total_contacts: int
    eligible_count: int
    excluded_count: int
    exclusion_reasons: Dict[str, int]
    sample_recipients: List[Dict[str, Any]]

# Email Template Schemas
class TemplateCreate(BaseModel):
    name: str
    product_id: Optional[int] = None
    subject: str
    html_content: str
    text_content: Optional[str] = None

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    product_id: Optional[int] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None

class TemplateResponse(BaseModel):
    id: int
    name: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    subject: str
    html_content: str
    text_content: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TemplatePreviewRequest(BaseModel):
    html_content: str
    subject: str
    sample_contact_id: Optional[int] = None
    product_id: Optional[int] = None

class TemplatePreviewResponse(BaseModel):
    rendered_subject: str
    rendered_html: str
    rendered_text: str
    variables_used: List[str]

# Unsubscribe Schemas
class UnsubscribeTokenVerifyResponse(BaseModel):
    valid: bool
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    is_globally_suppressed: bool = False
    is_product_unsubscribed: bool = False

class UnsubscribeExecuteRequest(BaseModel):
    scope: str = "product"  # "product" or "global"
    reason: Optional[str] = "User requested unsubscribe"

class UnsubscribeExecuteResponse(BaseModel):
    success: bool
    message: str
    contact_email: str
    scope: str
    product_name: Optional[str] = None

# Webhook schema
class ProviderWebhookPayload(BaseModel):
    event_id: str
    event_type: str  # delivered, open, click, bounce, unsubscribe, complaint
    message_id: Optional[str] = None
    recipient_email: str
    timestamp: Optional[datetime] = None
    data: Optional[Dict[str, Any]] = None

# CSV Import Schemas
class CSVPreviewRow(BaseModel):
    row_number: int
    raw_data: Dict[str, Any]
    detected_email: Optional[str] = None
    is_valid_email: bool = True
    is_duplicate: bool = False
    is_suppressed: bool = False
    validation_errors: List[str] = []

class CSVPreviewResponse(BaseModel):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    duplicate_rows: int
    suppressed_rows: int
    columns_detected: List[str]
    sample_rows: List[CSVPreviewRow]

class CSVImportExecuteRequest(BaseModel):
    column_mapping: Dict[str, str]  # e.g., {"Full Name": "full_name", "Email": "email"}
    default_product_id: Optional[int] = None
    lead_source: str = "csv_import"
    import_consent: bool = False
    consent_source: Optional[str] = "Imported Lead List"
    update_existing: bool = True

class CSVImportResultResponse(BaseModel):
    job_id: int
    total_rows: int
    successful_rows: int
    updated_rows: int
    skipped_rows: int
    suppressed_rows: int
    failed_rows: int
    error_summary: Optional[str] = None

# Activity Log Schema
class ActivityLogResponse(BaseModel):
    id: int
    actor_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Analytics Schemas
class OverviewKPIs(BaseModel):
    total_contacts: int
    new_leads_this_month: int
    active_subscribers: int
    unsubscribed_contacts: int
    globally_suppressed_contacts: int
    total_campaigns: int
    emails_sent: int
    delivered_count: int
    delivery_rate: float

class AnalyticsOverviewResponse(BaseModel):
    kpis: OverviewKPIs
    leads_over_time: List[Dict[str, Any]]
    leads_by_source: List[Dict[str, Any]]
    subscribers_by_product: List[Dict[str, Any]]
    campaign_performance: List[Dict[str, Any]]
    email_delivery_trends: List[Dict[str, Any]]
    unsubscribe_trends: List[Dict[str, Any]]
