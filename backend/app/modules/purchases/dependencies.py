from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.purchases.repositories.purchase_repo import PurchaseRepository
from app.modules.purchases.services.purchase_service import PurchaseService

def get_purchase_repository(db: Session = Depends(get_db)) -> PurchaseRepository:
    return PurchaseRepository(db)

def get_purchase_service(
    db: Session = Depends(get_db),
    repo: PurchaseRepository = Depends(get_purchase_repository)
) -> PurchaseService:
    return PurchaseService(repository=repo, db=db)

def get_current_company_id() -> int:
    return 1
