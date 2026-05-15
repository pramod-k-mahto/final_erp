import pytest
from app.modules.product.schemas import ItemCreate
from app.modules.product.exceptions import DuplicateSKUException

def test_create_product_success(db_session, product_service):
    item_in = ItemCreate(name="Test Item", sku="TEST-001", company_id=1)
    result = product_service.create_product(item_in)
    
    assert result.id is not None
    assert result.name == "Test Item"
    assert result.sku == "TEST-001"

def test_create_product_duplicate_sku(db_session, product_service):
    item_in = ItemCreate(name="Test Item", sku="TEST-001", company_id=1)
    product_service.create_product(item_in)
    
    # Second creation with same SKU should fail
    with pytest.raises(DuplicateSKUException):
        product_service.create_product(item_in)
