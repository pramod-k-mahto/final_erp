from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.purchases.models.purchase_bill import PurchaseBill, PurchaseBillLine
from app.modules.purchases.schemas.purchase_bill import PurchaseBillCreate

class PurchaseRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, bill_id: int, company_id: int) -> Optional[PurchaseBill]:
        return self.db.query(PurchaseBill).filter(
            PurchaseBill.id == bill_id,
            PurchaseBill.company_id == company_id
        ).first()

    def get_all_for_company(self, company_id: int) -> List[PurchaseBill]:
        return self.db.query(PurchaseBill).filter(PurchaseBill.company_id == company_id).all()

    def create(self, bill_in: PurchaseBillCreate, company_id: int) -> PurchaseBill:
        total = sum((l.quantity * l.rate - l.discount) * (1 + l.tax_rate/100) for l in bill_in.lines)
        
        db_bill = PurchaseBill(
            company_id=company_id,
            supplier_id=bill_in.supplier_id,
            bill_number=bill_in.bill_number,
            date=bill_in.date,
            total_amount=total
        )
        self.db.add(db_bill)
        self.db.flush()

        for line in bill_in.lines:
            db_line = PurchaseBillLine(
                bill_id=db_bill.id,
                item_id=line.item_id,
                quantity=line.quantity,
                rate=line.rate,
                discount=line.discount,
                tax_rate=line.tax_rate
            )
            self.db.add(db_line)
        self.db.flush()
        return db_bill
