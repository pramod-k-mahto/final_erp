from fastapi import Depends
from sqlalchemy.orm import Session
from app.database import get_db # Temporary import until core is ready
from app.modules.product.repositories import ProductRepository
from app.modules.product.services import ProductService

def get_product_repository(db: Session = Depends(get_db)) -> ProductRepository:
    return ProductRepository(db)

def get_product_service(
    db: Session = Depends(get_db),
    repo: ProductRepository = Depends(get_product_repository)
) -> ProductService:
    return ProductService(repository=repo, db=db)
