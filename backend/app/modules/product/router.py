from fastapi import APIRouter, Depends, status
from typing import List
from app.modules.product.schemas import ItemCreate, ItemUpdate, ItemResponse
from app.modules.product.services import ProductService
from app.modules.product.dependencies import get_product_service

# Temporary dummy dependency until core.security is implemented
def get_current_company_id() -> int:
    return 1

router = APIRouter(prefix="/products", tags=["Products"])

@router.post("/", response_model=ItemResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    item_in: ItemCreate,
    service: ProductService = Depends(get_product_service),
    company_id: int = Depends(get_current_company_id)
):
    item_in.company_id = company_id
    return service.create_product(item_in)

@router.get("/{item_id}", response_model=ItemResponse)
def get_product(
    item_id: int,
    service: ProductService = Depends(get_product_service),
    company_id: int = Depends(get_current_company_id)
):
    return service.get_product(item_id, company_id)

@router.get("/", response_model=List[ItemResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    service: ProductService = Depends(get_product_service),
    company_id: int = Depends(get_current_company_id)
):
    return service.list_products(company_id, skip, limit)

@router.put("/{item_id}", response_model=ItemResponse)
def update_product(
    item_id: int,
    item_in: ItemUpdate,
    service: ProductService = Depends(get_product_service),
    company_id: int = Depends(get_current_company_id)
):
    return service.update_product(item_id, company_id, item_in)
