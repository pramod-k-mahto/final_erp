from fastapi import APIRouter, Depends, status
from typing import List
from app.modules.sales.schemas.sales_invoice import SalesInvoiceCreate, SalesInvoiceResponse
from app.modules.sales.services.sales_service import SalesService
from app.modules.sales.dependencies import get_sales_service, get_current_company_id
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.post("/invoices", response_model=SalesInvoiceResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    invoice_in: SalesInvoiceCreate,
    service: SalesService = Depends(get_sales_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.create_invoice(invoice_in, company_id=company_id)

@router.get("/invoices", response_model=List[SalesInvoiceResponse])
def list_invoices(
    service: SalesService = Depends(get_sales_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.list_invoices(company_id)
