from pydantic import BaseModel, Field, ConfigDict
from typing import Optional

class ItemBase(BaseModel):
    name: str = Field(..., max_length=255, description="Name of the product")
    code: Optional[str] = Field(None, max_length=100)
    sku: Optional[str] = Field(None, max_length=100)
    barcode: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    default_sales_rate: Optional[float] = Field(None, ge=0)
    default_purchase_rate: Optional[float] = Field(None, ge=0)
    is_active: bool = True

class ItemCreate(ItemBase):
    company_id: int = Field(..., description="Company ID this item belongs to")

class ItemUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    sku: Optional[str] = Field(None, max_length=100)
    default_sales_rate: Optional[float] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ItemResponse(ItemBase):
    id: int
    company_id: int
    
    model_config = ConfigDict(from_attributes=True)
