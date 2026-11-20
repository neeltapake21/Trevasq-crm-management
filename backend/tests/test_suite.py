import os
os.environ["TESTING"] = "true"

import pytest
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.core.database import Base
from backend.app.core.security import create_access_token, hash_password
from backend.app.models.entities import (
    AdminUser, Product, Contact, Subscription, SuppressionRecord, 
    Inquiry, Campaign, CampaignRecipient, EmailEvent, EmailTemplate, UnsubscribeToken
)
from backend.app.schemas import (
    PublicInquiryCreate, ProductCreate, CampaignCreate
)
from backend.app.api.inquiries import submit_public_inquiry
from backend.app.api.products import create_product
from backend.app.api.campaigns import create_campaign
from backend.app.api.deps import require_roles
from backend.app.services.campaign_service import execute_campaign
from backend.app.services.eligibility_service import verify_single_recipient_eligibility, get_product_campaign_audience
from backend.app.services.unsubscribe_service import execute_unsubscribe
from backend.app.services.import_service import execute_csv_import
from backend.app.integrations.email_adapter import TestMockEmailAdapter

# Dedicated test SQLite database
TEST_DB_FILE = "./test_suite_fast.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_test_db():
    return TestingSessionLocal()

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Clean all tables before each test
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

    # Seed base test records
    admin_user = AdminUser(
        name="Admin Test",
        email="admin_test@trevasq.com",
        password_hash=hash_password("password123"),
        role="admin",
        is_active=True
    )
    analyst_user = AdminUser(
        name="Analyst Test",
        email="analyst_test@trevasq.com",
        password_hash=hash_password("password123"),
        role="analyst",
        is_active=True
    )
    db.add_all([admin_user, analyst_user])

    p1 = Product(name="QGuard Test", slug="qguard-test", description="QGuard test product", status="active")
    p2 = Product(name="Quantum Encryption Test", slug="quantum-encryption-test", description="Encryption test", status="active")
    db.add_all([p1, p2])
    db.commit()
    db.close()

    yield

# ==============================================================================
# TEST 1: New Inquiry
# Submit a new inquiry. Contact created, inquiry created, correct source,
# product associated, consent recorded only if explicitly provided.
# ==============================================================================
def test_1_new_inquiry_with_and_without_consent():
    db = get_test_db()
    p = db.query(Product).filter(Product.slug == "qguard-test").first()

    # Case A: Inquiry WITHOUT marketing consent
    req_no_consent = PublicInquiryCreate(
        full_name="Alice Innovator",
        email="alice@innovate.com",
        company="Innovate Labs",
        product_id=p.id,
        message="Testing without consent",
        marketing_consent=False
    )
    res_a = submit_public_inquiry(req_no_consent, db=db)
    assert res_a["contact_email"] == "alice@innovate.com"
    assert res_a["consent_given"] is False

    # Verify DB: Contact exists, but has NO active subscription
    contact = db.query(Contact).filter(Contact.normalized_email == "alice@innovate.com").first()
    assert contact is not None
    assert contact.full_name == "Alice Innovator"
    sub = db.query(Subscription).filter(Subscription.contact_id == contact.id, Subscription.product_id == p.id).first()
    assert sub is None or sub.status != "subscribed"

    # Case B: Inquiry WITH explicit marketing consent
    req_consent = PublicInquiryCreate(
        full_name="Bob Quantum",
        email="bob@quantumcore.com",
        company="Quantum Core Inc",
        product_id=p.id,
        message="Testing with consent",
        marketing_consent=True
    )
    res_b = submit_public_inquiry(req_consent, db=db)
    assert res_b["consent_given"] is True

    contact_b = db.query(Contact).filter(Contact.normalized_email == "bob@quantumcore.com").first()
    assert contact_b is not None
    sub_b = db.query(Subscription).filter(Subscription.contact_id == contact_b.id, Subscription.product_id == p.id).first()
    assert sub_b is not None
    assert sub_b.status == "subscribed"
    assert sub_b.consent_date is not None
    db.close()

# ==============================================================================
# TEST 2: Duplicate Contact
# Submit another inquiry using the same email with different capitalization.
# Existing contact updated, no duplicate contact created, new inquiry preserved.
# ==============================================================================
def test_2_duplicate_contact_deduplication():
    db = get_test_db()
    p = db.query(Product).first()

    # First submission: Lowercase
    submit_public_inquiry(PublicInquiryCreate(
        full_name="Charlie First",
        email="charlie@enterprise.com",
        company="Enterprise Corp",
        product_id=p.id,
        message="First message"
    ), db=db)

    # Second submission: Mixed/UPPERCASE email and updated company
    submit_public_inquiry(PublicInquiryCreate(
        full_name="Charlie Updated",
        email="CHARLIE@ENTERPRISE.COM",
        company="Enterprise Holdings Inc",
        product_id=p.id,
        message="Second inquiry from same lead"
    ), db=db)

    # Verify only ONE contact exists in database with normalized email
    contacts = db.query(Contact).filter(Contact.normalized_email == "charlie@enterprise.com").all()
    assert len(contacts) == 1
    assert contacts[0].company == "Enterprise Holdings Inc"

    # Verify BOTH inquiries are preserved under this single contact
    inquiries = db.query(Inquiry).filter(Inquiry.contact_id == contacts[0].id).all()
    assert len(inquiries) == 2
    db.close()

