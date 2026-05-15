from typing import List, Callable
from fastapi import Request, HTTPException, status, Depends
import enum

from app.modules.auth.dependencies import get_current_user

class Permission(str, enum.Enum):
    """
    Fine-grained permissions for the ERP system.
    Follows the format: module:action
    """
    # Sales
    SALES_READ = "sales:read"
    SALES_CREATE = "sales:create"
    SALES_UPDATE = "sales:update"
    SALES_DELETE = "sales:delete"
    
    # Inventory
    INVENTORY_READ = "inventory:read"
    INVENTORY_CREATE = "inventory:create"
    INVENTORY_ADJUST = "inventory:adjust"
    
    # Accounting
    ACCOUNTING_READ = "accounting:read"
    ACCOUNTING_POST = "accounting:post"
    
    # System
    USERS_MANAGE = "users:manage"
    SETTINGS_MANAGE = "settings:manage"

class Role(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"
    TENANT = "TENANT"
    GHOST_BILLING = "ghost_billing"
    GHOST_SUPPORT = "ghost_support"
    GHOST_TECH = "ghost_tech"

# Role-Based Policies (What roles get what permissions implicitly)
ROLE_POLICIES = {
    Role.SUPERADMIN: [p.value for p in Permission], # Superadmin gets everything
    Role.ADMIN: [
        Permission.SALES_READ, Permission.SALES_CREATE, Permission.SALES_UPDATE,
        Permission.INVENTORY_READ, Permission.INVENTORY_CREATE, Permission.INVENTORY_ADJUST,
        Permission.ACCOUNTING_READ, Permission.USERS_MANAGE
    ],
    Role.USER: [
        Permission.SALES_READ, Permission.INVENTORY_READ
    ]
}

class RequirePermissions:
    """
    Decorator-based enforcement for FastAPI routes.
    Usage:
    @router.post("/", dependencies=[Depends(RequirePermissions([Permission.SALES_CREATE]))])
    """
    def __init__(self, required_permissions: List[Permission]):
        self.required_permissions = required_permissions

    def __call__(self, user: dict = Depends(get_current_user)):
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
            
        user_role = user.get("role")
        
        # 1. Check if user's role implicitly grants the permission
        role_permissions = ROLE_POLICIES.get(user_role, [])
        has_role_permission = all(req.value in role_permissions for req in self.required_permissions)
        
        if has_role_permission:
            return True
            
        # 2. Check if user has explicit tenant-level permissions assigned to them
        user_explicit_permissions = user.get("permissions", [])
        has_explicit_permission = all(req.value in user_explicit_permissions for req in self.required_permissions)
        
        if has_explicit_permission:
            return True
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You do not have the required permissions: {[p.value for p in self.required_permissions]}"
        )

# Helper function to easily use in routes
def require_permissions(*permissions: Permission) -> Callable:
    return RequirePermissions(list(permissions))
