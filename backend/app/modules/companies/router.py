from fastapi import APIRouter, Depends, status
from typing import List
from app.modules.companies.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse
from app.modules.companies.services.company_service import CompanyService
from app.modules.companies.dependencies import get_company_service
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/companies", tags=["Companies"])

@router.post("/", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
def create_company(
    company_in: CompanyCreate,
    service: CompanyService = Depends(get_company_service),
    current_user: dict = Depends(get_current_user)
):
    return service.create_company(company_in, owner_id=current_user["id"], tenant_id=current_user.get("tenant_id", 1))

@router.get("/", response_model=List[CompanyResponse])
def list_companies(
    service: CompanyService = Depends(get_company_service),
    current_user: dict = Depends(get_current_user)
):
    return service.list_companies(current_user.get("tenant_id", 1))

@router.get("/{company_id}", response_model=CompanyResponse)
def get_company(
    company_id: int,
    service: CompanyService = Depends(get_company_service),
    current_user: dict = Depends(get_current_user)
):
    return service.get_company(company_id, current_user.get("tenant_id", 1))

@router.put("/{company_id}", response_model=CompanyResponse)
def update_company(
    company_id: int,
    company_in: CompanyUpdate,
    service: CompanyService = Depends(get_company_service),
    current_user: dict = Depends(get_current_user)
):
    return service.update_company(company_id, current_user.get("tenant_id", 1), company_in)
