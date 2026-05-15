from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date

class CompanyBase(BaseModel):
    name: str = Field(..., max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    pan_number: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=10)
    currency: Optional[str] = Field(None, max_length=10)
    fiscal_year_start: Optional[date] = None
    fiscal_year_end: Optional[date] = None

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=50)
    pan_number: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=10)
    currency: Optional[str] = Field(None, max_length=10)

class CompanyResponse(CompanyBase):
    id: int
    owner_id: int
    tenant_id: int
    
    model_config = ConfigDict(from_attributes=True)
