from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
import enum

class LedgerGroupType(str, enum.Enum):
    ASSET = "ASSET"
    LIABILITY = "LIABILITY"
    EQUITY = "EQUITY"
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class OpeningBalanceType(str, enum.Enum):
    DEBIT = "DEBIT"
    CREDIT = "CREDIT"

class LedgerCreate(BaseModel):
    name: str = Field(..., max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    group_id: int
    opening_balance: float = 0.0
    opening_balance_type: OpeningBalanceType = OpeningBalanceType.DEBIT
    is_active: bool = True

class LedgerResponse(LedgerCreate):
    id: int
    company_id: int
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
