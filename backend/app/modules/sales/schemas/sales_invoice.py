from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime

class SalesInvoiceLineCreate(BaseModel):
    item_id: int
    quantity: float
    rate: float
    discount: float = 0.0
    tax_rate: float = 0.0

class SalesInvoiceCreate(BaseModel):
    customer_id: int
    invoice_number: str
    date: date
    lines: List[SalesInvoiceLineCreate]

class SalesInvoiceLineResponse(SalesInvoiceLineCreate):
    id: int
    invoice_id: int
    model_config = ConfigDict(from_attributes=True)

class SalesInvoiceResponse(BaseModel):
    id: int
    company_id: int
    customer_id: int
    invoice_number: str
    date: date
    status: str
    total_amount: float
    created_at: datetime
    lines: List[SalesInvoiceLineResponse] = []
    
    model_config = ConfigDict(from_attributes=True)
