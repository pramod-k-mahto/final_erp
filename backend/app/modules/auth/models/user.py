"""
Modular auth/user model - imports from the unified models.py during migration.
Once fully migrated, models can be defined here directly.
"""

from app.models import User, User as EnterpriseUser

__all__ = ["User", "EnterpriseUser"]