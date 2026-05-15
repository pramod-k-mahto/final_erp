from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.sales.models.sales_invoice import SalesInvoice, SalesInvoiceLine
from app.modules.sales.schemas.sales_invoice import SalesInvoiceCreate

class SalesRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, invoice_id: int, company_id: int) -> Optional[SalesInvoice]:
        return self.db.query(SalesInvoice).filter(
            SalesInvoice.id == invoice_id,
            SalesInvoice.company_id == company_id
        ).first()

    def get_all_for_company(self, company_id: int) -> List[SalesInvoice]:
        return self.db.query(SalesInvoice).filter(SalesInvoice.company_id == company_id).all()

    def create(self, invoice_in: SalesInvoiceCreate, company_id: int) -> SalesInvoice:
        total = sum((l.quantity * l.rate - l.discount) * (1 + l.tax_rate/100) for l in invoice_in.lines)
        
        db_invoice = SalesInvoice(
            company_id=company_id,
            customer_id=invoice_in.customer_id,
            invoice_number=invoice_in.invoice_number,
            date=invoice_in.date,
            total_amount=total
        )
        self.db.add(db_invoice)
        self.db.flush()

        for line in invoice_in.lines:
            db_line = SalesInvoiceLine(
                invoice_id=db_invoice.id,
                item_id=line.item_id,
                quantity=line.quantity,
                rate=line.rate,
                discount=line.discount,
                tax_rate=line.tax_rate
            )
            self.db.add(db_line)
        self.db.flush()
        return db_invoice
