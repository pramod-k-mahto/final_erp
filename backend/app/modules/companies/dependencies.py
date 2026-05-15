from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.companies.repositories.company_repo import CompanyRepository
from app.modules.companies.services.company_service import CompanyService

def get_company_repository(db: Session = Depends(get_db)) -> CompanyRepository:
    return CompanyRepository(db)

def get_company_service(
    db: Session = Depends(get_db),
    repo: CompanyRepository = Depends(get_company_repository)
) -> CompanyService:
    return CompanyService(repository=repo, db=db)
