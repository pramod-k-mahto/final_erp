from fastapi import APIRouter, Depends, status
from typing import List
from app.modules.purchases.schemas.purchase_bill import PurchaseBillCreate, PurchaseBillResponse
from app.modules.purchases.services.purchase_service import PurchaseService
from app.modules.purchases.dependencies import get_purchase_service, get_current_company_id
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/purchases", tags=["Purchases"])

@router.post("/bills", response_model=PurchaseBillResponse, status_code=status.HTTP_201_CREATED)
def create_bill(
    bill_in: PurchaseBillCreate,
    service: PurchaseService = Depends(get_purchase_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.create_bill(bill_in, company_id=company_id)

@router.get("/bills", response_model=List[PurchaseBillResponse])
def list_bills(
    service: PurchaseService = Depends(get_purchase_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.list_bills(company_id)
