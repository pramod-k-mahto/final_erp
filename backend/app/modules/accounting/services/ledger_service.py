from sqlalchemy.orm import Session
from typing import List
from app.modules.accounting.repositories.ledger_repo import LedgerRepository
from app.modules.accounting.schemas.ledger import LedgerCreate, LedgerResponse
from fastapi import HTTPException, status

class LedgerNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Ledger not found")

class LedgerService:
    def __init__(self, repository: LedgerRepository, db: Session):
        self.repo = repository
        self.db = db

    def list_ledgers(self, company_id: int) -> List[LedgerResponse]:
        ledgers = self.repo.get_all_for_company(company_id)
        return [LedgerResponse.model_validate(l) for l in ledgers]

    def create_ledger(self, ledger_in: LedgerCreate, company_id: int) -> LedgerResponse:
        try:
            ledger = self.repo.create(ledger_in, company_id)
            self.db.commit()
            self.db.refresh(ledger)
            return LedgerResponse.model_validate(ledger)
        except Exception:
            self.db.rollback()
            raise
