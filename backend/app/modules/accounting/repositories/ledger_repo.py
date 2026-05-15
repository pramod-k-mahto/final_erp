from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.accounting.models.ledger import Ledger
from app.modules.accounting.schemas.ledger import LedgerCreate

class LedgerRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, ledger_id: int, company_id: int) -> Optional[Ledger]:
        return self.db.query(Ledger).filter(
            Ledger.id == ledger_id, 
            Ledger.company_id == company_id
        ).first()

    def get_all_for_company(self, company_id: int) -> List[Ledger]:
        return self.db.query(Ledger).filter(Ledger.company_id == company_id).all()

    def create(self, ledger_in: LedgerCreate, company_id: int) -> Ledger:
        db_ledger = Ledger(
            **ledger_in.model_dump(),
            company_id=company_id
        )
        self.db.add(db_ledger)
        self.db.flush()
        return db_ledger
