from fastapi import HTTPException, status

class ProductNotFoundException(HTTPException):
    def __init__(self, item_id: int):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {item_id} not found."
        )

class DuplicateSKUException(HTTPException):
    def __init__(self, sku: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Product with SKU '{sku}' already exists."
        )
