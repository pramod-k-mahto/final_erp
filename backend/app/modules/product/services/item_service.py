from sqlalchemy.orm import Session
from typing import List
from app.modules.product.repositories import ProductRepository
from app.modules.product.schemas import ItemCreate, ItemUpdate, ItemResponse
from app.modules.product.exceptions import ProductNotFoundException
from app.modules.product.validators import validate_unique_sku

class ProductService:
    def __init__(self, repository: ProductRepository, db: Session):
        self.repo = repository
        self.db = db # Kept for transaction control

    def get_product(self, item_id: int, company_id: int) -> ItemResponse:
        item = self.repo.get_by_id(item_id, company_id)
        if not item:
            raise ProductNotFoundException(item_id)
        return ItemResponse.model_validate(item)

    def list_products(self, company_id: int, skip: int = 0, limit: int = 100) -> List[ItemResponse]:
        items = self.repo.get_all(company_id, skip, limit)
        return [ItemResponse.model_validate(item) for item in items]

    def create_product(self, item_in: ItemCreate) -> ItemResponse:
        if item_in.sku:
            validate_unique_sku(self.db, item_in.sku, item_in.company_id)
            
        try:
            db_item = self.repo.create(item_in)
            self.db.commit()
            self.db.refresh(db_item)
            return ItemResponse.model_validate(db_item)
        except Exception:
            self.db.rollback()
            raise

    def update_product(self, item_id: int, company_id: int, item_in: ItemUpdate) -> ItemResponse:
        db_item = self.repo.get_by_id(item_id, company_id)
        if not db_item:
            raise ProductNotFoundException(item_id)
            
        if item_in.sku:
            validate_unique_sku(self.db, item_in.sku, company_id, exclude_id=item_id)

        try:
            updated_item = self.repo.update(db_item, item_in)
            self.db.commit()
            self.db.refresh(updated_item)
            return ItemResponse.model_validate(updated_item)
        except Exception:
            self.db.rollback()
            raise