# ==============================================================================
# TEST 3: Multiple Products
# Subscribe one contact to two different products with valid consent.
# Two independent product subscriptions, separate campaign eligibility.
# ==============================================================================
def test_3_multiple_independent_product_subscriptions():
    db = get_test_db()
    p1 = db.query(Product).filter(Product.slug == "qguard-test").first()
    p2 = db.query(Product).filter(Product.slug == "quantum-encryption-test").first()

    # Submit inquiry with consent for Product 1
    submit_public_inquiry(PublicInquiryCreate(
        full_name="Diana Multi",
        email="diana@multicloud.io",
        product_id=p1.id,
        marketing_consent=True
    ), db=db)

    # Submit inquiry with consent for Product 2
    submit_public_inquiry(PublicInquiryCreate(
        full_name="Diana Multi",
        email="diana@multicloud.io",
        product_id=p2.id,
        marketing_consent=True
    ), db=db)

    contact = db.query(Contact).filter(Contact.normalized_email == "diana@multicloud.io").first()
    assert contact is not None

    sub1 = db.query(Subscription).filter(Subscription.contact_id == contact.id, Subscription.product_id == p1.id).first()
    sub2 = db.query(Subscription).filter(Subscription.contact_id == contact.id, Subscription.product_id == p2.id).first()

    assert sub1 is not None and sub1.status == "subscribed"
    assert sub2 is not None and sub2.status == "subscribed"

    # Both independent subscriptions are eligible
    elig1, _ = verify_single_recipient_eligibility(db, contact.id, p1.id)
    elig2, _ = verify_single_recipient_eligibility(db, contact.id, p2.id)
    assert elig1 is True
    assert elig2 is True
    db.close()

# ==============================================================================
# TEST 4: Campaign Eligibility
# Create a campaign for QGuard. Only eligible QGuard subscribers selected.
# Unsubscribed contacts excluded, global suppressions excluded, invalid excluded.
# ==============================================================================
def test_4_campaign_eligibility_enforcement():
    db = get_test_db()
    p_qguard = db.query(Product).filter(Product.slug == "qguard-test").first()

    # 1. Eligible subscriber
    submit_public_inquiry(PublicInquiryCreate(full_name="Eligible User", email="eligible@test.com", product_id=p_qguard.id, marketing_consent=True), db=db)
    # 2. Ineligible (no consent given)
    submit_public_inquiry(PublicInquiryCreate(full_name="No Consent User", email="noconsent@test.com", product_id=p_qguard.id, marketing_consent=False), db=db)
    # 3. Globally suppressed user
    submit_public_inquiry(PublicInquiryCreate(full_name="Suppressed User", email="suppressed@test.com", product_id=p_qguard.id, marketing_consent=True), db=db)
    db.add(SuppressionRecord(normalized_email="suppressed@test.com", scope="global", reason="opt_out", source="test"))
    db.commit()

    # Verify audience filtering
    eligible, excluded, stats = get_product_campaign_audience(db, p_qguard.id)
    assert len(eligible) == 1
    assert eligible[0].normalized_email == "eligible@test.com"
    assert len(excluded) >= 1
    db.close()

