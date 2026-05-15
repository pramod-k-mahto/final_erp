from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app import schemas, models
from app.database import get_db
from app.auth import get_current_user
from app.routers.inventory import list_items

router = APIRouter(prefix="/product", tags=["Product Compatibility"])

@router.get("/items", response_model=list[schemas.ItemRead])
def list_items_compat(
    company_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # This is a compatibility shim for the frontend which was migrated to use /api/v1/product/items
    # It redirects to the original list_items logic in inventory.py
    return list_items(
        company_id=company_id,
        db=db,
        current_user=current_user
    )
