from __future__ import annotations

import uuid
from typing import List, Optional

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import import_export_models as ie
from app import models
from app.auth import get_current_user
from app.database import get_db
from app.dependencies import get_company_secure
from app.modules.import_export.dependencies import get_import_export_workflow
from app.modules.import_export.repositories.import_export_repository import ImportExportRepository
from app.modules.import_export.schemas import dto
from app.modules.import_export.services.workflow_service import ImportExportWorkflowService

imports_router = APIRouter(prefix="/imports", tags=["Imports"])
exports_router = APIRouter(prefix="/exports", tags=["Exports"])


def _dup(e: IntegrityError) -> HTTPException:
    return HTTPException(status_code=400, detail="Duplicate or invalid reference (unique constraint).")


def _validate_po_fx(payload: dto.ImportPurchaseOrderCreate) -> None:
    if payload.currency_code and payload.currency_code.strip():
        if payload.exchange_rate is None or float(payload.exchange_rate) <= 0:
            raise HTTPException(
                status_code=400,
                detail="When currency_code is set, exchange_rate must be provided and greater than zero.",
            )


# ---------------------------------------------------------------------------
# Imports — accounting profile
# ---------------------------------------------------------------------------


@imports_router.get("/companies/{company_id}/accounting-profile", response_model=dto.ImportAccountingProfileRead | None)
def get_import_accounting_profile(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    row = db.query(ie.ImportAccountingProfile).filter(ie.ImportAccountingProfile.company_id == company_id).first()
    return row


@imports_router.put("/companies/{company_id}/accounting-profile", response_model=dto.ImportAccountingProfileRead)
def upsert_import_accounting_profile(
    company_id: int,
    body: dto.ImportAccountingProfileUpsert,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    row = db.query(ie.ImportAccountingProfile).filter(ie.ImportAccountingProfile.company_id == company_id).first()
    if not row:
        row = ie.ImportAccountingProfile(company_id=company_id)
        db.add(row)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(row)
    return row


# ---------------------------------------------------------------------------
# Imports — purchase orders
# ---------------------------------------------------------------------------


@imports_router.get("/companies/{company_id}/purchase-orders", response_model=List[dto.ImportPurchaseOrderRead])
def list_import_purchase_orders(
    company_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_pos(company_id, skip=skip, limit=limit)


@imports_router.post("/companies/{company_id}/purchase-orders", response_model=dto.ImportPurchaseOrderRead, status_code=status.HTTP_201_CREATED)
def create_import_purchase_order(
    company_id: int,
    payload: dto.ImportPurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    _validate_po_fx(payload)
    sup = (
        db.query(models.Supplier)
        .filter(models.Supplier.id == payload.supplier_id, models.Supplier.company_id == company_id)
        .first()
    )
    if not sup:
        raise HTTPException(status_code=400, detail="Supplier not found for company")

    po = ie.ImportPurchaseOrder(
        company_id=company_id,
        supplier_id=payload.supplier_id,
        po_no=payload.po_no.strip(),
        currency_code=payload.currency_code,
        exchange_rate=payload.exchange_rate,
        incoterm=payload.incoterm,
        country_of_origin=payload.country_of_origin,
        expected_arrival_date=payload.expected_arrival_date,
        remarks=payload.remarks,
        status=payload.status,
        purchase_bill_id=payload.purchase_bill_id,
        created_by=current_user.id,
    )
    db.add(po)
    db.flush()
    for li in payload.items:
        db.add(
            ie.ImportPurchaseOrderItem(
                import_purchase_order_id=po.id,
                item_id=li.item_id,
                quantity=li.quantity,
                rate=li.rate,
                discount=li.discount,
                tax_rate=li.tax_rate,
                line_no=li.line_no,
                remarks=li.remarks,
            )
        )
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(po)
    return ImportExportRepository(db).get_po(company_id, po.id)


@imports_router.get("/companies/{company_id}/purchase-orders/{po_id}", response_model=dto.ImportPurchaseOrderRead)
def get_import_purchase_order(
    company_id: int,
    po_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    po = ImportExportRepository(db).get_po(company_id, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Import purchase order not found")
    return po


@imports_router.delete("/companies/{company_id}/purchase-orders/{po_id}", status_code=status.HTTP_204_NO_CONTENT)
def soft_delete_import_purchase_order(
    company_id: int,
    po_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    from datetime import datetime

    get_company_secure(db, company_id, current_user)
    po = db.query(ie.ImportPurchaseOrder).filter(ie.ImportPurchaseOrder.id == po_id, ie.ImportPurchaseOrder.company_id == company_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Not found")
    po.deleted_at = datetime.utcnow()
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Imports — LC
# ---------------------------------------------------------------------------


@imports_router.get("/companies/{company_id}/lc", response_model=List[dto.LcRecordRead])
def list_lc_records(
    company_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_lcs(company_id, skip=skip, limit=limit)


@imports_router.post("/companies/{company_id}/lc", response_model=dto.LcRecordRead, status_code=status.HTTP_201_CREATED)
def create_lc_record(
    company_id: int,
    payload: dto.LcRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    if payload.import_purchase_order_id:
        if not ImportExportRepository(db).get_po(company_id, payload.import_purchase_order_id):
            raise HTTPException(status_code=400, detail="Import PO not found")
    lc = ie.LcRecord(
        company_id=company_id,
        import_purchase_order_id=payload.import_purchase_order_id,
        lc_no=payload.lc_no.strip(),
        lc_date=payload.lc_date,
        lc_bank=payload.lc_bank,
        lc_amount=payload.lc_amount,
        lc_expiry_date=payload.lc_expiry_date,
        margin_amount=payload.margin_amount,
        swift_charge=payload.swift_charge,
        bank_charge=payload.bank_charge,
        lc_status=payload.lc_status,
    )
    db.add(lc)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(lc)
    return lc


@imports_router.get("/companies/{company_id}/lc/{lc_id}", response_model=dto.LcRecordRead)
def get_lc_record(
    company_id: int,
    lc_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    row = ImportExportRepository(db).get_lc(company_id, lc_id)
    if not row:
        raise HTTPException(status_code=404, detail="LC record not found")
    return row


@imports_router.patch("/companies/{company_id}/lc/{lc_id}", response_model=dto.LcRecordRead)
def update_lc_record(
    company_id: int,
    lc_id: uuid.UUID,
    payload: dto.LcRecordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    lc = db.query(ie.LcRecord).filter(ie.LcRecord.id == lc_id, ie.LcRecord.company_id == company_id).first()
    if not lc:
        raise HTTPException(status_code=404, detail="LC record not found")
    if lc.margin_voucher_id:
        raise HTTPException(status_code=400, detail="Cannot edit LC after margin voucher has been posted.")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(lc, field, value)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.refresh(lc)
    return lc

@imports_router.post("/companies/{company_id}/lc/{lc_id}/post-margin-voucher", response_model=dto.LcRecordRead)
def post_lc_margin_voucher(
    company_id: int,
    lc_id: uuid.UUID,
    voucher_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    return wf.post_lc_margin_voucher(company_id=company_id, lc_id=lc_id, voucher_date=voucher_date)


# ---------------------------------------------------------------------------
# Imports — shipments & customs
# ---------------------------------------------------------------------------


@imports_router.post("/companies/{company_id}/shipments", response_model=dto.ImportShipmentRead, status_code=status.HTTP_201_CREATED)
def create_import_shipment(
    company_id: int,
    payload: dto.ImportShipmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    if not ImportExportRepository(db).get_po(company_id, payload.import_purchase_order_id):
        raise HTTPException(
            status_code=400,
            detail=(
                "Import purchase order not found for this company. "
                "Use GET /api/v1/imports/companies/{company_id}/purchase-orders to obtain a valid id, "
                "and send it as importPurchaseOrderId (or import_purchase_order_id) in the JSON body."
            ),
        )
    sh = ie.ImportShipment(
        company_id=company_id,
        import_purchase_order_id=payload.import_purchase_order_id,
        shipment_no=payload.shipment_no.strip(),
        shipment_date=payload.shipment_date,
        arrival_date=payload.arrival_date,
        vessel_name=payload.vessel_name,
        container_no=payload.container_no,
        container_size=payload.container_size,
        bl_no=payload.bl_no,
        bl_date=payload.bl_date,
        airway_bill_no=payload.airway_bill_no,
        package_count=payload.package_count,
        gross_weight=payload.gross_weight,
        net_weight=payload.net_weight,
        port_of_loading=payload.port_of_loading,
        port_of_entry=payload.port_of_entry,
        shipping_company=payload.shipping_company,
        forwarding_agent=payload.forwarding_agent,
        status=payload.status,
    )
    db.add(sh)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raw = (getattr(e, "orig", None) and str(e.orig)) or str(e)
        low = raw.lower()
        if "uq_import_shipments_company_shipment_no" in low or "shipment_no" in low:
            raise HTTPException(
                status_code=400,
                detail="A shipment with this shipment number already exists for this company.",
            ) from e
        if "uq_import_shipments_company_bl" in low or ("bl_no" in low and "unique" in low):
            raise HTTPException(
                status_code=400,
                detail="A shipment with this BL number already exists for this company.",
            ) from e
        raise _dup(e) from e
    db.refresh(sh)
    return sh


@imports_router.get("/companies/{company_id}/shipments", response_model=List[dto.ImportShipmentRead])
def list_import_shipments(
    company_id: int,
    import_purchase_order_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_import_shipments(
        company_id, import_purchase_order_id=import_purchase_order_id, skip=skip, limit=limit
    )


@imports_router.patch("/companies/{company_id}/purchase-orders/{po_id}", response_model=dto.ImportPurchaseOrderRead)
def update_import_purchase_order(
    company_id: int,
    po_id: uuid.UUID,
    payload: dto.ImportPurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    po = db.query(ie.ImportPurchaseOrder).filter(ie.ImportPurchaseOrder.id == po_id, ie.ImportPurchaseOrder.company_id == company_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    data = payload.model_dump(exclude_unset=True)
    items_data = data.pop("items", None)
    
    for field, value in data.items():
        setattr(po, field, value)
    
    if items_data is not None:
        # Basic item sync: update existing or add new
        existing_items = {item.id: item for item in po.items}
        for item_in in items_data:
            iid = item_in.get("id")
            if iid and iid in existing_items:
                target = existing_items[iid]
                for f, v in item_in.items():
                    if f != "id":
                        setattr(target, f, v)
            else:
                db.add(
                    ie.ImportPurchaseOrderItem(
                        import_purchase_order_id=po.id,
                        item_id=item_in.get("item_id"),
                        quantity=item_in.get("quantity", 0),
                        rate=item_in.get("rate", 0),
                        discount=item_in.get("discount", 0),
                        tax_rate=item_in.get("tax_rate", 0),
                        line_no=item_in.get("line_no", 1),
                        remarks=item_in.get("remarks"),
                    )
                )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.refresh(po)
    return po


@imports_router.get("/companies/{company_id}/shipments/{shipment_id}", response_model=dto.ImportShipmentRead)
def get_import_shipment(
    company_id: int,
    shipment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    sh = ImportExportRepository(db).get_shipment(company_id, shipment_id)
    if not sh:
        raise HTTPException(status_code=404, detail="Import shipment not found")
    return sh


@imports_router.patch("/companies/{company_id}/shipments/{shipment_id}", response_model=dto.ImportShipmentRead)
def update_import_shipment(
    company_id: int,
    shipment_id: uuid.UUID,
    payload: dto.ImportShipmentUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    sh = db.query(ie.ImportShipment).filter(ie.ImportShipment.id == shipment_id, ie.ImportShipment.company_id == company_id).first()
    if not sh:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(sh, field, value)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.refresh(sh)
    return sh


@imports_router.post("/companies/{company_id}/shipments/{shipment_id}/post-git-voucher", response_model=dto.ImportShipmentRead)
def post_shipment_git_voucher(
    company_id: int,
    shipment_id: uuid.UUID,
    body: dto.PostGitVoucherBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    return wf.post_shipment_git_voucher(
        company_id=company_id, shipment_id=shipment_id, amount=body.amount, voucher_date=body.voucher_date
    )


@imports_router.post("/companies/{company_id}/customs", response_model=dto.ImportCustomsEntryRead, status_code=status.HTTP_201_CREATED)
def create_import_customs(
    company_id: int,
    payload: dto.ImportCustomsEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    sh = ImportExportRepository(db).get_shipment(company_id, payload.import_shipment_id)
    if not sh:
        raise HTTPException(status_code=400, detail="Shipment not found")
    c = ie.ImportCustomsEntry(
        company_id=company_id,
        import_shipment_id=payload.import_shipment_id,
        pragyapan_patra_no=payload.pragyapan_patra_no,
        pragyapan_date=payload.pragyapan_date,
        customs_office=payload.customs_office,
        agent_name=payload.agent_name,
        customs_reference_no=payload.customs_reference_no,
        customs_duty=payload.customs_duty,
        vat_amount=payload.vat_amount,
        excise_amount=payload.excise_amount,
        advance_tax=payload.advance_tax,
        customs_rate=payload.customs_rate,
        hs_code=payload.hs_code,
        customs_valuation=payload.customs_valuation,
    )
    db.add(c)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(c)
    return c


@imports_router.get("/companies/{company_id}/customs", response_model=List[dto.ImportCustomsEntryRead])
def list_import_customs_entries(
    company_id: int,
    import_shipment_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_import_customs_entries(
        company_id, import_shipment_id=import_shipment_id, skip=skip, limit=limit
    )


@imports_router.get("/companies/{company_id}/customs/{entry_id}", response_model=dto.ImportCustomsEntryRead)
def get_import_customs_entry(
    company_id: int,
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    row = ImportExportRepository(db).get_import_customs_entry(company_id, entry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Import customs entry not found")
    return row


# ---------------------------------------------------------------------------
# Imports — expenses
# ---------------------------------------------------------------------------


@imports_router.get("/companies/{company_id}/expenses", response_model=List[dto.ImportExpenseRead])
def list_import_expenses(
    company_id: int,
    import_shipment_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_import_expenses(
        company_id, import_shipment_id=import_shipment_id, skip=skip, limit=limit
    )


@imports_router.get("/companies/{company_id}/expenses/{expense_id}", response_model=dto.ImportExpenseRead)
def get_import_expense(
    company_id: int,
    expense_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    row = ImportExportRepository(db).get_import_expense(company_id, expense_id)
    if not row:
        raise HTTPException(status_code=404, detail="Import expense not found")
    return row


@imports_router.post("/companies/{company_id}/expenses", response_model=dto.ImportExpenseRead, status_code=status.HTTP_201_CREATED)
def create_import_expense(
    company_id: int,
    payload: dto.ImportExpenseCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    if payload.import_shipment_id and not ImportExportRepository(db).get_shipment(company_id, payload.import_shipment_id):
        raise HTTPException(status_code=400, detail="Shipment not found")
    ex = ie.ImportExpense(
        company_id=company_id,
        import_shipment_id=payload.import_shipment_id,
        expense_type=payload.expense_type,
        expense_bill_no=payload.expense_bill_no,
        expense_bill_date=payload.expense_bill_date,
        vendor_name=payload.vendor_name,
        amount=payload.amount,
        vat_amount=payload.vat_amount,
        allocation_method=payload.allocation_method,
        ledger_id=payload.ledger_id,
    )

    db.add(ex)
    db.commit()
    db.refresh(ex)
    return ex


@imports_router.post("/companies/{company_id}/expenses/{expense_id}/post-voucher", response_model=dto.ImportExpenseRead)
def post_import_expense_voucher(
    company_id: int,
    expense_id: uuid.UUID,
    voucher_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    return wf.post_import_expense_voucher(company_id=company_id, expense_id=expense_id, voucher_date=voucher_date)


# ---------------------------------------------------------------------------
# Imports — landed costs
# ---------------------------------------------------------------------------


@imports_router.post("/companies/{company_id}/landed-costs/compute", response_model=dto.ImportLandedCostRunRead)
def compute_landed_costs(
    company_id: int,
    body: dto.LandedCostComputeRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    run = wf.compute_landed_cost_run(company_id=company_id, po_id=body.import_purchase_order_id, allocation_method=body.allocation_method)
    return ImportExportRepository(db).get_landed_run(company_id, run.id)


@imports_router.get("/companies/{company_id}/landed-costs", response_model=List[dto.ImportLandedCostRunRead])
def list_landed_cost_runs(
    company_id: int,
    import_purchase_order_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_landed_cost_runs(
        company_id, import_purchase_order_id=import_purchase_order_id, skip=skip, limit=limit
    )


@imports_router.get("/companies/{company_id}/landed-costs/{run_id}", response_model=dto.ImportLandedCostRunRead)
def get_landed_cost_run(
    company_id: int,
    run_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    r = ImportExportRepository(db).get_landed_run(company_id, run_id)
    if not r:
        raise HTTPException(status_code=404, detail="Landed cost run not found")
    return r


# ---------------------------------------------------------------------------
# Imports — receipts (IN_TRANSIT warehouse)
# ---------------------------------------------------------------------------


@imports_router.get("/companies/{company_id}/receipts", response_model=List[dto.ImportReceiptRead])
def list_import_receipts(
    company_id: int,
    import_purchase_order_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_import_receipts(
        company_id, import_purchase_order_id=import_purchase_order_id, skip=skip, limit=limit
    )


@imports_router.post("/companies/{company_id}/receipts", response_model=dto.ImportReceiptRead, status_code=status.HTTP_201_CREATED)
def create_import_receipt(
    company_id: int,
    payload: dto.ImportReceiptCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    if not ImportExportRepository(db).get_po(company_id, payload.import_purchase_order_id):
        raise HTTPException(status_code=400, detail="Import PO not found")
    if payload.import_shipment_id and not ImportExportRepository(db).get_shipment(company_id, payload.import_shipment_id):
        raise HTTPException(status_code=400, detail="Shipment not found")
    git_wh = wf.ensure_in_transit_warehouse(company_id)
    rec = ie.ImportReceipt(
        company_id=company_id,
        import_purchase_order_id=payload.import_purchase_order_id,
        import_shipment_id=payload.import_shipment_id,
        receipt_no=payload.receipt_no.strip(),
        receipt_stage=ie.ImportReceiptStage.IN_TRANSIT.value,
        warehouse_id=int(git_wh.id),
        received_date=payload.received_date,
        received_by=payload.received_by,
        remarks=payload.remarks,
        status=ie.ImportReceiptStatus.DRAFT.value,
        created_by=current_user.id,
    )
    db.add(rec)
    db.flush()
    for li in payload.lines:
        tuc = float(li.total_unit_cost or 0)
        if tuc <= 0:
            tuc = float(li.unit_cost_base or 0) + float(li.landed_cost_per_unit or 0)
        db.add(
            ie.ImportReceiptLine(
                receipt_id=rec.id,
                item_id=li.item_id,
                import_purchase_order_item_id=li.import_purchase_order_item_id,
                quantity=li.quantity,
                unit_cost_base=li.unit_cost_base,
                landed_cost_per_unit=li.landed_cost_per_unit,
                total_unit_cost=tuc,
            )
        )
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(rec)
    return ImportExportRepository(db).get_receipt(company_id, rec.id)


@imports_router.post("/companies/{company_id}/receipts/{receipt_id}/post-in-transit", response_model=dto.ImportReceiptRead)
def post_import_receipt_in_transit(
    company_id: int,
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    wf.post_import_receipt_in_transit(company_id=company_id, receipt_id=receipt_id, user_id=current_user.id)
    return ImportExportRepository(db).get_receipt(company_id, receipt_id)


@imports_router.post("/companies/{company_id}/receipts/{receipt_id}/finalize-to-warehouse", response_model=dto.ImportReceiptRead)
def finalize_import_receipt(
    company_id: int,
    receipt_id: int,
    body: dto.FinalizeImportReceiptBody,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
    wf: ImportExportWorkflowService = Depends(get_import_export_workflow),
):
    get_company_secure(db, company_id, current_user)
    wf.finalize_import_receipt(
        company_id=company_id,
        receipt_id=receipt_id,
        to_warehouse_id=body.to_warehouse_id,
        user_id=current_user.id,
        post_stock_journal=body.post_stock_journal,
    )
    return ImportExportRepository(db).get_receipt(company_id, receipt_id)


@imports_router.get("/companies/{company_id}/receipts/{receipt_id}", response_model=dto.ImportReceiptRead)
def get_import_receipt(
    company_id: int,
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    r = ImportExportRepository(db).get_receipt(company_id, receipt_id)
    if not r:
        raise HTTPException(status_code=404, detail="Receipt not found")
    return r


# ---------------------------------------------------------------------------
# Exports
# ---------------------------------------------------------------------------


@exports_router.post("/companies/{company_id}/orders", response_model=dto.ExportOrderRead, status_code=status.HTTP_201_CREATED)
def create_export_order(
    company_id: int,
    payload: dto.ExportOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    cust = db.query(models.Customer).filter(models.Customer.id == payload.customer_id, models.Customer.company_id == company_id).first()
    if not cust:
        raise HTTPException(status_code=400, detail="Customer not found")
    eo = ie.ExportOrder(
        company_id=company_id,
        customer_id=payload.customer_id,
        export_order_no=payload.export_order_no.strip(),
        currency_code=payload.currency_code,
        destination_country=payload.destination_country,
        incoterm=payload.incoterm,
        shipping_method=payload.shipping_method,
        status=payload.status,
        remarks=payload.remarks,
        created_by=current_user.id,
    )
    db.add(eo)
    db.flush()
    for li in payload.items:
        db.add(
            ie.ExportOrderItem(
                export_order_id=eo.id,
                item_id=li.item_id,
                quantity=li.quantity,
                rate=li.rate,
                discount=li.discount,
                tax_rate=li.tax_rate,
                line_no=li.line_no,
            )
        )
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(eo)
    return ImportExportRepository(db).get_export_order(company_id, eo.id)


@exports_router.get("/companies/{company_id}/orders", response_model=List[dto.ExportOrderRead])
def list_export_orders(
    company_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_export_orders(company_id, skip=skip, limit=limit)


@exports_router.get("/companies/{company_id}/orders/{order_id}", response_model=dto.ExportOrderRead)
def get_export_order(
    company_id: int,
    order_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    o = ImportExportRepository(db).get_export_order(company_id, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="Export order not found")
    return o


@exports_router.post("/companies/{company_id}/shipments", response_model=dto.ExportShipmentRead, status_code=status.HTTP_201_CREATED)
def create_export_shipment(
    company_id: int,
    payload: dto.ExportShipmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    if not ImportExportRepository(db).get_export_order(company_id, payload.export_order_id):
        raise HTTPException(status_code=400, detail="Export order not found")
    sh = ie.ExportShipment(
        company_id=company_id,
        export_order_id=payload.export_order_id,
        shipment_no=payload.shipment_no.strip(),
        container_no=payload.container_no,
        bl_no=payload.bl_no,
        airway_bill_no=payload.airway_bill_no,
        vessel_name=payload.vessel_name,
        export_customs_office=payload.export_customs_office,
        export_pragyapan_no=payload.export_pragyapan_no,
        shipped_date=payload.shipped_date,
    )
    db.add(sh)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(sh)
    return sh


@exports_router.get("/companies/{company_id}/shipments", response_model=List[dto.ExportShipmentRead])
def list_export_shipments(
    company_id: int,
    export_order_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_export_shipments(
        company_id, export_order_id=export_order_id, skip=skip, limit=limit
    )


@exports_router.get("/companies/{company_id}/shipments/{shipment_id}", response_model=dto.ExportShipmentRead)
def get_export_shipment(
    company_id: int,
    shipment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    sh = ImportExportRepository(db).get_export_shipment(company_id, shipment_id)
    if not sh:
        raise HTTPException(status_code=404, detail="Export shipment not found")
    return sh


@exports_router.post("/companies/{company_id}/customs", response_model=dto.ExportCustomsEntryRead, status_code=status.HTTP_201_CREATED)
def create_export_customs(
    company_id: int,
    payload: dto.ExportCustomsEntryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    sh = db.query(ie.ExportShipment).filter(ie.ExportShipment.id == payload.export_shipment_id, ie.ExportShipment.company_id == company_id).first()
    if not sh:
        raise HTTPException(status_code=400, detail="Export shipment not found")
    c = ie.ExportCustomsEntry(
        company_id=company_id,
        export_shipment_id=payload.export_shipment_id,
        reference_no=payload.reference_no,
        cleared_date=payload.cleared_date,
        remarks=payload.remarks,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


@exports_router.get("/companies/{company_id}/customs", response_model=List[dto.ExportCustomsEntryRead])
def list_export_customs_entries(
    company_id: int,
    export_shipment_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_export_customs_entries(
        company_id, export_shipment_id=export_shipment_id, skip=skip, limit=limit
    )


@exports_router.get("/companies/{company_id}/customs/{entry_id}", response_model=dto.ExportCustomsEntryRead)
def get_export_customs_entry(
    company_id: int,
    entry_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    row = ImportExportRepository(db).get_export_customs_entry(company_id, entry_id)
    if not row:
        raise HTTPException(status_code=404, detail="Export customs entry not found")
    return row


@exports_router.get("/companies/{company_id}/invoices", response_model=List[dto.ExportInvoiceRead])
def list_export_invoices(
    company_id: int,
    export_order_id: Optional[uuid.UUID] = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    return ImportExportRepository(db).list_export_invoices(
        company_id, export_order_id=export_order_id, skip=skip, limit=limit
    )


@exports_router.get("/companies/{company_id}/invoices/{invoice_id}", response_model=dto.ExportInvoiceRead)
def get_export_invoice(
    company_id: int,
    invoice_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    inv = ImportExportRepository(db).get_export_invoice(company_id, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Export invoice not found")
    return inv


@exports_router.post("/companies/{company_id}/invoices", response_model=dto.ExportInvoiceRead, status_code=status.HTTP_201_CREATED)
def create_export_invoice(
    company_id: int,
    payload: dto.ExportInvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    get_company_secure(db, company_id, current_user)
    if not ImportExportRepository(db).get_export_order(company_id, payload.export_order_id):
        raise HTTPException(status_code=400, detail="Export order not found")
    if payload.export_shipment_id:
        sh = db.query(ie.ExportShipment).filter(ie.ExportShipment.id == payload.export_shipment_id, ie.ExportShipment.company_id == company_id).first()
        if not sh:
            raise HTTPException(status_code=400, detail="Export shipment not found")
    inv = ie.ExportInvoice(
        company_id=company_id,
        export_order_id=payload.export_order_id,
        export_shipment_id=payload.export_shipment_id,
        invoice_no=payload.invoice_no.strip(),
        invoice_date=payload.invoice_date,
        export_value=payload.export_value,
        currency_rate=payload.currency_rate,
        taxable_amount=payload.taxable_amount,
        sales_invoice_id=payload.sales_invoice_id,
    )
    db.add(inv)
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise _dup(e) from e
    db.refresh(inv)
    return inv


api_import_export_router = APIRouter()
api_import_export_router.include_router(imports_router)
api_import_export_router.include_router(exports_router)
