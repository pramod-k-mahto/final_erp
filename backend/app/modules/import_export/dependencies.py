from sqlalchemy.orm import Session

from fastapi import Depends

from app.database import get_db
from app.modules.import_export.services.workflow_service import ImportExportWorkflowService


def get_import_export_workflow(db: Session = Depends(get_db)) -> ImportExportWorkflowService:
    return ImportExportWorkflowService(db)
