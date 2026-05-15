from fastapi import APIRouter, Depends, status
from typing import List
from app.modules.inventory.schemas.warehouse import WarehouseCreate, WarehouseResponse
from app.modules.inventory.services.inventory_service import InventoryService
from app.modules.inventory.dependencies import get_inventory_service, get_current_company_id
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    warehouse_in: WarehouseCreate,
    service: InventoryService = Depends(get_inventory_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.create_warehouse(warehouse_in, company_id=company_id)

@router.get("/warehouses", response_model=List[WarehouseResponse])
def list_warehouses(
    service: InventoryService = Depends(get_inventory_service),
    current_user: dict = Depends(get_current_user),
    company_id: int = Depends(get_current_company_id)
):
    return service.list_warehouses(company_id)
