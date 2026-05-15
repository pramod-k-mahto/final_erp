from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    role: str
    is_active: bool
    tenant_id: Optional[int]
    
    model_config = ConfigDict(from_attributes=True)
