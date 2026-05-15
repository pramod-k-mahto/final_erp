from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.inventory.models.warehouse import Warehouse, StockLedger
from app.modules.inventory.schemas.warehouse import WarehouseCreate

class InventoryRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_warehouse_by_id(self, warehouse_id: int, company_id: int) -> Optional[Warehouse]:
        return self.db.query(Warehouse).filter(
            Warehouse.id == warehouse_id,
            Warehouse.company_id == company_id
        ).first()

    def get_all_warehouses(self, company_id: int) -> List[Warehouse]:
        return self.db.query(Warehouse).filter(Warehouse.company_id == company_id).all()

    def create_warehouse(self, warehouse_in: WarehouseCreate, company_id: int) -> Warehouse:
        db_warehouse = Warehouse(
            company_id=company_id,
            name=warehouse_in.name,
            is_active=warehouse_in.is_active
        )
        self.db.add(db_warehouse)
        self.db.flush()
        return db_warehouse
