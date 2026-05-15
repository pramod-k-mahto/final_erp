"""
Modular purchase bill model - imports from the unified models.py during migration.
"""
from app.models import PurchaseBill, PurchaseBillLine

__all__ = ["PurchaseBill", "PurchaseBillLine"]
