from fastapi import Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.accounting.repositories.ledger_repo import LedgerRepository
from app.modules.accounting.services.ledger_service import LedgerService

def get_ledger_repository(db: Session = Depends(get_db)) -> LedgerRepository:
    return LedgerRepository(db)

def get_ledger_service(
    db: Session = Depends(get_db),
    repo: LedgerRepository = Depends(get_ledger_repository)
) -> LedgerService:
    return LedgerService(repository=repo, db=db)

def get_current_company_id(
    company_id: int = Query(..., description="The company ID to scope the request to")
) -> int:
    if company_id <= 0:
        raise HTTPException(status_code=400, detail="company_id must be a positive integer")
    return company_id
