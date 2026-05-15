from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy.orm import Session, selectinload

from app import import_export_models as m


class ImportExportRepository:
    def __init__(self, db: Session):
        self.db = db

    # --- Import PO ---
    def get_po(self, company_id: int, po_id: uuid.UUID) -> m.ImportPurchaseOrder | None:
        return (
            self.db.query(m.ImportPurchaseOrder)
            .options(selectinload(m.ImportPurchaseOrder.items))
            .filter(
                m.ImportPurchaseOrder.id == po_id,
                m.ImportPurchaseOrder.company_id == company_id,
                m.ImportPurchaseOrder.deleted_at.is_(None),
            )
            .first()
        )

    def list_pos(self, company_id: int, skip: int = 0, limit: int = 100) -> list[m.ImportPurchaseOrder]:
        return (
            self.db.query(m.ImportPurchaseOrder)
            .options(selectinload(m.ImportPurchaseOrder.items))
            .filter(
                m.ImportPurchaseOrder.company_id == company_id,
                m.ImportPurchaseOrder.deleted_at.is_(None),
            )
            .order_by(m.ImportPurchaseOrder.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # --- LC ---
    def get_lc(self, company_id: int, lc_id: uuid.UUID) -> m.LcRecord | None:
        return (
            self.db.query(m.LcRecord)
            .filter(
                m.LcRecord.id == lc_id,
                m.LcRecord.company_id == company_id,
                m.LcRecord.deleted_at.is_(None),
            )
            .first()
        )

    def list_lcs(self, company_id: int, skip: int = 0, limit: int = 100) -> list[m.LcRecord]:
        return (
            self.db.query(m.LcRecord)
            .filter(m.LcRecord.company_id == company_id, m.LcRecord.deleted_at.is_(None))
            .order_by(m.LcRecord.lc_date.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    # --- Shipments ---
    def get_shipment(self, company_id: int, sid: uuid.UUID) -> m.ImportShipment | None:
        return (
            self.db.query(m.ImportShipment)
            .filter(
                m.ImportShipment.id == sid,
                m.ImportShipment.company_id == company_id,
                m.ImportShipment.deleted_at.is_(None),
            )
            .first()
        )

    def list_shipments_for_po(self, company_id: int, po_id: uuid.UUID) -> list[m.ImportShipment]:
        return (
            self.db.query(m.ImportShipment)
            .filter(
                m.ImportShipment.company_id == company_id,
                m.ImportShipment.import_purchase_order_id == po_id,
                m.ImportShipment.deleted_at.is_(None),
            )
            .order_by(m.ImportShipment.created_at.desc())
            .all()
        )

    def list_import_shipments(
        self,
        company_id: int,
        *,
        import_purchase_order_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[m.ImportShipment]:
        q = self.db.query(m.ImportShipment).filter(
            m.ImportShipment.company_id == company_id,
            m.ImportShipment.deleted_at.is_(None),
        )
        if import_purchase_order_id is not None:
            q = q.filter(m.ImportShipment.import_purchase_order_id == import_purchase_order_id)
        return q.order_by(m.ImportShipment.created_at.desc()).offset(skip).limit(limit).all()

    # --- Customs ---
    def get_import_customs_entry(self, company_id: int, entry_id: uuid.UUID) -> m.ImportCustomsEntry | None:
        return (
            self.db.query(m.ImportCustomsEntry)
            .filter(
                m.ImportCustomsEntry.id == entry_id,
                m.ImportCustomsEntry.company_id == company_id,
                m.ImportCustomsEntry.deleted_at.is_(None),
            )
            .first()
        )

    def list_import_customs_entries(
        self,
        company_id: int,
        *,
        import_shipment_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> list[m.ImportCustomsEntry]:
        q = self.db.query(m.ImportCustomsEntry).filter(
            m.ImportCustomsEntry.company_id == company_id,
            m.ImportCustomsEntry.deleted_at.is_(None),
        )
        if import_shipment_id is not None:
            q = q.filter(m.ImportCustomsEntry.import_shipment_id == import_shipment_id)
        return q.order_by(m.ImportCustomsEntry.created_at.desc()).offset(skip).limit(limit).all()

    def list_customs_for_shipment(self, shipment_id: uuid.UUID) -> list[m.ImportCustomsEntry]:
        return (
            self.db.query(m.ImportCustomsEntry)
            .filter(
                m.ImportCustomsEntry.import_shipment_id == shipment_id,
                m.ImportCustomsEntry.deleted_at.is_(None),
            )
            .all()
        )

    # --- Expenses ---
    def list_expenses_for_company_shipments(self, company_id: int, shipment_ids: list[uuid.UUID]) -> list[m.ImportExpense]:
        if not shipment_ids:
            return []
        return (
            self.db.query(m.ImportExpense)
            .filter(
                m.ImportExpense.company_id == company_id,
                m.ImportExpense.import_shipment_id.in_(shipment_ids),
                m.ImportExpense.deleted_at.is_(None),
            )
            .all()
        )

    def list_import_expenses(
        self,
        company_id: int,
        *,
        import_shipment_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> list[m.ImportExpense]:
        q = self.db.query(m.ImportExpense).filter(
            m.ImportExpense.company_id == company_id,
            m.ImportExpense.deleted_at.is_(None),
        )
        if import_shipment_id is not None:
            q = q.filter(m.ImportExpense.import_shipment_id == import_shipment_id)
        return q.order_by(m.ImportExpense.created_at.desc()).offset(skip).limit(limit).all()

    def get_import_expense(self, company_id: int, expense_id: uuid.UUID) -> m.ImportExpense | None:
        return (
            self.db.query(m.ImportExpense)
            .filter(
                m.ImportExpense.id == expense_id,
                m.ImportExpense.company_id == company_id,
                m.ImportExpense.deleted_at.is_(None),
            )
            .first()
        )

    # --- Landed runs ---
    def get_landed_run(self, company_id: int, run_id: uuid.UUID) -> m.ImportLandedCostRun | None:
        return (
            self.db.query(m.ImportLandedCostRun)
            .options(selectinload(m.ImportLandedCostRun.lines))
            .filter(m.ImportLandedCostRun.id == run_id, m.ImportLandedCostRun.company_id == company_id)
            .first()
        )

    def list_landed_cost_runs(
        self,
        company_id: int,
        *,
        import_purchase_order_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[m.ImportLandedCostRun]:
        q = (
            self.db.query(m.ImportLandedCostRun)
            .options(selectinload(m.ImportLandedCostRun.lines))
            .filter(m.ImportLandedCostRun.company_id == company_id)
        )
        if import_purchase_order_id is not None:
            q = q.filter(m.ImportLandedCostRun.import_purchase_order_id == import_purchase_order_id)
        return q.order_by(m.ImportLandedCostRun.created_at.desc()).offset(skip).limit(limit).all()

    # --- Receipts ---
    def get_receipt(self, company_id: int, receipt_id: int) -> m.ImportReceipt | None:
        return (
            self.db.query(m.ImportReceipt)
            .options(selectinload(m.ImportReceipt.lines))
            .filter(m.ImportReceipt.id == receipt_id, m.ImportReceipt.company_id == company_id)
            .first()
        )

    def list_import_receipts(
        self,
        company_id: int,
        *,
        import_purchase_order_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[m.ImportReceipt]:
        q = (
            self.db.query(m.ImportReceipt)
            .options(selectinload(m.ImportReceipt.lines))
            .filter(m.ImportReceipt.company_id == company_id)
        )
        if import_purchase_order_id is not None:
            q = q.filter(m.ImportReceipt.import_purchase_order_id == import_purchase_order_id)
        return q.order_by(m.ImportReceipt.created_at.desc()).offset(skip).limit(limit).all()

    def get_accounting_profile(self, company_id: int) -> m.ImportAccountingProfile | None:
        return self.db.query(m.ImportAccountingProfile).filter(m.ImportAccountingProfile.company_id == company_id).first()

    # --- Export ---
    def get_export_order(self, company_id: int, oid: uuid.UUID) -> m.ExportOrder | None:
        return (
            self.db.query(m.ExportOrder)
            .options(selectinload(m.ExportOrder.items))
            .filter(
                m.ExportOrder.id == oid,
                m.ExportOrder.company_id == company_id,
                m.ExportOrder.deleted_at.is_(None),
            )
            .first()
        )

    def list_export_orders(self, company_id: int, skip: int = 0, limit: int = 100) -> list[m.ExportOrder]:
        return (
            self.db.query(m.ExportOrder)
            .options(selectinload(m.ExportOrder.items))
            .filter(m.ExportOrder.company_id == company_id, m.ExportOrder.deleted_at.is_(None))
            .order_by(m.ExportOrder.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_export_shipment(self, company_id: int, shipment_id: uuid.UUID) -> m.ExportShipment | None:
        return (
            self.db.query(m.ExportShipment)
            .filter(
                m.ExportShipment.id == shipment_id,
                m.ExportShipment.company_id == company_id,
                m.ExportShipment.deleted_at.is_(None),
            )
            .first()
        )

    def list_export_shipments(
        self,
        company_id: int,
        *,
        export_order_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[m.ExportShipment]:
        q = self.db.query(m.ExportShipment).filter(
            m.ExportShipment.company_id == company_id,
            m.ExportShipment.deleted_at.is_(None),
        )
        if export_order_id is not None:
            q = q.filter(m.ExportShipment.export_order_id == export_order_id)
        return q.order_by(m.ExportShipment.created_at.desc()).offset(skip).limit(limit).all()

    def get_export_customs_entry(self, company_id: int, entry_id: uuid.UUID) -> m.ExportCustomsEntry | None:
        return (
            self.db.query(m.ExportCustomsEntry)
            .filter(
                m.ExportCustomsEntry.id == entry_id,
                m.ExportCustomsEntry.company_id == company_id,
                m.ExportCustomsEntry.deleted_at.is_(None),
            )
            .first()
        )

    def list_export_customs_entries(
        self,
        company_id: int,
        *,
        export_shipment_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> list[m.ExportCustomsEntry]:
        q = self.db.query(m.ExportCustomsEntry).filter(
            m.ExportCustomsEntry.company_id == company_id,
            m.ExportCustomsEntry.deleted_at.is_(None),
        )
        if export_shipment_id is not None:
            q = q.filter(m.ExportCustomsEntry.export_shipment_id == export_shipment_id)
        return q.order_by(m.ExportCustomsEntry.created_at.desc()).offset(skip).limit(limit).all()

    def get_export_invoice(self, company_id: int, invoice_id: uuid.UUID) -> m.ExportInvoice | None:
        return (
            self.db.query(m.ExportInvoice)
            .filter(
                m.ExportInvoice.id == invoice_id,
                m.ExportInvoice.company_id == company_id,
                m.ExportInvoice.deleted_at.is_(None),
            )
            .first()
        )

    def list_export_invoices(
        self,
        company_id: int,
        *,
        export_order_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[m.ExportInvoice]:
        q = self.db.query(m.ExportInvoice).filter(
            m.ExportInvoice.company_id == company_id,
            m.ExportInvoice.deleted_at.is_(None),
        )
        if export_order_id is not None:
            q = q.filter(m.ExportInvoice.export_order_id == export_order_id)
        return q.order_by(m.ExportInvoice.invoice_date.desc(), m.ExportInvoice.created_at.desc()).offset(skip).limit(limit).all()
