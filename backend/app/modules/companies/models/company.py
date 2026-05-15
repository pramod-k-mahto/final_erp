"""
Modular company model - imports from the unified models.py during migration.
Once fully migrated, models can be defined here directly.
"""
from app.models import Company, Company as EnterpriseCompany

__all__ = ["Company", "EnterpriseCompany"]
