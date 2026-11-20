import csv
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from sqlalchemy.orm import Session
from backend.app.models.entities import (
    Contact, Product, Subscription, SuppressionRecord, ConsentEvent, ImportJob
)
from backend.app.core.security import normalize_email
from backend.app.services.eligibility_service import is_valid_email_syntax
from backend.app.services.unsubscribe_service import is_email_suppressed
from backend.app.services.activity_service import log_activity

def parse_csv_file(content: str) -> Tuple[List[str], List[Dict[str, str]]]:
    """Parses raw CSV string content into headers and row dicts."""
    f = io.StringIO(content.strip())
    # Detect delimiter
    sample = content[:2048]
    delimiter = ','
    if '\t' in sample and sample.count('\t') > sample.count(','):
        delimiter = '\t'
    elif ';' in sample and sample.count(';') > sample.count(','):
        delimiter = ';'

    reader = csv.DictReader(f, delimiter=delimiter)
    headers = [h.strip() for h in (reader.fieldnames or [])]
    rows = []
    for r in reader:
        # Strip keys and values
        clean_row = {k.strip(): (v.strip() if v else "") for k, v in r.items() if k}
        rows.append(clean_row)
    return headers, rows

def preview_csv_import(
    db: Session,
    content: str,
    target_product_id: Optional[int] = None
) -> Dict[str, Any]:
    """Generates a detailed preview of the CSV before import."""
    headers, rows = parse_csv_file(content)
    
    total_rows = len(rows)
    valid_rows = 0
    invalid_rows = 0
    duplicate_rows = 0
    suppressed_rows = 0
    sample_preview = []

    # Map candidate email column
    email_col = next((h for h in headers if "email" in h.lower()), None)
    
    for idx, row in enumerate(rows):
        raw_email = row.get(email_col, "") if email_col else ""
        norm_email = normalize_email(raw_email)
        
        errors = []
        is_valid_email = is_valid_email_syntax(norm_email)
        if not is_valid_email:
            errors.append("Invalid or missing email format")
            invalid_rows += 1
        else:
            valid_rows += 1

        is_duplicate = False
        if is_valid_email:
            existing = db.query(Contact).filter(Contact.normalized_email == norm_email).first()
            if existing:
                is_duplicate = True
                duplicate_rows += 1

        is_supp = False
        if is_valid_email:
            suppressed, reason = is_email_suppressed(db, norm_email, target_product_id)
            if suppressed:
                is_supp = True
                suppressed_rows += 1
                errors.append(f"Suppressed: {reason}")

        if idx < 10:  # Sample preview first 10 rows
            sample_preview.append({
                "row_number": idx + 1,
                "raw_data": row,
                "detected_email": norm_email,
                "is_valid_email": is_valid_email,
                "is_duplicate": is_duplicate,
                "is_suppressed": is_supp,
                "validation_errors": errors
            })

    return {
        "total_rows": total_rows,
        "valid_rows": valid_rows,
        "invalid_rows": invalid_rows,
        "duplicate_rows": duplicate_rows,
        "suppressed_rows": suppressed_rows,
        "columns_detected": headers,
        "sample_rows": sample_preview
    }

