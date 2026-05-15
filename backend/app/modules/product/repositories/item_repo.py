from sqlalchemy.orm import Session
from typing import List, Optional
from app.modules.product.models import Item
from app.modules.product.schemas import ItemCreate, ItemUpdate

class ProductRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, item_id: int, company_id: int) -> Optional[Item]:
        return self.db.query(Item).filter(Item.id == item_id, Item.company_id == company_id).first()

    def get_all(self, company_id: int, skip: int = 0, limit: int = 100) -> List[Item]:
        return self.db.query(Item).filter(Item.company_id == company_id).offset(skip).limit(limit).all()

    def create(self, item_in: ItemCreate) -> Item:
        db_item = Item(**item_in.model_dump())
        self.db.add(db_item)
        self.db.flush() # Let service handle commit
        return db_item

    def update(self, db_item: Item, item_in: ItemUpdate) -> Item:
        update_data = item_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_item, field, value)
        self.db.add(db_item)
        self.db.flush()
        return db_item
