"""
Modular sales order models - imports from the unified models.py during migration.
"""
from backend.app.models import SalesOrder, SalesOrderLine

__all__ = ["SalesOrder", "SalesOrderLine"]
