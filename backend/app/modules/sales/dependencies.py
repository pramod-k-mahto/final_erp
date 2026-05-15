from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.sales.repositories.sales_repo import SalesRepository
from app.modules.sales.services.sales_service import SalesService

def get_sales_repository(db: Session = Depends(get_db)) -> SalesRepository:
    return SalesRepository(db)

def get_sales_service(
    db: Session = Depends(get_db),
    repo: SalesRepository = Depends(get_sales_repository)
) -> SalesService:
    return SalesService(repository=repo, db=db)

def get_current_company_id() -> int:
    return 1
