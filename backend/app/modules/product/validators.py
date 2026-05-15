from sqlalchemy.orm import Session
from app.modules.product.models import Item
from app.modules.product.exceptions import DuplicateSKUException

def validate_unique_sku(db: Session, sku: str, company_id: int, exclude_id: int = None):
    """Business rule: SKU must be unique within a company."""
    if not sku:
        return
    query = db.query(Item).filter(Item.sku == sku, Item.company_id == company_id)
    if exclude_id:
        query = query.filter(Item.id != exclude_id)
    if query.first():
        raise DuplicateSKUException(sku=sku)
