"""
Modular item model - imports from the unified models.py during migration.
Once fully migrated, models can be defined here directly.
"""

from app.models import Item, Item as EnterpriseItem

__all__ = ["Item", "EnterpriseItem"]