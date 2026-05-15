from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class WarehouseCreate(BaseModel):
    name: str
    is_active: bool = True

class WarehouseResponse(WarehouseCreate):
    id: int
    company_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StockLedgerEntry(BaseModel):
    item_id: int
    warehouse_id: int
    qty_delta: float
    unit_cost: float
    source_type: str
    source_id: int
    
    model_config = ConfigDict(from_attributes=True)
