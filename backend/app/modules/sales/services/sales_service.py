from sqlalchemy.orm import Session
from typing import List
from app.modules.sales.repositories.sales_repo import SalesRepository
from app.modules.sales.schemas.sales_invoice import SalesInvoiceCreate, SalesInvoiceResponse
from fastapi import HTTPException, status

class SalesInvoiceNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Sales invoice not found")

class SalesService:
    def __init__(self, repository: SalesRepository, db: Session):
        self.repo = repository
        self.db = db

    def list_invoices(self, company_id: int) -> List[SalesInvoiceResponse]:
        invoices = self.repo.get_all_for_company(company_id)
        return [SalesInvoiceResponse.model_validate(inv) for inv in invoices]

    def create_invoice(self, invoice_in: SalesInvoiceCreate, company_id: int) -> SalesInvoiceResponse:
        try:
            invoice = self.repo.create(invoice_in, company_id)
            self.db.commit()
            self.db.refresh(invoice)
            return SalesInvoiceResponse.model_validate(invoice)
        except Exception:
            self.db.rollback()
            raise
