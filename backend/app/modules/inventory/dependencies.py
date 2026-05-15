from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.modules.inventory.repositories.inventory_repo import InventoryRepository
from app.modules.inventory.services.inventory_service import InventoryService

def get_inventory_repository(db: Session = Depends(get_db)) -> InventoryRepository:
    return InventoryRepository(db)

def get_inventory_service(
    db: Session = Depends(get_db),
    repo: InventoryRepository = Depends(get_inventory_repository)
) -> InventoryService:
    return InventoryService(repository=repo, db=db)

def get_current_company_id() -> int:
    return 1
