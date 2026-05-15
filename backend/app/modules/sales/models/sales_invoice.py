"""
Modular sales invoice model - imports from the unified models.py during migration.
"""
from app.models import SalesInvoice, SalesInvoiceLine

__all__ = ["SalesInvoice", "SalesInvoiceLine"]
