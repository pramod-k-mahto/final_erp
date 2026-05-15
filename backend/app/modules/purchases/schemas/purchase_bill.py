from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime

class PurchaseBillLineCreate(BaseModel):
    item_id: int
    quantity: float
    rate: float
    discount: float = 0.0
    tax_rate: float = 0.0

class PurchaseBillCreate(BaseModel):
    supplier_id: int
    bill_number: str
    date: date
    lines: List[PurchaseBillLineCreate]

class PurchaseBillLineResponse(PurchaseBillLineCreate):
    id: int
    bill_id: int
    model_config = ConfigDict(from_attributes=True)

class PurchaseBillResponse(BaseModel):
    id: int
    company_id: int
    supplier_id: int
    bill_number: str
    date: date
    status: str
    total_amount: float
    created_at: datetime
    lines: List[PurchaseBillLineResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
