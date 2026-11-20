# TrevasQ Automated Marketing & Lead Management Platform
## System Architecture & Technical Specification

---

### 1. Executive Summary & Architectural Overview

The **TrevasQ Automated Marketing Platform** is an enterprise-grade, multi-tenant lead acquisition, contact lifecycle management, and consent-governed email automation engine. Engineered for TrevasQ's quantum cybersecurity product portfolio, the platform enforces strict data protection principles (GDPR, CAN-SPAM, CCPA) while enabling high-throughput automated promotional marketing.

```
                              [ Public Leads ]
                                      |
         +----------------------------+----------------------------+
         |                            |                            |
  [ Web Inquiry Forms ]      [ Product Contact Forms ]     [ Authorized CSV Import ]
         |                            |                            |
         +----------------------------+----------------------------+
                                      |
                           [ Normalization Layer ]
                      (RFC 5322 lowercase, strip whitespace)
                                      |
                         [ Deduplication Engine ]
                   (Lookup existing contact by normalized email)
                                      |
                      +---------------+---------------+
                      |                               |
             [ Contact Exists ]              [ New Contact ]
                      |                               |
             (Preserve history,              (Insert Contact,
             update attributes)              record source)
                      |                               |
                      +---------------+---------------+
                                      |
                         [ Multi-Product Consent Gate ]
        +--------------------------------------------------------------+
        | Explicit Opt-in Given?                                      |
        | - YES: Create Subscription (subscribed) + Consent Audit Log  |
        | - NO:  Create Subscription (not_subscribed)                  |
        +--------------------------------------------------------------+
                                      |
                       [ Central Suppression Layer ]
        +--------------------------------------------------------------+
        | - Checked against global & product suppression records       |
        | - Re-import protection: Opt-outs cannot be overwritten       |
        +--------------------------------------------------------------+
                                      |
                       [ Campaign Execution Engine ]
        +--------------------------------------------------------------+
        | - Audience eligibility evaluation (Subscribed & Clear)       |
        | - Idempotent delivery lock (One send per recipient)          |
        | - Personalization rendering ({{first_name}}, {{company}}...) |
        | - Unguessable cryptographic unsubscribe token generation     |
        +--------------------------------------------------------------+
                                      |
                       [ Multi-Provider Email Adapter ]
        +--------------------------------------------------------------+
        | - Safe Test Mode: Internal Outbox inspector                  |
        | - Production Adapters: SMTP, SendGrid, Amazon SES, Mailgun   |
        +--------------------------------------------------------------+
                                      |
                        [ Engagement & Webhooks ]
        +--------------------------------------------------------------+
        | - Delivery, Open, Click, Bounce, Unsubscribe webhooks        |
        | - Real-time KPI aggregation & Audit Trails                   |
        +--------------------------------------------------------------+
```

---

### 2. Core Functional Modules

#### Module 1: Lead Capture and CRM Database Management
- **Centralized CRM**: Stores contacts, organizations, job designations, phone numbers, and countries.
- **Deduplication Engine**: Normalizes email strings (`Neel@example.com` → `neel@example.com`). Prevents duplicate contacts while appending inquiry records and preserving historical consent logs.
- **Customer 360 View**: Consolidated timeline displaying product interests, multi-product subscription states, inquiry history, dispatched campaigns, and audit trails.

#### Module 2: Contact Information and Consent Management
- **Lawful Basis Enforcement**: Submitting an inquiry never assumes promotional consent. Checkboxes start strictly unselected.
- **Per-Product Partitioning**: Consent for one product (e.g., QGuard) does not grant permission to market other offerings (e.g., Quantum Readiness Assessment).
- **Consent Audit Trail**: Stores timestamp, IP/source, method, and consent evidence reference.

#### Module 3: Multi-Product Mailing List Management
- Products act as independent marketing partitions.
- Dynamic subscriber management: lists automatically expand as contacts opt in and contract when recipients unsubscribe.
- Safe dynamic product addition: Adding a new product immediately creates an independent, isolated mailing list.

#### Module 4: Automated Email Campaign Management
- 6-step creation wizard:
  1. Campaign details & product assignment.
  2. Automated audience eligibility verification.
  3. Responsive template selection.
  4. Live personalization preview.
  5. Safe test email dispatch.
  6. Scheduled or immediate execution.
- Campaign lifecycle state machine: `draft` → `scheduled` → `processing` → `sent` (with `paused` and `cancelled` states).

#### Module 5: Personalized Email Generation and Delivery
- Dynamic token engine: Injects `{{first_name}}`, `{{full_name}}`, `{{company}}`, `{{product_name}}`, `{{unsubscribe_url}}`, and `{{global_unsubscribe_url}}`.
- Context-aware fallbacks (e.g., "Valued Leader" if company is missing).
- Automated link injection: Injects unguessable 32-byte cryptographic tokens (`secrets.token_urlsafe(32)`).

#### Module 6: Unsubscribe and Suppression Management
- Public, unguessable unsubscribe endpoints requiring no login.
- Two-tier opt-out choice:
  1. **Product-Level Unsubscribe**: Unsubscribes from the current product's mailing list while keeping other product subscriptions active.
  2. **Global Unsubscribe**: Adds the contact's normalized email to the Central Suppression Record, permanently blocking marketing emails across all current and future products.
- **Re-Import Immutability**: Central suppression table overrides subsequent CSV imports. Re-importing a CSV lead file can never reactivate suppressed contacts.

#### Module 7: CSV/Excel and Authorized Lead Import
- 5-step import pipeline:
  1. Upload CSV file.
  2. Dynamic column mapping to database fields.
  3. Pre-flight audit: Detects syntax errors, duplicates, and suppressed records with persistent suppression warnings.
  4. Lawful basis & consent settings: Invariant check prevents automatic marketing subscription without explicit lawful basis.
  5. Batch execution & real-time metrics reporting.

#### Module 8: Marketing Analytics Dashboard
- Real-time SQL aggregations (no mock counters).
- Core KPIs: Total Contacts, Active Subscribers, Delivery Rate %, Open Rate %, Click Rate %, Unsubscribe Rates.
- Visualizations: Monthly lead trajectory, acquisition channel distribution, product subscriber health, and 7-day email delivery trends.

---

### 3. Security, Privacy & RBAC

- **Authentication**: JWT Bearer tokens with SHA-256 HMAC signature. Passwords hashed using bcrypt.
- **Role-Based Access Control (RBAC)**:
  - `admin`: Full administrative control, system settings, user management, GDPR deletion.
  - `marketing_manager`: Create/edit contacts, launch campaigns, manage templates, perform CSV imports.
  - `analyst`: Read-only access to analytics, campaign metrics, and audit logs.
- **Safe Test Mode**: Prevents sending unsolicited live emails during development. Outbound emails are intercepted by `TestMockEmailAdapter` and inspectable in the platform test mailbox.
