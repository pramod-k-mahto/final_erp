from sqlalchemy.orm import Session
from typing import List
from app.modules.purchases.repositories.purchase_repo import PurchaseRepository
from app.modules.purchases.schemas.purchase_bill import PurchaseBillCreate, PurchaseBillResponse
from fastapi import HTTPException, status

class PurchaseBillNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase bill not found")

class PurchaseService:
    def __init__(self, repository: PurchaseRepository, db: Session):
        self.repo = repository
        self.db = db

    def list_bills(self, company_id: int) -> List[PurchaseBillResponse]:
        bills = self.repo.get_all_for_company(company_id)
        return [PurchaseBillResponse.model_validate(b) for b in bills]

    def create_bill(self, bill_in: PurchaseBillCreate, company_id: int) -> PurchaseBillResponse:
        try:
            bill = self.repo.create(bill_in, company_id)
            self.db.commit()
            self.db.refresh(bill)
            return PurchaseBillResponse.model_validate(bill)
        except Exception:
            self.db.rollback()
            raise
