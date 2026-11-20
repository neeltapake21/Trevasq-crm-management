# TrevasQ Database Schema & Relational Specifications

---

### 1. Entity-Relationship Model Overview

The database design uses third-normal-form (3NF) relational tables with strict foreign keys, unique constraints, and indices on query paths (such as `normalized_email` and `slug`).

```
 +------------------+           +----------------------+
 |    AdminUser     |           |       Product        |
 +------------------+           +----------------------+
 | id (PK)          |           | id (PK)              |
 | email (UQ)       |           | name (UQ)            |
 | password_hash    |           | slug (UQ)            |
 | role             |           | status               |
 +--------+---------+           +----------+-----------+
          |                                |
          | 1:N                            | 1:N
          v                                v
 +------------------+           +----------------------+
 |   ActivityLog    |           |     Subscription     |
 +------------------+           +----------------------+
 | id (PK)          |     +---->| id (PK)              |
 | actor_id (FK)    |     |     | contact_id (FK)      |<---+
 | action           |     |     | product_id (FK)      |    |
 | metadata_json    |     |     | status (enum)        |    |
 +------------------+     |     | consent_date         |    |
                          |     +----------------------+    |
                          |                                 |
 +------------------+     |     +----------------------+    |
 |     Contact      |     |     |       Inquiry        |    |
 +------------------+     |     +----------------------+    |
 | id (PK)          |-----+---->| id (PK)              |    |
 | normalized_email |(UQ)       | contact_id (FK)      |----+
 | full_name        |           | product_id (FK)      |
 | company          |           | message              |
 | lead_source      |           | consent_given (bool) |
 +--------+---------+           +----------------------+
          |
          | 1:N
          v
 +----------------------+       +----------------------+
 |  SuppressionRecord   |       |       Campaign       |
 +----------------------+       +----------------------+
 | id (PK)              |       | id (PK)              |
 | normalized_email (IX)|       | product_id (FK)      |
 | scope (prod/global)  |       | name, subject        |
 | product_id (FK, opt) |       | status, scheduled_at |
 +----------------------+       +----------+-----------+
                                           |
                                           | 1:N
                                           v
 +----------------------+       +----------------------+
 |   EmailTemplate      |       |  CampaignRecipient   |
 +----------------------+       +----------------------+
 | id (PK)              |       | id (PK)              |
 | product_id (FK, opt) |       | campaign_id (FK)     |
 | subject, html_content|       | contact_id (FK)      |
 +----------------------+       | email_snapshot       |
                                | status (sent/deliv)  |
                                +----------+-----------+
                                           |
                                           | 1:N
                                           v
                                +----------------------+
                                |      EmailEvent      |
                                +----------------------+
                                | id (PK)              |
                                | recipient_id (FK)    |
                                | event_type           |
                                | provider_event_id    |
                                +----------------------+
```

---

### 2. Table Definitions & Constraints

#### 2.1 `admin_users`
Stores authenticated platform operators with RBAC privileges.
- `id` (INTEGER, Primary Key, Auto-increment)
- `email` (VARCHAR(255), Unique, Not Null, Normalized)
- `name` (VARCHAR(255), Not Null)
- `password_hash` (VARCHAR(255), Not Null)
- `role` (VARCHAR(50), Not Null, Check: `role IN ('admin', 'marketing_manager', 'analyst')`)
- `is_active` (BOOLEAN, Default: TRUE)
- `created_at`, `updated_at` (DATETIME, UTC)

#### 2.2 `products`
Partitions the TrevasQ quantum product offerings.
- `id` (INTEGER, Primary Key, Auto-increment)
- `name` (VARCHAR(255), Unique, Not Null)
- `slug` (VARCHAR(255), Unique, Not Null, Indexed)
- `description` (TEXT, Nullable)
- `status` (VARCHAR(50), Default: `'active'`)
- `created_at`, `updated_at` (DATETIME, UTC)

#### 2.3 `contacts`
Central deduplicated repository of individuals.
- `id` (INTEGER, Primary Key, Auto-increment)
- `normalized_email` (VARCHAR(255), Unique, Not Null, Indexed)
- `full_name` (VARCHAR(255), Not Null)
- `phone` (VARCHAR(50), Nullable)
- `company` (VARCHAR(255), Nullable)
- `designation` (VARCHAR(255), Nullable)
- `country` (VARCHAR(100), Nullable)
- `lead_source` (VARCHAR(100), Default: `'website'`)
- `created_at`, `updated_at` (DATETIME, UTC)

#### 2.4 `subscriptions`
Maintains consent status per product segment.
- `id` (INTEGER, Primary Key, Auto-increment)
- `contact_id` (INTEGER, Foreign Key → `contacts.id`, Cascade Delete)
- `product_id` (INTEGER, Foreign Key → `products.id`, Cascade Delete)
- `status` (VARCHAR(50), Check: `status IN ('subscribed', 'unsubscribed', 'pending', 'not_subscribed', 'suppressed')`)
- `consent_date` (DATETIME, Nullable)
- `consent_source` (VARCHAR(255), Nullable)
- `unsubscribed_at` (DATETIME, Nullable)
- **Constraint**: `UNIQUE(contact_id, product_id)`

