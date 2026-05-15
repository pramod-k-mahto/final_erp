from fastapi import APIRouter, Depends, status
from typing import List
from app.modules.accounting.schemas.ledger import LedgerCreate, LedgerResponse
from app.modules.accounting.services.ledger_service import LedgerService
from app.modules.accounting.dependencies import get_ledger_service, get_current_company_id
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/accounting", tags=["Accounting"])

@router.post("/ledgers", response_model=LedgerResponse, status_code=status.HTTP_201_CREATED)
def create_ledger(
    ledger_in: LedgerCreate,
    service: LedgerService = Depends(get_ledger_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.create_ledger(ledger_in, company_id=company_id)

@router.get("/ledgers", response_model=List[LedgerResponse])
def list_ledgers(
    service: LedgerService = Depends(get_ledger_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.list_ledgers(company_id)
