from fastapi import APIRouter
from app.modules.product.router import router as product_router
from app.modules.auth.router import router as auth_router
from app.modules.companies.router import router as companies_router
from app.modules.accounting.router import router as accounting_router
from app.modules.sales.router import router as sales_router
from app.modules.purchases.router import router as purchases_router
from app.modules.inventory.router import router as inventory_router
from app.modules.import_export.router import api_import_export_router

from app.api.v1.product_compat import router as product_compat_router

api_router = APIRouter()

# Register all module routers here
api_router.include_router(product_compat_router)
api_router.include_router(product_router)
api_router.include_router(auth_router)
api_router.include_router(companies_router)
api_router.include_router(accounting_router)
api_router.include_router(sales_router)
api_router.include_router(purchases_router)
api_router.include_router(inventory_router)
api_router.include_router(api_import_export_router)
# api_router.include_router(sales_router)
# api_router.include_router(inventory_router)
