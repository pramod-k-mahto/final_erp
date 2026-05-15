from __future__ import annotations

import logging
import uuid
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models
from app import import_export_models as ie
from app.stock_service import StockValuationService
from app.services.import_export_journal import JournalLineSpec, create_journal_voucher
from app.modules.import_export.repositories.import_export_repository import ImportExportRepository

IN_TRANSIT_WH_CODE = "IN_TRANSIT"
logger = logging.getLogger(__name__)


def _line_value(qty: float, rate: float, discount: float, tax_rate: float) -> float:
    sub = float(qty) * float(rate) - float(discount or 0)
    return sub + sub * float(tax_rate or 0) / 100.0


class ImportExportWorkflowService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ImportExportRepository(db)

    def ensure_in_transit_warehouse(self, company_id: int) -> models.Warehouse:
        wh = (
            self.db.query(models.Warehouse)
            .filter(
                models.Warehouse.company_id == company_id,
                models.Warehouse.code == IN_TRANSIT_WH_CODE,
                models.Warehouse.is_active.is_(True),
            )
            .first()
        )
        if wh:
            return wh
        wh = models.Warehouse(
            company_id=company_id,
            code=IN_TRANSIT_WH_CODE,
            name="Goods In Transit",
            is_active=True,
        )
        self.db.add(wh)
        self.db.flush()
        return wh

    def compute_landed_cost_run(
        self,
        *,
        company_id: int,
        po_id: uuid.UUID,
        allocation_method: str,
    ) -> ie.ImportLandedCostRun:
        po = self.repo.get_po(company_id, po_id)
        if not po:
            raise HTTPException(status_code=404, detail="Import purchase order not found")
        active_items = [i for i in po.items if i.deleted_at is None]
        if not active_items:
            raise HTTPException(status_code=400, detail="PO has no active lines")

        shipments = self.repo.list_shipments_for_po(company_id, po_id)
        shipment_ids = [s.id for s in shipments]
        pool = 0.0
        for sid in shipment_ids:
            for c in self.repo.list_customs_for_shipment(sid):
                pool += float(c.customs_duty or 0) + float(c.vat_amount or 0) + float(c.excise_amount or 0) + float(
                    c.advance_tax or 0
                )
        for e in self.repo.list_expenses_for_company_shipments(company_id, shipment_ids):
            pool += float(e.amount or 0) + float(e.vat_amount or 0)

        run = ie.ImportLandedCostRun(
            company_id=company_id,
            import_purchase_order_id=po_id,
            allocation_method=allocation_method,
            status=ie.LandedRunStatus.DRAFT.value,
            total_pool=round(pool, 2),
            total_allocated=0.0,
        )
        self.db.add(run)
        self.db.flush()

        lines_out: list[ie.ImportLandedCostRunLine] = []
        if allocation_method == ie.LandedAllocationMethod.QUANTITY.value:
            tq = sum(float(i.quantity) for i in active_items)
            if tq <= 0:
                raise HTTPException(status_code=400, detail="Total quantity must be positive for quantity allocation")
            for it in active_items:
                share = float(it.quantity) / tq
                alloc = round(pool * share, 2)
                lines_out.append(
                    ie.ImportLandedCostRunLine(
                        run_id=run.id,
                        import_purchase_order_item_id=it.id,
                        basis_qty=float(it.quantity),
                        basis_value=0.0,
                        allocated_amount=alloc,
                    )
                )
        elif allocation_method == ie.LandedAllocationMethod.ITEM_VALUE.value:
            vals = [
                _line_value(float(i.quantity), float(i.rate), float(i.discount), float(i.tax_rate)) for i in active_items
            ]
            tv = sum(vals)
            if tv <= 0:
                raise HTTPException(status_code=400, detail="Total line value must be positive for value allocation")
            for it, v in zip(active_items, vals, strict=True):
                share = v / tv
                alloc = round(pool * share, 2)
                lines_out.append(
                    ie.ImportLandedCostRunLine(
                        run_id=run.id,
                        import_purchase_order_item_id=it.id,
                        basis_qty=float(it.quantity),
                        basis_value=round(v, 2),
                        allocated_amount=alloc,
                    )
                )
        elif allocation_method == ie.LandedAllocationMethod.MANUAL.value:
            raise HTTPException(
                status_code=400,
                detail="MANUAL allocation: create run via API with explicit line amounts (not implemented in compute).",
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid allocation_method")

        total_alloc = 0.0
        for ln in lines_out:
            self.db.add(ln)
            total_alloc += float(ln.allocated_amount)
        diff_remain = round(float(run.total_pool) - total_alloc, 2)
        if lines_out and abs(diff_remain) >= 0.01:
            last = lines_out[-1]
            last.allocated_amount = round(float(last.allocated_amount) + diff_remain, 2)
            total_alloc = sum(float(x.allocated_amount) for x in lines_out)
        run.total_allocated = round(total_alloc, 2)
        diff = abs(float(run.total_pool) - float(run.total_allocated))
        if diff > 0.05:
            raise HTTPException(
                status_code=400,
                detail=f"Landed cost rounding mismatch: pool={run.total_pool} allocated={run.total_allocated}",
            )
        self.db.commit()
        self.db.refresh(run)
        return run

    def post_import_receipt_in_transit(self, *, company_id: int, receipt_id: int, user_id: int | None) -> ie.ImportReceipt:
        rec = self.repo.get_receipt(company_id, receipt_id)
        if not rec:
            raise HTTPException(status_code=404, detail="Import receipt not found")
        if rec.status != "DRAFT":
            raise HTTPException(status_code=400, detail="Receipt is not in DRAFT status")
        git_wh = self.ensure_in_transit_warehouse(company_id)
        if int(rec.warehouse_id) != int(git_wh.id):
            raise HTTPException(status_code=400, detail="Receipt warehouse must be the IN_TRANSIT warehouse for this step")

        company = self.db.query(models.Company).filter(models.Company.id == company_id).first()
        if not company or company.tenant_id is None:
            raise HTTPException(status_code=400, detail="Company / tenant not found")
        tenant_id = int(company.tenant_id)
        if tenant_id <= 0:
            raise HTTPException(status_code=400, detail="Company tenant_id required for stock batch posting")
        now = datetime.utcnow()
        svc = StockValuationService(self.db)

        for line in rec.lines:
            qty = float(line.quantity)
            if qty <= 0:
                raise HTTPException(status_code=400, detail="Line quantity must be positive")
            rate = float(line.total_unit_cost or 0)
            if rate < 0:
                raise HTTPException(status_code=400, detail="Unit cost cannot be negative")

            svc.fifo_add_batch(
                tenant_id=tenant_id,
                product_id=int(line.item_id),
                qty_in=qty,
                rate=rate,
                ref_type="IMPORT_GIT_RECEIPT",
                ref_id=int(rec.id),
                created_at=now,
            )
            self.db.add(
                models.StockLedger(
                    company_id=company_id,
                    warehouse_id=int(rec.warehouse_id),
                    item_id=int(line.item_id),
                    qty_delta=qty,
                    unit_cost=rate,
                    source_type="IMPORT_GIT_RECEIPT",
                    source_id=int(rec.id),
                    source_line_id=int(line.id),
                    posted_at=now,
                    created_by=user_id,
                )
            )
            self.db.add(
                models.StockMovement(
                    company_id=company_id,
                    warehouse_id=int(rec.warehouse_id),
                    item_id=int(line.item_id),
                    movement_date=rec.received_date,
                    source_type="IMPORT_GIT_RECEIPT",
                    source_id=int(rec.id),
                    qty_in=qty,
                    qty_out=0,
                )
            )

        rec.status = ie.ImportReceiptStatus.IN_TRANSIT_POSTED.value
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def finalize_import_receipt(
        self,
        *,
        company_id: int,
        receipt_id: int,
        to_warehouse_id: int,
        user_id: int | None,
        post_stock_journal: bool = True,
    ) -> ie.ImportReceipt:
        from app.routers import inventory as inv

        rec = self.repo.get_receipt(company_id, receipt_id)
        if not rec:
            raise HTTPException(status_code=404, detail="Import receipt not found")
        if rec.status != ie.ImportReceiptStatus.IN_TRANSIT_POSTED.value:
            raise HTTPException(status_code=400, detail="Receipt must be IN_TRANSIT_POSTED before finalize")

        git_wh = self.ensure_in_transit_warehouse(company_id)
        if int(rec.warehouse_id) != int(git_wh.id):
            raise HTTPException(status_code=400, detail="Receipt is not booked in IN_TRANSIT warehouse")

        to_wh = (
            self.db.query(models.Warehouse)
            .filter(
                models.Warehouse.id == to_warehouse_id,
                models.Warehouse.company_id == company_id,
                models.Warehouse.is_active.is_(True),
            )
            .first()
        )
        if not to_wh:
            raise HTTPException(status_code=404, detail="Destination warehouse not found")
        if int(to_wh.id) == int(git_wh.id):
            raise HTTPException(status_code=400, detail="Destination must differ from IN_TRANSIT warehouse")

        company = self.db.query(models.Company).filter(models.Company.id == company_id).first()
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

        profile = self.repo.get_accounting_profile(company_id)
        now = datetime.utcnow()
        svc = StockValuationService(self.db)
        tenant_id = int(company.tenant_id) if company.tenant_id else 0

        total_transfer_value = 0.0
        for line in rec.lines:
            qty = float(line.quantity)
            unit_cost = inv._compute_issue_unit_cost(
                db=self.db,
                company=company,
                company_id=company_id,
                item_id=int(line.item_id),
                warehouse_id=int(git_wh.id),
                as_of=now,
                qty_out=qty,
            )
            line_value = unit_cost * qty
            total_transfer_value += line_value

            if tenant_id > 0:
                total_cost = svc.fifo_consume(
                    tenant_id=tenant_id,
                    product_id=int(line.item_id),
                    qty_out=qty,
                    ref_type="IMPORT_WH_XFER",
                    ref_id=int(rec.id),
                    allow_negative=True,
                    fallback_rate=float(line.total_unit_cost or unit_cost),
                )
                eff_rate = (total_cost / qty) if qty else float(line.total_unit_cost or 0)
                svc.fifo_add_batch(
                    tenant_id=tenant_id,
                    product_id=int(line.item_id),
                    qty_in=qty,
                    rate=eff_rate,
                    ref_type="IMPORT_WH_XFER",
                    ref_id=int(rec.id),
                    created_at=now,
                )

            self.db.add(
                models.StockLedger(
                    company_id=company_id,
                    warehouse_id=int(git_wh.id),
                    item_id=int(line.item_id),
                    qty_delta=-qty,
                    unit_cost=unit_cost,
                    source_type="IMPORT_WH_XFER",
                    source_id=int(rec.id),
                    source_line_id=int(line.id),
                    posted_at=now,
                    created_by=user_id,
                )
            )
            self.db.add(
                models.StockLedger(
                    company_id=company_id,
                    warehouse_id=int(to_warehouse_id),
                    item_id=int(line.item_id),
                    qty_delta=qty,
                    unit_cost=unit_cost,
                    source_type="IMPORT_WH_XFER",
                    source_id=int(rec.id),
                    source_line_id=int(line.id),
                    posted_at=now,
                    created_by=user_id,
                )
            )
            self.db.add(
                models.StockMovement(
                    company_id=company_id,
                    warehouse_id=int(git_wh.id),
                    item_id=int(line.item_id),
                    movement_date=rec.received_date,
                    source_type="IMPORT_WH_XFER",
                    source_id=int(rec.id),
                    qty_in=0,
                    qty_out=qty,
                )
            )
            self.db.add(
                models.StockMovement(
                    company_id=company_id,
                    warehouse_id=int(to_warehouse_id),
                    item_id=int(line.item_id),
                    movement_date=rec.received_date,
                    source_type="IMPORT_WH_XFER",
                    source_id=int(rec.id),
                    qty_in=qty,
                    qty_out=0,
                )
            )

        if post_stock_journal and total_transfer_value > 0:
            stock_ledger_id = inv._get_default_stock_ledger_id(self.db, company_id=company_id)
            git_ledger_id = profile.goods_in_transit_ledger_id if profile else None
            if not stock_ledger_id or not git_ledger_id:
                raise HTTPException(
                    status_code=400,
                    detail="Configure import accounting profile (goods_in_transit_ledger_id) and stock ledger defaults.",
                )
            v = create_journal_voucher(
                self.db,
                company_id=company_id,
                voucher_date=rec.received_date,
                narration=f"Import receipt #{rec.receipt_no}: GIT to {to_wh.name}",
                lines=[
                    JournalLineSpec(
                        ledger_id=stock_ledger_id,
                        debit=total_transfer_value,
                        credit=0,
                        department_id=to_wh.department_id,
                        project_id=to_wh.project_id,
                        remarks=f"Stock at {to_wh.name}",
                    ),
                    JournalLineSpec(
                        ledger_id=git_ledger_id,
                        debit=0,
                        credit=total_transfer_value,
                        department_id=git_wh.department_id,
                        project_id=git_wh.project_id,
                        remarks="Clear goods in transit",
                    ),
                ],
            )
            rec.final_journal_voucher_id = v.id

        rec.warehouse_id = to_warehouse_id
        rec.receipt_stage = ie.ImportReceiptStage.FINAL.value
        rec.status = ie.ImportReceiptStatus.FINALIZED.value
        self.db.commit()
        self.db.refresh(rec)
        return rec

    def post_lc_margin_voucher(self, *, company_id: int, lc_id: uuid.UUID, voucher_date: date | None) -> ie.LcRecord:
        lc = self.repo.get_lc(company_id, lc_id)
        if not lc:
            raise HTTPException(status_code=404, detail="LC not found")
        if lc.margin_voucher_id:
            raise HTTPException(status_code=400, detail="LC margin voucher already posted")

        profile = self.repo.get_accounting_profile(company_id)
        if not profile or not profile.lc_margin_ledger_id or not profile.default_bank_ledger_id:
            missing: list[str] = []
            if not profile:
                missing.append("import accounting profile row")
            else:
                if not profile.lc_margin_ledger_id:
                    missing.append("lc_margin_ledger_id")
                if not profile.default_bank_ledger_id:
                    missing.append("default_bank_ledger_id")
            detail = (
                "Import accounting profile is incomplete ("
                + ", ".join(missing)
                + "). Set lc_margin_ledger_id and default_bank_ledger_id via "
                + "PUT /api/v1/imports/companies/{company_id}/accounting-profile, "
                + "or apply migration 20260511_05_import_accounting_profile_ledger_backfill.sql."
            )
            logger.warning(
                "post_lc_margin_voucher blocked company_id=%s lc_id=%s: %s",
                company_id,
                lc_id,
                detail,
            )
            raise HTTPException(status_code=400, detail=detail)

        total_dr = float(lc.margin_amount or 0) + float(lc.swift_charge or 0) + float(lc.bank_charge or 0)
        if total_dr <= 0:
            logger.warning(
                "post_lc_margin_voucher blocked company_id=%s lc_id=%s: zero margin and charges",
                company_id,
                lc_id,
            )
            raise HTTPException(
                status_code=400,
                detail="Nothing to post: margin_amount, swift_charge, and bank_charge are all zero on this LC.",
            )

        vd = voucher_date or lc.lc_date
        lines: list[JournalLineSpec] = []
        ma = float(lc.margin_amount or 0)
        if ma > 0:
            lines.append(JournalLineSpec(ledger_id=profile.lc_margin_ledger_id, debit=ma, credit=0))
        expense_ledger = profile.import_expense_ledger_id or profile.lc_margin_ledger_id
        bank_charges = float(lc.swift_charge or 0) + float(lc.bank_charge or 0)
        if bank_charges > 0:
            lines.append(JournalLineSpec(ledger_id=expense_ledger, debit=bank_charges, credit=0))
        lines.append(JournalLineSpec(ledger_id=profile.default_bank_ledger_id, debit=0, credit=total_dr))
        v = create_journal_voucher(
            self.db,
            company_id=company_id,
            voucher_date=vd,
            narration=f"LC margin & bank charges {lc.lc_no}",
            lines=lines,
        )
        lc.margin_voucher_id = v.id
        self.db.commit()
        self.db.refresh(lc)
        return lc

    def post_shipment_git_voucher(
        self, *, company_id: int, shipment_id: uuid.UUID, amount: float, voucher_date: date | None
    ) -> ie.ImportShipment:
        ship = self.repo.get_shipment(company_id, shipment_id)
        if not ship:
            raise HTTPException(status_code=404, detail="Shipment not found")
        if ship.git_voucher_id:
            raise HTTPException(status_code=400, detail="GIT voucher already posted for shipment")
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        po = self.repo.get_po(company_id, ship.import_purchase_order_id)
        if not po:
            raise HTTPException(status_code=404, detail="Purchase order not found")
        sup = self.db.query(models.Supplier).filter(models.Supplier.id == po.supplier_id).first()
        if not sup or not sup.ledger_id:
            raise HTTPException(status_code=400, detail="Supplier ledger not configured")

        profile = self.repo.get_accounting_profile(company_id)
        if not profile or not profile.goods_in_transit_ledger_id:
            raise HTTPException(status_code=400, detail="Configure goods_in_transit_ledger_id on import accounting profile")

        vd = voucher_date or (ship.shipment_date or date.today())
        v = create_journal_voucher(
            self.db,
            company_id=company_id,
            voucher_date=vd,
            narration=f"GIT on shipment {ship.shipment_no}",
            lines=[
                JournalLineSpec(ledger_id=profile.goods_in_transit_ledger_id, debit=amount, credit=0),
                JournalLineSpec(ledger_id=int(sup.ledger_id), debit=0, credit=amount),
            ],
        )
        ship.git_voucher_id = v.id
        self.db.commit()
        self.db.refresh(ship)
        return ship

    def post_import_expense_voucher(self, *, company_id: int, expense_id: uuid.UUID, voucher_date: date | None) -> ie.ImportExpense:
        ex = (
            self.db.query(ie.ImportExpense)
            .filter(ie.ImportExpense.id == expense_id, ie.ImportExpense.company_id == company_id, ie.ImportExpense.deleted_at.is_(None))
            .first()
        )
        if not ex:
            raise HTTPException(status_code=404, detail="Import expense not found")
        if ex.voucher_id:
            raise HTTPException(status_code=400, detail="Expense voucher already posted")

        profile = self.repo.get_accounting_profile(company_id)
        if not profile or not profile.import_expense_ledger_id or not profile.default_bank_ledger_id:
            raise HTTPException(status_code=400, detail="Configure import_expense_ledger_id and default_bank_ledger_id")

        vd = voucher_date or (ex.expense_bill_date or date.today())
        amt = float(ex.amount or 0)
        vat = float(ex.vat_amount or 0)

        # Use specific ledger if set, otherwise fallback to profile default
        expense_ledger_id = ex.ledger_id or profile.import_expense_ledger_id
        lines = [JournalLineSpec(ledger_id=expense_ledger_id, debit=amt, credit=0)]

        if vat > 0:
            if not profile.vat_receivable_ledger_id:
                raise HTTPException(status_code=400, detail="Configure vat_receivable_ledger_id for VAT on import expense")
            lines.append(JournalLineSpec(ledger_id=profile.vat_receivable_ledger_id, debit=vat, credit=0))
        lines.append(JournalLineSpec(ledger_id=profile.default_bank_ledger_id, debit=0, credit=amt + vat))
        v = create_journal_voucher(
            self.db,
            company_id=company_id,
            voucher_date=vd,
            narration=f"Import expense {ex.expense_type} {ex.expense_bill_no or ''}",
            lines=lines,
        )
        ex.voucher_id = v.id
        self.db.commit()
        self.db.refresh(ex)
        return ex
