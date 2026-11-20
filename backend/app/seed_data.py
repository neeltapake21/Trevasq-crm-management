from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.core.security import hash_password, normalize_email
from backend.app.models.entities import (
    AdminUser, Product, Contact, Subscription, SuppressionRecord, 
    Inquiry, Campaign, CampaignRecipient, EmailEvent, EmailTemplate, ConsentEvent
)

def seed_database(db: Session):
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 1. Seed Admin Users
    admin_exists = db.query(AdminUser).filter(AdminUser.email == "admin@trevasq.com").first()
    if not admin_exists:
        users = [
            AdminUser(
                name="TrevasQ System Admin",
                email="admin@trevasq.com",
                password_hash=hash_password("TrevasQ@2026"),
                role="admin",
                is_active=True
            ),
            AdminUser(
                name="Marketing Manager",
                email="marketing@trevasq.com",
                password_hash=hash_password("TrevasQ@2026"),
                role="marketing_manager",
                is_active=True
            ),
            AdminUser(
                name="Data Analyst",
                email="analyst@trevasq.com",
                password_hash=hash_password("TrevasQ@2026"),
                role="analyst",
                is_active=True
            )
        ]
        db.add_all(users)
        db.commit()

    # 2. Seed Initial 6 Products
    initial_products = [
        ("QGuard", "qguard", "Quantum-resistant endpoint and perimeter security defense platform."),
        ("Quantum Cybersecurity", "quantum-cybersecurity", "Next-generation cryptographic security architecture for enterprise infrastructures."),
        ("Quantum Readiness Assessment", "quantum-readiness-assessment", "Comprehensive algorithmic audit and vulnerability scan for post-quantum transition."),
        ("Quantum Digital Signature", "quantum-digital-signature", "NIST-aligned lattice-based digital signatures guaranteeing long-term document authenticity."),
        ("Quantum Encryption", "quantum-encryption", "Symmetric and asymmetric post-quantum end-to-end data transmission encryption."),
        ("Quantum Hash", "quantum-hash", "Collision-resistant quantum-secure cryptographic hashing protocols.")
    ]

    product_map = {}
    for name, slug, desc in initial_products:
        p = db.query(Product).filter(Product.slug == slug).first()
        if not p:
            p = Product(name=name, slug=slug, description=desc, status="active")
            db.add(p)
            db.commit()
            db.refresh(p)
        product_map[slug] = p

    # 3. Seed Email Templates
    templates = [
        {
            "name": "Product Introduction – QGuard",
            "product_id": product_map["qguard"].id,
            "subject": "Strengthen {{company}}'s defenses with QGuard Post-Quantum Security",
            "html_content": """
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">TrevasQ Technologies</h1>
                </div>
                <div style="padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Hello {{first_name}},</h2>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                        As cryptographic attacks evolve toward quantum supremacy, classical perimeter solutions leave organizations vulnerable.
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                        At TrevasQ, our flagship <strong>{{product_name}}</strong> solution delivers active quantum-resistant endpoint protection tailored for organizations like <strong>{{company}}</strong>.
                    </p>
                    <div style="margin: 28px 0; text-align: center;">
                        <a href="https://trevasq.com/products/qguard" style="background: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Explore {{product_name}}</a>
                    </div>
                    <p style="font-size: 14px; line-height: 1.5; color: #64748b;">
                        Would you be open to a 15-minute briefing on quantum transition strategies for your technical team?
                    </p>
                    <p style="font-size: 14px; color: #334155; margin-top: 24px;">
                        Warm regards,<br>
                        <strong>TrevasQ Security Architecture Team</strong>
                    </p>
                </div>
            </div>
            """,
            "text_content": "Hello {{first_name}},\n\nProtect {{company}} with our {{product_name}} solution. Learn more at https://trevasq.com/products/qguard\n\nBest regards,\nTrevasQ Team"
        },
        {
            "name": "General – Quantum Readiness Assessment",
            "product_id": product_map["quantum-readiness-assessment"].id,
            "subject": "Is {{company}} prepared for the post-quantum deadline?",
            "html_content": """
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <div style="background-color: #1e1b4b; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px;">TrevasQ Quantum Readiness</h1>
                </div>
                <div style="padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #0f172a; font-size: 18px;">Dear {{full_name}},</h2>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                        Global compliance frameworks are accelerating post-quantum cryptography migration requirements.
                    </p>
                    <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                        Our <strong>{{product_name}}</strong> provides {{company}} with a comprehensive cryptographic inventory and transition roadmap.
                    </p>
                    <div style="margin: 28px 0; text-align: center;">
                        <a href="https://trevasq.com/assessment" style="background: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; display: inline-block;">Request Readiness Audit</a>
                    </div>
                    <p style="font-size: 14px; color: #64748b;">Best regards,<br>TrevasQ Team</p>
                </div>
            </div>
            """,
            "text_content": "Dear {{full_name}},\n\nPrepare {{company}} with {{product_name}}. Request an audit at https://trevasq.com/assessment\n\nBest,\nTrevasQ"
        },
        {
            "name": "Promotional – Quantum Encryption Feature Release",
            "product_id": product_map["quantum-encryption"].id,
            "subject": "New PQC Transport Architecture for {{company}}",
            "html_content": """
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
                <div style="background-color: #042f2e; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px;">TrevasQ Product Update</h1>
                </div>
                <div style="padding: 32px 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0 0 8px 8px;">
                    <h2>Hello {{first_name}},</h2>
                    <p>We are excited to share that TrevasQ has released our high-throughput <strong>{{product_name}}</strong> v3.2 kernel.</p>
                    <p>Specifically engineered for cloud environments at organizations like {{company}}.</p>
                    <p>Warm regards,<br>The TrevasQ Team</p>
                </div>
            </div>
            """,
            "text_content": "Hello {{first_name}},\n\nTrevasQ {{product_name}} v3.2 is now available for {{company}}.\n\nBest,\nTrevasQ Team"
        }
    ]

    for tmpl in templates:
        existing_t = db.query(EmailTemplate).filter(EmailTemplate.name == tmpl["name"]).first()
        if not existing_t:
            t_obj = EmailTemplate(
                name=tmpl["name"],
                product_id=tmpl["product_id"],
                subject=tmpl["subject"],
                html_content=tmpl["html_content"],
                text_content=tmpl["text_content"]
            )
            db.add(t_obj)
    db.commit()

    # 4. Seed Synthetic Contacts (At least 15 sample contacts with diverse statuses)
    raw_contacts = [
        ("Rahul Sharma", "rahul.sharma@abctech.com", "+91 9876543210", "ABC Technologies", "VP Engineering", "India", "website"),
        ("Priya Nair", "priya.nair@xyzsolutions.ae", "+971 50 1234567", "XYZ Solutions LLC", "Chief Information Security Officer", "United Arab Emirates", "product_form"),
        ("Alexander Wright", "a.wright@wrightdefense.co.uk", "+44 20 7946 0912", "Wright Defense Systems", "Head of Security Architecture", "United Kingdom", "website"),
        ("Fatima Al-Mansoor", "fatima.m@gulftelecom.qa", "+974 4412 3456", "Gulf Telecom Consortium", "Director of Infrastructure", "Qatar", "csv_import"),
        ("Carlos Mendes", "carlos.mendes@saopaulodata.br", "+55 11 9876 5432", "Sao Paulo Data Corp", "Lead Security Engineer", "Brazil", "website"),
        ("Elena Rostova", "elena.rostova@balticnordic.fi", "+358 40 1234567", "Baltic Nordic Bank", "VP Compliance & Risk", "Finland", "manual"),
        ("David Chen", "david.chen@singaporequantum.sg", "+65 6789 0123", "Singapore Quantum Labs", "Chief Technology Officer", "Singapore", "website"),
        ("Amira Hassan", "amira.hassan@dubaisecure.ae", "+971 4 333 4455", "Dubai Secure Networks", "Security Operations Manager", "United Arab Emirates", "product_form"),
        ("Marcus Vance", "marcus.vance@vanceresearch.com", "+1 415 555 2671", "Vance Quantum Research", "Senior Cryptographer", "United States", "csv_import"),
        ("Kenji Sato", "kenji.sato@tokyocyber.jp", "+81 3 5555 0143", "Tokyo Cyber Dynamics", "Chief Architect", "Japan", "website"),
        ("Zainab Idris", "zainab.idris@saudipower.sa", "+966 11 234 5678", "Saudi Energy Systems", "IT Security Lead", "Saudi Arabia", "website"),
        ("Lukas Becker", "lukas.becker@berlincrypto.de", "+49 30 123456", "Berlin Crypto Labs GmbH", "Principal Engineer", "Germany", "manual"),
        ("Sarah Jenkins", "s.jenkins@apexdefense.com", "+1 202 555 0199", "Apex Defense Inc", "CISO", "United States", "website"),
        ("Tariq Mahmoud", "tariq.mahmoud@cairofintech.eg", "+20 2 2456 7890", "Cairo FinTech Alliance", "Head of Cloud Infrastructure", "Egypt", "website"),
        ("Sophie Martin", "sophie.martin@parissecure.fr", "+33 1 4050 6070", "Paris Quantum Vault", "Compliance Director", "France", "csv_import"),
        ("Oliver Queen", "oliver.queen@starlingtech.com", "+1 312 555 8899", "Starling Technologies", "VP Security", "United States", "website")
    ]

    contact_objs = []
    now = datetime.now(timezone.utc)
    for name, email, phone, company, desig, country, src in raw_contacts:
        norm = normalize_email(email)
        c = db.query(Contact).filter(Contact.normalized_email == norm).first()
        if not c:
            c = Contact(
                full_name=name,
                normalized_email=norm,
                phone=phone,
                company=company,
                designation=desig,
                country=country,
                lead_source=src,
                created_at=now - timedelta(days=15)
            )
            db.add(c)
            db.commit()
            db.refresh(c)
        contact_objs.append(c)

    # 5. Seed Subscriptions, Suppressions, and Consent
    # Contact 0 (Rahul): Subscribed to QGuard, Quantum Encryption
    # Contact 1 (Priya): Subscribed to Quantum Cybersecurity, QGuard
    # Contact 2 (Alexander): Subscribed to QGuard, Quantum Digital Signature
    # Contact 3 (Fatima): Subscribed to Quantum Readiness Assessment
    # Contact 4 (Carlos): Unsubscribed from QGuard (Product-specific unsubscribe demo)
    # Contact 5 (Elena): Globally Suppressed (Global unsubscribe demo)
    # Contact 6-15: Varied subscriptions

    qguard = product_map["qguard"]
    cyber = product_map["quantum-cybersecurity"]
    readiness = product_map["quantum-readiness-assessment"]
    digisig = product_map["quantum-digital-signature"]
    encryption = product_map["quantum-encryption"]

    def ensure_sub(c, p, status, consent=True):
        s = db.query(Subscription).filter(Subscription.contact_id == c.id, Subscription.product_id == p.id).first()
        if not s:
            s = Subscription(
                contact_id=c.id,
                product_id=p.id,
                status=status,
                consent_date=now - timedelta(days=10) if consent else None,
                consent_source="synthetic_seed",
                consent_method="opt_in_form",
                unsubscribed_at=now - timedelta(days=2) if status == "unsubscribed" else None
            )
            db.add(s)
            if consent:
                ce = ConsentEvent(
                    contact_id=c.id,
                    product_id=p.id,
                    event_type="consent_given" if status == "subscribed" else "consent_withdrawn",
                    consent_source="synthetic_seed",
                    consent_method="form",
                    event_timestamp=now - timedelta(days=10)
                )
                db.add(ce)
        db.commit()

    if len(contact_objs) >= 16:
        # Rahul
        ensure_sub(contact_objs[0], qguard, "subscribed")
        ensure_sub(contact_objs[0], encryption, "subscribed")
        # Priya
        ensure_sub(contact_objs[1], cyber, "subscribed")
        ensure_sub(contact_objs[1], qguard, "subscribed")
        # Alexander
        ensure_sub(contact_objs[2], qguard, "subscribed")
        ensure_sub(contact_objs[2], digisig, "subscribed")
        # Fatima
        ensure_sub(contact_objs[3], readiness, "subscribed")
        # Carlos: Product-level unsubscribed from QGuard, subscribed to Encryption
        ensure_sub(contact_objs[4], qguard, "unsubscribed")
        ensure_sub(contact_objs[4], encryption, "subscribed")
        # Add product suppression for Carlos
        if not db.query(SuppressionRecord).filter(SuppressionRecord.normalized_email == contact_objs[4].normalized_email, SuppressionRecord.product_id == qguard.id).first():
            db.add(SuppressionRecord(
                normalized_email=contact_objs[4].normalized_email,
                scope="product",
                product_id=qguard.id,
                reason="user_unsubscribed",
                source="synthetic_seed"
            ))

        # Elena: Globally Suppressed
        ensure_sub(contact_objs[5], qguard, "unsubscribed")
        ensure_sub(contact_objs[5], cyber, "unsubscribed")
        if not db.query(SuppressionRecord).filter(SuppressionRecord.normalized_email == contact_objs[5].normalized_email, SuppressionRecord.scope == "global").first():
            db.add(SuppressionRecord(
                normalized_email=contact_objs[5].normalized_email,
                scope="global",
                product_id=None,
                reason="user_global_opt_out",
                source="synthetic_seed"
            ))

        # David, Amira, Marcus, Kenji, Zainab, Lukas, Sarah, Tariq, Sophie, Oliver
        ensure_sub(contact_objs[6], qguard, "subscribed")
        ensure_sub(contact_objs[6], cyber, "subscribed")
        ensure_sub(contact_objs[7], cyber, "subscribed")
        ensure_sub(contact_objs[8], qguard, "subscribed")
        ensure_sub(contact_objs[8], encryption, "subscribed")
        ensure_sub(contact_objs[9], digisig, "subscribed")
        ensure_sub(contact_objs[10], readiness, "subscribed")
        ensure_sub(contact_objs[11], encryption, "subscribed")
        ensure_sub(contact_objs[12], qguard, "subscribed")
        ensure_sub(contact_objs[13], readiness, "subscribed")
        ensure_sub(contact_objs[14], cyber, "subscribed")
        ensure_sub(contact_objs[15], qguard, "subscribed")

    # 6. Seed Inquiries
    if len(contact_objs) >= 5:
        inq_samples = [
            (contact_objs[0], qguard, "Interested in deploying QGuard across our 1200 endpoints. Does it support Linux?"),
            (contact_objs[1], cyber, "Requesting architecture overview and compliance whitepaper for UAE financial guidelines."),
            (contact_objs[2], digisig, "Inquiry regarding quantum-proof document signing integration with Adobe Acrobat API."),
            (contact_objs[3], readiness, "We need a complete readiness audit of our core switching fabric before Q3.")
        ]
        for c, p, msg in inq_samples:
            if not db.query(Inquiry).filter(Inquiry.contact_id == c.id).first():
                inq = Inquiry(
                    contact_id=c.id,
                    product_id=p.id,
                    source="website_inquiry",
                    message=msg,
                    consent_given=True,
                    created_at=now - timedelta(days=8)
                )
                db.add(inq)
        db.commit()

    # 7. Seed Sample Executed Campaign
    sample_c = db.query(Campaign).filter(Campaign.name == "Q1 QGuard Enterprise Launch").first()
    if not sample_c:
        sample_c = Campaign(
            name="Q1 QGuard Enterprise Launch",
            product_id=qguard.id,
            subject="Introducing QGuard: Quantum-Resistant Security for {{company}}",
            html_content="<p>Hello {{first_name}}, meet {{product_name}} for {{company}}.</p>",
            text_content="Hello {{first_name}}, meet {{product_name}}.",
            status="sent",
            sent_at=now - timedelta(days=3),
            created_at=now - timedelta(days=5)
        )
        db.add(sample_c)
        db.commit()
        db.refresh(sample_c)

        # Add recipients
        for c in contact_objs[:4]:
            rec = CampaignRecipient(
                campaign_id=sample_c.id,
                contact_id=c.id,
                email_snapshot=c.normalized_email,
                status="delivered",
                provider_message_id=f"seed-msg-{c.id}",
                sent_at=now - timedelta(days=3)
            )
            db.add(rec)
            db.flush()

            db.add(EmailEvent(
                campaign_recipient_id=rec.id,
                event_type="delivered",
                provider_event_id=f"seed-evt-del-{rec.id}",
                event_timestamp=now - timedelta(days=3)
            ))
            db.add(EmailEvent(
                campaign_recipient_id=rec.id,
                event_type="opened",
                provider_event_id=f"seed-evt-opn-{rec.id}",
                event_timestamp=now - timedelta(days=2)
            ))
        db.commit()