#### 2.5 `suppression_records`
Persistent suppression database guaranteeing CAN-SPAM / GDPR opt-out permanence.
- `id` (INTEGER, Primary Key, Auto-increment)
- `normalized_email` (VARCHAR(255), Not Null, Indexed)
- `scope` (VARCHAR(50), Check: `scope IN ('global', 'product')`)
- `product_id` (INTEGER, Foreign Key → `products.id`, Nullable)
- `reason` (VARCHAR(255), Nullable)
- `created_at` (DATETIME, UTC)
- **Constraint**: `UNIQUE(normalized_email, scope, product_id)`

#### 2.6 `inquiries`
Historical log of inbound inquiries from web forms or lead sources.
- `id` (INTEGER, Primary Key, Auto-increment)
- `contact_id` (INTEGER, Foreign Key → `contacts.id`, Cascade Delete)
- `product_id` (INTEGER, Foreign Key → `products.id`, Nullable)
- `source` (VARCHAR(100), Default: `'website_inquiry'`)
- `message` (TEXT, Nullable)
- `consent_given` (BOOLEAN, Default: FALSE)
- `created_at` (DATETIME, UTC)

#### 2.7 `consent_events`
Audit log of every consent grant or revocation.
- `id` (INTEGER, Primary Key, Auto-increment)
- `contact_id` (INTEGER, Foreign Key → `contacts.id`, Cascade Delete)
- `product_id` (INTEGER, Foreign Key → `products.id`, Nullable)
- `event_type` (VARCHAR(50), Check: `event_type IN ('granted', 'withdrawn', 'suppressed')`)
- `consent_source` (VARCHAR(255), Nullable)
- `consent_method` (VARCHAR(100), Nullable)
- `evidence_reference` (VARCHAR(255), Nullable)
- `event_timestamp` (DATETIME, UTC)

#### 2.8 `campaigns`
Promotional email marketing campaigns.
- `id` (INTEGER, Primary Key, Auto-increment)
- `name` (VARCHAR(255), Not Null)
- `product_id` (INTEGER, Foreign Key → `products.id`, Not Null)
- `subject` (VARCHAR(255), Not Null)
- `html_content` (TEXT, Not Null)
- `text_content` (TEXT, Nullable)
- `status` (VARCHAR(50), Check: `status IN ('draft', 'scheduled', 'processing', 'sent', 'paused', 'failed', 'cancelled')`)
- `scheduled_at`, `sent_at` (DATETIME, Nullable)
- `created_at`, `updated_at` (DATETIME, UTC)

#### 2.9 `campaign_recipients`
Idempotent delivery record linking campaign dispatches to recipients.
- `id` (INTEGER, Primary Key, Auto-increment)
- `campaign_id` (INTEGER, Foreign Key → `campaigns.id`, Cascade Delete)
- `contact_id` (INTEGER, Foreign Key → `contacts.id`, Cascade Delete)
- `email_snapshot` (VARCHAR(255), Not Null)
- `status` (VARCHAR(50), Check: `status IN ('pending', 'sent', 'delivered', 'bounced', 'failed')`)
- `provider_message_id` (VARCHAR(255), Nullable)
- `sent_at` (DATETIME, Nullable)
- `error_message` (TEXT, Nullable)
- **Constraint**: `UNIQUE(campaign_id, contact_id)` (Strictly prevents duplicate delivery)

#### 2.10 `email_events`
Webhook engagement tracking events (opens, clicks, bounces, delivery).
- `id` (INTEGER, Primary Key, Auto-increment)
- `recipient_id` (INTEGER, Foreign Key → `campaign_recipients.id`, Cascade Delete)
- `event_type` (VARCHAR(50), Check: `event_type IN ('delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'complaint')`)
- `provider_event_id` (VARCHAR(255), Unique, Indexed)
- `payload_json` (TEXT, Nullable)
- `event_timestamp` (DATETIME, UTC)

#### 2.11 `unsubscribe_tokens`
Cryptographically secure tokens for public one-click opt-out.
- `id` (INTEGER, Primary Key, Auto-increment)
- `token` (VARCHAR(255), Unique, Not Null, Indexed)
- `contact_id` (INTEGER, Foreign Key → `contacts.id`, Cascade Delete)
- `product_id` (INTEGER, Foreign Key → `products.id`, Nullable)
- `created_at` (DATETIME, UTC)
- `used_at` (DATETIME, Nullable)
- `is_active` (BOOLEAN, Default: TRUE)

#### 2.12 `import_jobs`
Audit history of bulk CSV/Excel lead imports.
- `id` (INTEGER, Primary Key, Auto-increment)
- `file_name` (VARCHAR(255), Not Null)
- `status` (VARCHAR(50), Default: `'completed'`)
- `total_rows`, `successful_rows`, `updated_rows`, `skipped_rows`, `suppressed_rows`, `failed_rows` (INTEGER)
- `error_summary` (TEXT, Nullable)
- `created_at`, `completed_at` (DATETIME, UTC)

#### 2.13 `activity_logs`
Platform-wide immutable audit trail.
- `id` (INTEGER, Primary Key, Auto-increment)
- `actor_id` (INTEGER, Foreign Key → `admin_users.id`, Nullable)
- `actor_email` (VARCHAR(255), Nullable)
- `action` (VARCHAR(100), Not Null)
- `entity_type` (VARCHAR(100), Not Null)
- `entity_id` (VARCHAR(100), Nullable)
- `metadata_json` (TEXT, Nullable)
- `created_at` (DATETIME, UTC)
