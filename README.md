# TrevasQ – Automated Marketing & Lead Management Platform

A production-minded, full-stack automated marketing, contact CRM, and consent-governed email campaign management platform for **TrevasQ**'s quantum cybersecurity product portfolio.

---

## 1. System Overview

TrevasQ requires an automated marketing system to capture leads across multi-channel inquiry points, maintain a centralized CRM database, partition contacts across distinct quantum cybersecurity products, manage marketing consent with strict GDPR/CAN-SPAM compliance, and automatically dispatch personalized promotional campaigns.

### The 8 Completed Modules

1. **Lead Management CRM**: Multi-channel inquiry capture (website, product forms, manual, CSV).
2. **Contact & Consent Management**: Email normalization (`Neel@example.com` → `neel@example.com`), deduplication, Customer 360 profile, and explicit consent audit trails.
3. **Multi-Product Mailing List Management**: Independent subscriber segments for each product (QGuard, Quantum Cybersecurity, Quantum Readiness Assessment, Quantum Entropy Generator, Quantum Key Distribution, Post-Quantum HSM).
4. **Automated Campaign Management**: 6-step creation wizard, audience eligibility calculation, campaign lifecycle state machine, pause/resume/cancel, and scheduling.
5. **Personalized Email Generation & Delivery**: Dynamic token injection (`{{first_name}}`, `{{company}}`, `{{product_name}}`), unguessable cryptographic tokens, and adapter-based delivery.
6. **Unsubscribe & Suppression Management**: Public 1-click token endpoints, product-level vs. global opt-out choices, and immutable re-import suppression persistence.
7. **CSV / Excel Lead Import Wizard**: 5-step pipeline (Upload → Mapping → Pre-flight audit → Consent rules → Execution results) with suppression protection.
8. **Marketing Analytics Dashboard**: Real-time KPI cards, interactive Recharts visualizations, channel attribution, product subscriber health, and campaign performance audits.

---

## 2. Core Architectural Invariants

- **Consent is Never Assumed**: Submitting a product inquiry never automatically opts a user into marketing. Checkboxes start unselected.
- **Product Consent Partitioning**: Consent for one product (e.g. QGuard) does not authorize marketing emails for another product.
- **Persistent Suppression**: When a contact is unsubscribed or globally suppressed, subsequent CSV re-imports or new inquiry submissions can never reactivate marketing subscriptions.
- **Idempotent Delivery**: Campaign recipient tracking guarantees that running or retrying a campaign will never dispatch duplicate emails.
- **Cryptographic Tokens**: Unsubscribe URLs use URL-safe random cryptographic tokens (`secrets.token_urlsafe(32)`). No sequential or guessable IDs.
- **Safe Development Test Mode**: Outbound emails in test mode are intercepted and stored in an internal test mailbox inspectable in Settings. Zero unsolicited emails to real inboxes.

---

## 3. Technology Stack

- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy, SQLite (Development) / PostgreSQL (Production), Background Thread Scheduler.
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Lucide Icons, Recharts, React Router v6, Axios.
- **Email Adapters**: Safe Test Mode Adapter, SMTP, SendGrid, Amazon SES, Mailgun.
- **Testing**: Pytest test suite covering all 12 mandatory acceptance criteria (100% passing).
- **Deployment**: Docker, Docker Compose, Nginx SPA reverse proxy.

---

## 4. Quickstart Guide

### Option A: Local Development Setup (Quickest)

#### 1. Backend Setup
```powershell
# Open terminal in project root
$PYTHON = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"

# Install backend dependencies
& $PYTHON -m pip install -r backend/requirements.txt

# Seed the database with synthetic quantum security products, contacts, and campaigns
& $PYTHON backend/app/seed_data.py

# Run backend API server
& $PYTHON -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The FastAPI backend will be running at `http://localhost:8000` (Swagger docs at `http://localhost:8000/docs`).

#### 2. Frontend Setup
```powershell
# In a new terminal window
cd frontend
npm install
npm run dev
```

The frontend application will be running at `http://localhost:5173`.

---

### Option B: Docker Compose Setup

Run the entire platform (Frontend, Backend, PostgreSQL, and Redis) with a single command:
```bash
docker compose up --build
```
- Web Application: `http://localhost`
- Backend API: `http://localhost:8000/docs`

---

## 5. Demo Personas & Credentials

The platform features Role-Based Access Control (RBAC). For testing convenience, the login page features **One-Click Demo Login** buttons for all three personas:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Administrator** | `admin@trevasq.com` | `TrevasQ@2026` | Full system control, provider settings, user management, GDPR deletion. |
| **Marketing Manager** | `marketing@trevasq.com` | `TrevasQ@2026` | Create/edit contacts, launch campaigns, manage templates, perform CSV imports. |
| **Analyst** | `analyst@trevasq.com` | `TrevasQ@2026` | Read-only access to analytics, campaign metrics, and audit logs. |

*(You can also switch personas instantaneously using the Persona Switcher badge in the top-right navbar).*

---

## 6. End-to-End Verification & Acceptance Scenarios

To run the automated test suite verifying all 12 acceptance criteria:
```powershell
$PYTHON = "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe"
& $PYTHON -m pytest backend/tests/test_suite.py -v
```

### Acceptance Scenarios Tested:
1. **New Inquiries**: Submitting an inquiry creates/updates a contact, records consent only if checked, and adds the contact to the product mailing list.
2. **Duplicate Inquiries**: Submitting inquiries with different casing (`Neel@example.com` vs. `neel@example.com`) deduplicates to the same contact, appends inquiry history, and preserves existing consent.
3. **Multiple Product Subscriptions**: A contact can independently subscribe to QGuard and Quantum Cybersecurity.
4. **Strict Campaign Eligibility**: Only contacts with explicit consent for the target product and zero suppressions are included.
5. **Product Unsubscribe**: Unsubscribing from Product A removes the contact from Product A campaigns while keeping Product B campaigns active.
6. **Global Unsubscribe**: Global opt-out registers a central suppression record, excluding the contact from all campaigns across all products.
7. **Re-Import Suppression Persistence**: Re-importing a CSV lead file containing a previously unsubscribed lead preserves suppression.
8. **Campaign Delivery Idempotency**: Executing campaign delivery multiple times never dispatches duplicate emails.
9. **Personalization Rendering**: Dynamic tokens (`{{first_name}}`, `{{company}}`, `{{product_name}}`, `{{unsubscribe_url}}`) render properly.
10. **Dynamic New Product Creation**: Adding a new product immediately provisions an isolated mailing list with zero leakage.
11. **Webhook Event Idempotency**: Processing duplicate webhook delivery events records the event exactly once.
12. **Role-Based Access Control (RBAC)**: Enforces permissions strictly across Admin, Marketing Manager, and Analyst roles.

---

## 7. Project Documentation

Detailed technical documentation is available in the `docs/` directory:
- [System Architecture](docs/architecture.md): Deep-dive into workflows, consent gates, and adapter layers.
- [Database Schema](docs/database-schema.md): Complete entity-relationship diagram, table definitions, and constraints.
- [REST API Specification](docs/api-documentation.md): Endpoints, request/response schemas, and error codes.
- [Testing & Quality Assurance Report](docs/testing-report.md): Test execution breakdown and scenario assertions.

---

## 8. Sample Files

- `sample_leads.csv`: Sample CSV file in the root directory for testing the CSV Import Wizard (includes valid leads, duplicate contacts, and unsubscribed contacts to demonstrate persistent suppression).
