from sqlalchemy.orm import Session
from typing import List
from app.modules.inventory.repositories.inventory_repo import InventoryRepository
from app.modules.inventory.schemas.warehouse import WarehouseCreate, WarehouseResponse
from fastapi import HTTPException, status

class WarehouseNotFoundException(HTTPException):
    def __init__(self):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")

class InventoryService:
    def __init__(self, repository: InventoryRepository, db: Session):
        self.repo = repository
        self.db = db

    def list_warehouses(self, company_id: int) -> List[WarehouseResponse]:
        warehouses = self.repo.get_all_warehouses(company_id)
        return [WarehouseResponse.model_validate(w) for w in warehouses]

    def create_warehouse(self, warehouse_in: WarehouseCreate, company_id: int) -> WarehouseResponse:
        try:
            warehouse = self.repo.create_warehouse(warehouse_in, company_id)
            self.db.commit()
            self.db.refresh(warehouse)
            return WarehouseResponse.model_validate(warehouse)
        except Exception:
            self.db.rollback()
            raise
