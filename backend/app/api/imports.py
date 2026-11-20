import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.entities import ImportJob, AdminUser
from backend.app.schemas import CSVPreviewResponse, CSVImportResultResponse
from backend.app.api.deps import get_current_user, require_roles
from backend.app.services.import_service import preview_csv_import, execute_csv_import

router = APIRouter(prefix="/imports", tags=["Imports"])

@router.post("/preview", response_model=CSVPreviewResponse)
async def preview_csv(
    file: UploadFile = File(...),
    product_id: Optional[int] = Form(None),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    if not file.filename.lower().endswith(('.csv', '.txt')):
        raise HTTPException(status_code=400, detail="Only CSV text files are accepted")
    
    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        decoded = contents.decode("latin-1")

    preview_res = preview_csv_import(db, decoded, target_product_id=product_id)
    return preview_res

@router.post("/execute", response_model=CSVImportResultResponse)
async def execute_import(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),  # JSON string of Dict[str, str]
    product_id: Optional[int] = Form(None),
    lead_source: str = Form("csv_import"),
    import_consent: bool = Form(False),
    consent_source: str = Form("Imported Lead List"),
    update_existing: bool = Form(True),
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(require_roles(["admin", "marketing_manager"]))
):
    try:
        mapping_dict = json.loads(column_mapping)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON column_mapping")

    contents = await file.read()
    try:
        decoded = contents.decode("utf-8")
    except UnicodeDecodeError:
        decoded = contents.decode("latin-1")

    job = execute_csv_import(
        db=db,
        file_name=file.filename,
        content=decoded,
        column_mapping=mapping_dict,
        default_product_id=product_id,
        lead_source=lead_source,
        import_consent=import_consent,
        consent_source=consent_source,
        update_existing=update_existing
    )

    return {
        "job_id": job.id,
        "total_rows": job.total_rows,
        "successful_rows": job.successful_rows,
        "updated_rows": job.updated_rows,
        "skipped_rows": job.skipped_rows,
        "suppressed_rows": job.suppressed_rows,
        "failed_rows": job.failed_rows,
        "error_summary": job.error_summary
    }

@router.get("", response_model=List[dict])
def list_import_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    jobs = db.query(ImportJob).order_by(ImportJob.created_at.desc()).limit(limit).all()
    result = []
    for j in jobs:
        result.append({
            "id": j.id,
            "file_name": j.file_name,
            "status": j.status,
            "total_rows": j.total_rows,
            "successful_rows": j.successful_rows,
            "updated_rows": j.updated_rows,
            "skipped_rows": j.skipped_rows,
            "suppressed_rows": j.suppressed_rows,
            "failed_rows": j.failed_rows,
            "error_summary": j.error_summary,
            "created_at": j.created_at,
            "completed_at": j.completed_at
        })
    return result

@router.get("/{job_id}")
def get_import_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    job = db.query(ImportJob).filter(ImportJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Import job not found")
    return job
