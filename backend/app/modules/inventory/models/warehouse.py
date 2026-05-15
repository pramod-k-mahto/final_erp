"""
Modular warehouse model - imports from the unified models.py during migration.
"""
from app.models import Warehouse, StockLedger

__all__ = ["Warehouse", "StockLedger"]
