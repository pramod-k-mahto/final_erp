from sqlalchemy.orm import Session
from typing import List
from app.modules.companies.repositories.company_repo import CompanyRepository
from app.modules.companies.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

class CompanyNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

class CompanyService:
    def __init__(self, repository: CompanyRepository, db: Session):
        self.repo = repository
        self.db = db

    def list_companies(self, tenant_id: int) -> List[CompanyResponse]:
        companies = self.repo.get_all_for_tenant(tenant_id)
        return [CompanyResponse.model_validate(c) for c in companies]

    def get_company(self, company_id: int, tenant_id: int) -> CompanyResponse:
        company = self.repo.get_by_id(company_id, tenant_id)
        if not company:
            raise CompanyNotFoundException()
        return CompanyResponse.model_validate(company)

    def create_company(self, company_in: CompanyCreate, owner_id: int, tenant_id: int) -> CompanyResponse:
        logger.info(f"Creating new company for tenant {tenant_id}")
        try:
            company = self.repo.create(company_in, owner_id, tenant_id)
            self.db.commit()
            self.db.refresh(company)
            # In an Event-Driven Architecture, we would publish "CompanyCreatedEvent" here!
            return CompanyResponse.model_validate(company)
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create company: {e}")
            raise

    def update_company(self, company_id: int, tenant_id: int, company_in: CompanyUpdate) -> CompanyResponse:
        company = self.repo.get_by_id(company_id, tenant_id)
        if not company:
            raise CompanyNotFoundException()
            
        try:
            updated = self.repo.update(company, company_in)
            self.db.commit()
            self.db.refresh(updated)
            return CompanyResponse.model_validate(updated)
        except Exception as e:
            self.db.rollback()
            raise