def execute_csv_import(
    db: Session,
    file_name: str,
    content: str,
    column_mapping: Dict[str, str],
    default_product_id: Optional[int] = None,
    lead_source: str = "csv_import",
    import_consent: bool = False,
    consent_source: Optional[str] = "Imported Lead List",
    update_existing: bool = True
) -> ImportJob:
    """
    Executes CSV import with deduplication and persistent suppression enforcement.
    Critical Acceptance Rule: Re-importing a previously suppressed email MUST NEVER
    automatically resubscribe that contact.
    """
    now = datetime.now(timezone.utc)
    job = ImportJob(
        file_name=file_name,
        status="processing",
        created_at=now
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    headers, rows = parse_csv_file(content)
    job.total_rows = len(rows)

    successful = 0
    updated = 0
    skipped = 0
    suppressed_count = 0
    failed = 0
    error_lines = []

    # Invert mapping to find source column for target field
    field_to_col = {v: k for k, v in column_mapping.items()}
    email_col = field_to_col.get("email") or next((h for h in headers if "email" in h.lower()), None)
    name_col = field_to_col.get("full_name") or next((h for h in headers if "name" in h.lower()), None)
    company_col = field_to_col.get("company") or next((h for h in headers if "company" in h.lower()), None)
    phone_col = field_to_col.get("phone") or next((h for h in headers if "phone" in h.lower()), None)
    desig_col = field_to_col.get("designation") or next((h for h in headers if "title" in h.lower() or "designation" in h.lower()), None)
    country_col = field_to_col.get("country") or next((h for h in headers if "country" in h.lower()), None)
    consent_col = field_to_col.get("consent") or next((h for h in headers if "consent" in h.lower()), None)

    for idx, row in enumerate(rows):
        try:
            raw_email = row.get(email_col, "") if email_col else ""
            norm_email = normalize_email(raw_email)

            if not is_valid_email_syntax(norm_email):
                failed += 1
                error_lines.append(f"Row {idx+1}: Invalid email '{raw_email}'")
                continue

            full_name = row.get(name_col, "").strip() if name_col else ""
            if not full_name:
                full_name = norm_email.split('@')[0].capitalize()
            company = row.get(company_col, "").strip() if company_col else None
            phone = row.get(phone_col, "").strip() if phone_col else None
            designation = row.get(desig_col, "").strip() if desig_col else None
            country = row.get(country_col, "").strip() if country_col else None

            # Determine row-level consent
            row_has_consent = import_consent
            if consent_col and row.get(consent_col):
                val = row.get(consent_col, "").lower()
                if val in ("yes", "true", "1", "opted_in", "subscribed"):
                    row_has_consent = True

            # 1. Check suppression database (CRITICAL TEST 7)
            is_suppressed, supp_reason = is_email_suppressed(db, norm_email, default_product_id)

            # 2. Get or create contact
            contact = db.query(Contact).filter(Contact.normalized_email == norm_email).first()
            if contact:
                if update_existing:
                    if full_name and contact.full_name in ("Unknown", ""):
                        contact.full_name = full_name
                    if company:
                        contact.company = company
                    if phone:
                        contact.phone = phone
                    if designation:
                        contact.designation = designation
                    if country:
                        contact.country = country
                    contact.updated_at = now
                    updated += 1
                else:
                    skipped += 1
            else:
                contact = Contact(
                    full_name=full_name,
                    normalized_email=norm_email,
                    phone=phone,
                    company=company,
                    designation=designation,
                    country=country,
                    lead_source=lead_source,
                    created_at=now,
                    updated_at=now
                )
                db.add(contact)
                db.flush()
                successful += 1

            # 3. Associate with default product subscription if specified
            if default_product_id:
                sub = db.query(Subscription).filter(
                    Subscription.contact_id == contact.id,
                    Subscription.product_id == default_product_id
                ).first()

                if is_suppressed:
                    # Enforce suppression: DO NOT subscribe, record suppression increment
                    suppressed_count += 1
                    if sub and sub.status == "subscribed":
                        sub.status = "unsubscribed"
                        sub.updated_at = now
                elif row_has_consent:
                    # Only subscribe if NOT suppressed and valid documented consent was provided
                    if sub:
                        if sub.status != "unsubscribed":  # do not overwrite previous unsubscribe
                            sub.status = "subscribed"
                            sub.consent_date = now
                            sub.consent_source = consent_source
                            sub.consent_method = "csv_import_with_consent"
                            sub.updated_at = now
                    else:
                        sub = Subscription(
                            contact_id=contact.id,
                            product_id=default_product_id,
                            status="subscribed",
                            consent_date=now,
                            consent_source=consent_source,
                            consent_method="csv_import_with_consent"
                        )
                        db.add(sub)

                    # Record consent event
                    ce = ConsentEvent(
                        contact_id=contact.id,
                        product_id=default_product_id,
                        event_type="import_declared",
                        consent_source=consent_source,
                        consent_method="csv_import",
                        event_timestamp=now,
                        evidence_reference=f"Import file: {file_name}"
                    )
                    db.add(ce)
                else:
                    # No consent provided -> 'not_subscribed'
                    if not sub:
                        sub = Subscription(
                            contact_id=contact.id,
                            product_id=default_product_id,
                            status="not_subscribed"
                        )
                        db.add(sub)

        except Exception as e:
            failed += 1
            error_lines.append(f"Row {idx+1} error: {str(e)}")

    db.commit()

    job.status = "completed" if failed == 0 else "completed_with_errors"
    job.successful_rows = successful
    job.updated_rows = updated
    job.skipped_rows = skipped
    job.suppressed_rows = suppressed_count
    job.failed_rows = failed
    job.error_summary = "\n".join(error_lines[:20]) if error_lines else None
    job.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(job)

    log_activity(
        db=db,
        action="csv_import_completed",
        entity_type="import_job",
        entity_id=str(job.id),
        metadata={
            "file_name": file_name,
            "total": job.total_rows,
            "successful": successful,
            "updated": updated,
            "suppressed": suppressed_count,
            "failed": failed
        }
    )

    return job
