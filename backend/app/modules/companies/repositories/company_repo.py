from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.companies.models.company import Company
from app.modules.companies.schemas.company import CompanyCreate, CompanyUpdate

class CompanyRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, company_id: int, tenant_id: int) -> Optional[Company]:
        return self.db.query(Company).filter(
            Company.id == company_id, 
            Company.tenant_id == tenant_id
        ).first()

    def get_all_for_tenant(self, tenant_id: int) -> List[Company]:
        return self.db.query(Company).filter(Company.tenant_id == tenant_id).all()

    def create(self, company_in: CompanyCreate, owner_id: int, tenant_id: int) -> Company:
        db_company = Company(
            **company_in.model_dump(),
            owner_id=owner_id,
            tenant_id=tenant_id
        )
        self.db.add(db_company)
        self.db.flush()
        return db_company

    def update(self, db_company: Company, company_in: CompanyUpdate) -> Company:
        update_data = company_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_company, field, value)
        self.db.add(db_company)
        self.db.flush()
        return db_company
