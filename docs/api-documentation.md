# TrevasQ REST API Documentation & Specification

All endpoints are prefixed with `/api`. Authenticated endpoints require `Authorization: Bearer <JWT_TOKEN>`.

---

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with email and password, returns JWT token and user profile | Public |
| `GET` | `/api/auth/me` | Retrieve profile of the currently logged-in user | Authenticated |

#### Request Body (`POST /api/auth/login`)
```json
{
  "email": "admin@trevasq.com",
  "password": "TrevasQ@2026"
}
```

---

### 2. Contacts (`/api/contacts`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/contacts` | List contacts with filtering (`search`, `product_id`, `source`, `subscription_status`, `country`) | Authenticated |
| `POST` | `/api/contacts` | Create a contact with explicit consent controls | Admin, Marketing Manager |
| `GET` | `/api/contacts/{id}` | Get Customer 360 profile (inquiries, subscriptions, consent audit, campaign dispatches) | Authenticated |
| `PUT` | `/api/contacts/{id}` | Update contact attributes (company, phone, designation, etc.) | Admin, Marketing Manager |
| `DELETE` | `/api/contacts/{id}` | GDPR Erase: Purges PII while permanently preserving central suppression | Admin only |

---

### 3. Inquiries (`/api/inquiries`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/inquiries` | Public lead capture from website or product contact forms | Public |
| `GET` | `/api/inquiries` | List all historical inquiries with product and consent status | Authenticated |

#### Public Inquiry Request (`POST /api/inquiries`)
```json
{
  "full_name": "Dr. Sarah Jenkins",
  "email": "s.jenkins@apexquantum.io",
  "company": "Apex Quantum Technologies",
  "designation": "CISO",
  "phone": "+1-555-0199",
  "country": "United States",
  "product_slug": "qguard",
  "message": "Interested in evaluating post-quantum cryptography on our core clusters.",
  "marketing_consent": true,
  "privacy_policy_accepted": true
}
```

---

### 4. Products (`/api/products`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/products` | List all quantum products with real-time subscriber and opt-out metrics | Public / Auth |
| `POST` | `/api/products` | Create a new product (dynamically provisions isolated mailing list) | Admin, Marketing Manager |
| `GET` | `/api/products/{id}` | Retrieve product details by ID | Authenticated |
| `PUT` | `/api/products/{id}` | Update product details | Admin, Marketing Manager |
| `GET` | `/api/products/{id}/subscribers` | List contacts subscribed or unsubscribed to this specific product | Authenticated |

---

### 5. Campaigns (`/api/campaigns`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/campaigns` | List all campaigns with delivery, open, click, and bounce metrics | Authenticated |
| `POST` | `/api/campaigns` | Create a new campaign (draft or scheduled) | Admin, Marketing Manager |
| `GET` | `/api/campaigns/{id}` | Get campaign report and performance metrics | Authenticated |
| `PUT` | `/api/campaigns/{id}` | Update campaign content (if draft or scheduled) | Admin, Marketing Manager |
| `GET` | `/api/campaigns/{id}/audience-check` | Real-time multi-factor audit calculating eligible vs. excluded recipients | Authenticated |
| `GET` | `/api/campaigns/{id}/recipients` | Audit log of all individual recipient dispatches and provider message IDs | Authenticated |
| `POST` | `/api/campaigns/{id}/execute` | Launch immediate personalized delivery through active email adapter | Admin, Marketing Manager |
| `POST` | `/api/campaigns/{id}/schedule` | Schedule campaign for automated background execution | Admin, Marketing Manager |
| `POST` | `/api/campaigns/{id}/pause` | Pause scheduled or active campaign | Admin, Marketing Manager |
| `POST` | `/api/campaigns/{id}/resume` | Resume paused campaign | Admin, Marketing Manager |
| `POST` | `/api/campaigns/{id}/cancel` | Cancel scheduled campaign | Admin, Marketing Manager |
| `POST` | `/api/campaigns/{id}/test-send` | Dispatch a single safe preview test email to an administrator | Admin, Marketing Manager |

---

### 6. Email Templates (`/api/templates`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/templates` | List reusable responsive HTML templates | Authenticated |
| `POST` | `/api/templates` | Create a template with personalization tokens | Admin, Marketing Manager |
| `GET` | `/api/templates/{id}` | Get template by ID | Authenticated |
| `PUT` | `/api/templates/{id}` | Update template content | Admin, Marketing Manager |
| `DELETE` | `/api/templates/{id}` | Delete template | Admin, Marketing Manager |
| `POST` | `/api/templates/preview` | Render template with sample contact variables | Authenticated |

---

### 7. CSV Lead Imports (`/api/imports`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/imports/preview` | Upload CSV for pre-flight audit: detects duplicates, suppression, errors | Authenticated |
| `POST` | `/api/imports/execute` | Execute batch import with column mapping and consent enforcement | Admin, Marketing Manager |
| `GET` | `/api/imports` | Audit history of past import jobs | Authenticated |

---

### 8. Unsubscribe & Suppression (`/api/unsubscribe`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/unsubscribe/{token}` | Public token verification endpoint (returns contact and product context) | Public |
| `POST` | `/api/unsubscribe/{token}` | Execute product-level or global unsubscribe | Public |

#### Unsubscribe Execution Payload (`POST /api/unsubscribe/{token}`)
```json
{
  "scope": "product",
  "reason": "Emails are no longer relevant"
}
```
*(Use `"scope": "global"` for complete global suppression)*

---

### 9. Webhooks (`/api/webhooks`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/webhooks/email-provider` | Provider webhook receiver (SendGrid, SES, Mailgun) for delivery events | Public (Token/Secret) |

---

### 10. Analytics & Audit Logs (`/api/analytics`, `/api/activity-logs`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | Computed KPIs, lead growth, product breakdown, delivery trends | Authenticated |
| `GET` | `/api/activity-logs` | Immutable audit trail of all platform activities with metadata | Authenticated |

---

### 11. System Settings & Users (`/api/settings`, `/api/users`)

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/settings` | Read current platform configuration and active email provider | Authenticated |
| `POST` | `/api/settings` | Update email adapter settings, sender info, or toggle test mode | Admin only |
| `GET` | `/api/settings/sent-mailbox` | Inspect simulated emails dispatched in test mode | Authenticated |
| `GET` | `/api/users` | List platform users and RBAC roles | Admin only |
| `POST` | `/api/users` | Create a new user with role assignment (`admin`, `marketing_manager`, `analyst`) | Admin only |