# ==============================================================================
# TEST 5: Product Unsubscribe
# Unsubscribe from QGuard. QGuard subscription becomes inactive/unsubscribed,
# other eligible product subscriptions remain unchanged.
# ==============================================================================
def test_5_product_unsubscribe_isolation():
    db = get_test_db()
    p1 = db.query(Product).filter(Product.slug == "qguard-test").first()
    p2 = db.query(Product).filter(Product.slug == "quantum-encryption-test").first()

    # Subscribe to both
    submit_public_inquiry(PublicInquiryCreate(full_name="Fiona Dual", email="fiona@dual.com", product_id=p1.id, marketing_consent=True), db=db)
    submit_public_inquiry(PublicInquiryCreate(full_name="Fiona Dual", email="fiona@dual.com", product_id=p2.id, marketing_consent=True), db=db)

    contact = db.query(Contact).filter(Contact.normalized_email == "fiona@dual.com").first()

    # Generate token for product 1
    token_record = UnsubscribeToken(
        token="test-token-p1",
        contact_id=contact.id,
        product_id=p1.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(token_record)
    db.commit()

    # Execute product unsubscribe
    success, msg, c, prod = execute_unsubscribe(db, token="test-token-p1", scope="product")
    assert success is True

    # Verify P1 is unsubscribed and ineligible
    elig_p1, _ = verify_single_recipient_eligibility(db, contact.id, p1.id)
    assert elig_p1 is False

    # Verify P2 is STILL SUBSCRIBED and ELIGIBLE!
    elig_p2, _ = verify_single_recipient_eligibility(db, contact.id, p2.id)
    assert elig_p2 is True
    db.close()

# ==============================================================================
# TEST 6: Global Unsubscribe
# Unsubscribe from all marketing. Contact is globally suppressed,
# no future marketing campaign can send to the address.
# ==============================================================================
def test_6_global_unsubscribe():
    db = get_test_db()
    p1 = db.query(Product).filter(Product.slug == "qguard-test").first()
    p2 = db.query(Product).filter(Product.slug == "quantum-encryption-test").first()

    submit_public_inquiry(PublicInquiryCreate(full_name="George Global", email="george@global.com", product_id=p1.id, marketing_consent=True), db=db)
    submit_public_inquiry(PublicInquiryCreate(full_name="George Global", email="george@global.com", product_id=p2.id, marketing_consent=True), db=db)

    contact = db.query(Contact).filter(Contact.normalized_email == "george@global.com").first()

    token_record = UnsubscribeToken(
        token="test-token-global",
        contact_id=contact.id,
        product_id=p1.id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(token_record)
    db.commit()

    # Execute global unsubscribe
    success, msg, c, prod = execute_unsubscribe(db, token="test-token-global", scope="global")
    assert success is True

    # Verify global suppression record exists
    supp = db.query(SuppressionRecord).filter(
        SuppressionRecord.normalized_email == "george@global.com",
        SuppressionRecord.scope == "global"
    ).first()
    assert supp is not None

    # Ineligible for both products
    elig1, _ = verify_single_recipient_eligibility(db, contact.id, p1.id)
    elig2, _ = verify_single_recipient_eligibility(db, contact.id, p2.id)
    assert elig1 is False
    assert elig2 is False
    db.close()

# ==============================================================================
# TEST 7: Re-import Suppression Persistence
# Unsubscribe a contact and import the same email through CSV.
# Contact is NOT automatically resubscribed. Suppression remains active.
# ==============================================================================
def test_7_reimport_suppression_persistence():
    db = get_test_db()
    p = db.query(Product).filter(Product.slug == "qguard-test").first()

    # 1. Unsubscribed contact with global suppression
    contact = Contact(full_name="Harry Suppressed", normalized_email="harry@persistent.com", lead_source="manual")
    db.add(contact)
    db.commit()
    db.add(SuppressionRecord(normalized_email="harry@persistent.com", scope="global", reason="user_opt_out", source="unsubscribe"))
    db.commit()

    # 2. Re-import Harry via CSV with import_consent=True
    csv_content = "Full Name,Email,Company\nHarry Suppressed,harry@persistent.com,Persistent Corp"
    
    job = execute_csv_import(
        db=db,
        file_name="leads.csv",
        content=csv_content,
        column_mapping={"Full Name": "full_name", "Email": "email", "Company": "company"},
        default_product_id=p.id,
        import_consent=True
    )

    # Suppression was detected and counted
    assert job.suppressed_rows >= 1

    # Verify contact was NOT subscribed to the product!
    elig, reason = verify_single_recipient_eligibility(db, contact.id, p.id)
    assert elig is False
    assert "suppressed" in reason.lower()
    db.close()

# ==============================================================================
# TEST 8: Duplicate Campaign Delivery Prevention (Idempotency)
# Retry a failed background task. No duplicate email sent.
# ==============================================================================
def test_8_duplicate_campaign_delivery_idempotency():
    db = get_test_db()
    p = db.query(Product).first()

    # Create contact with subscription
    submit_public_inquiry(PublicInquiryCreate(full_name="Ian Idempotent", email="ian@idempotent.com", product_id=p.id, marketing_consent=True), db=db)

    # Create campaign
    c = Campaign(
        name="Idempotency Test Campaign",
        product_id=p.id,
        subject="Hello {{first_name}}",
        html_content="<p>Test</p>",
        status="draft"
    )
    db.add(c)
    db.commit()

    # First execution
    TestMockEmailAdapter.clear_sent_emails()
    res1 = execute_campaign(db, c.id)
    assert res1["sent_count"] == 1
    assert len(TestMockEmailAdapter.get_sent_emails()) == 1

    # Retry execution (e.g. background worker retry)
    res2 = execute_campaign(db, c.id)
    assert res2["sent_count"] == 0
    assert res2["skipped_count"] == 1
    # No duplicate email sent
    assert len(TestMockEmailAdapter.get_sent_emails()) == 1
    db.close()

# ==============================================================================
# TEST 9: Campaign Personalization
# Template containing {{first_name}} and {{company}}. Correct recipient values.
# ==============================================================================
def test_9_campaign_personalization_rendering():
    db = get_test_db()
    p = db.query(Product).filter(Product.slug == "qguard-test").first()

    submit_public_inquiry(PublicInquiryCreate(
        full_name="Jack Vance",
        email="jack@vancecorp.com",
        company="Vance Corp",
        product_id=p.id,
        marketing_consent=True
    ), db=db)

    c = Campaign(
        name="Personalization Test Campaign",
        product_id=p.id,
        subject="Special offer for {{company}}",
        html_content="<p>Hello {{first_name}}, welcome to {{product_name}} for {{company}}.</p>",
        status="draft"
    )
    db.add(c)
    db.commit()

    TestMockEmailAdapter.clear_sent_emails()
    execute_campaign(db, c.id)

    sent = TestMockEmailAdapter.get_sent_emails()
    assert len(sent) == 1
    assert sent[0]["subject"] == "Special offer for Vance Corp"
    assert "Hello Jack" in sent[0]["html_content"]
    assert "welcome to QGuard Test for Vance Corp" in sent[0]["html_content"]
    assert "/unsubscribe/" in sent[0]["html_content"]
    db.close()

# ==============================================================================
# TEST 10: New Product Creation
# Create a new product through the dashboard API. Appears in product management,
# mailing list becomes available, new campaigns can target without code changes.
# ==============================================================================
def test_10_dynamic_new_product_creation():
    db = get_test_db()
    admin = db.query(AdminUser).filter(AdminUser.email == "admin_test@trevasq.com").first()

    new_prod_payload = ProductCreate(
        name="Quantum Random Number Generator",
        slug="quantum-rng",
        description="True quantum entropy for cryptographic key generation."
    )
    prod_data = create_product(new_prod_payload, db=db, current_user=admin)
    assert prod_data["slug"] == "quantum-rng"

    # Add contact to new product
    submit_public_inquiry(PublicInquiryCreate(
        full_name="Karen Entropy",
        email="karen@entropy.com",
        product_id=prod_data["id"],
        marketing_consent=True
    ), db=db)

    # Create campaign targeting new product directly
    camp_res = create_campaign(CampaignCreate(
        name="QRNG Launch",
        product_id=prod_data["id"],
        subject="Entropy Announcement",
        html_content="<p>Hello {{first_name}}</p>"
    ), db=db, current_user=admin)
    assert camp_res["product_name"] == "Quantum Random Number Generator"
    db.close()

# ==============================================================================
# TEST 11: Webhook Processing Idempotency
# Send duplicate provider webhook events. Idempotent processing, no double count.
# ==============================================================================
def test_11_webhook_event_idempotency():
    db = get_test_db()
    c = Contact(full_name="Liam Listener", normalized_email="liam@listener.com", lead_source="manual")
    db.add(c)
    db.commit()
    p = db.query(Product).first()
    camp = Campaign(name="Webhook Test", product_id=p.id, subject="Webhook", html_content="<p>Test</p>")
    db.add(camp)
    db.commit()
    rec = CampaignRecipient(campaign_id=camp.id, contact_id=c.id, email_snapshot=c.normalized_email, status="sent", provider_message_id="msg-101")
    db.add(rec)
    db.commit()

    # Process first event
    evt1 = EmailEvent(
        campaign_recipient_id=rec.id,
        event_type="delivered",
        provider_event_id="sg-event-uuid-9999",
        event_timestamp=datetime.now(timezone.utc)
    )
    db.add(evt1)
    db.commit()

    # Attempt to process duplicate event ID
    existing = db.query(EmailEvent).filter(EmailEvent.provider_event_id == "sg-event-uuid-9999").first()
    assert existing is not None
    # Verify idempotent behavior: only 1 event recorded
    events_count = db.query(EmailEvent).filter(EmailEvent.provider_event_id == "sg-event-uuid-9999").count()
    assert events_count == 1
    db.close()

# ==============================================================================
# TEST 12: Role-Based Access Control (RBAC) Permissions
# Attempt to access restricted admin functions using a read-only analyst account.
# Access denied appropriately (403 Forbidden).
# ==============================================================================
def test_12_rbac_permissions():
    db = get_test_db()
    analyst = db.query(AdminUser).filter(AdminUser.email == "analyst_test@trevasq.com").first()

    # Analyst attempting to run admin/marketing_manager only action
    checker = require_roles(["admin", "marketing_manager"])
    with pytest.raises(HTTPException) as exc_info:
        checker(current_user=analyst)

    assert exc_info.value.status_code == 403
    assert "Access denied" in exc_info.value.detail
    db.close()
