"""Import / export domain tables (see db/migrations/20260511_03_import_export_management_module.sql)."""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class ImportPoStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class ImportShipmentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_TRANSIT = "IN_TRANSIT"
    CLEARED = "CLEARED"
    CLOSED = "CLOSED"


class LcStatus(str, enum.Enum):
    OPEN = "OPEN"
    UTILIZED = "UTILIZED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class LandedAllocationMethod(str, enum.Enum):
    QUANTITY = "QUANTITY"
    ITEM_VALUE = "ITEM_VALUE"
    MANUAL = "MANUAL"


class LandedRunStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    POSTED = "POSTED"


class ImportReceiptStage(str, enum.Enum):
    IN_TRANSIT = "IN_TRANSIT"
    FINAL = "FINAL"


class ImportReceiptStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    IN_TRANSIT_POSTED = "IN_TRANSIT_POSTED"
    FINALIZED = "FINALIZED"
    CANCELLED = "CANCELLED"


class ExportOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class ImportAccountingProfile(Base):
    __tablename__ = "import_accounting_profiles"

    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    goods_in_transit_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    lc_margin_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    advance_supplier_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    import_expense_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    vat_receivable_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    forex_gain_loss_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    export_sales_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    default_bank_ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ImportPurchaseOrder(Base):
    __tablename__ = "import_purchase_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"), nullable=False)
    po_no: Mapped[str] = mapped_column(String(100), nullable=False)
    currency_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    exchange_rate: Mapped[float | None] = mapped_column(Numeric(14, 6), nullable=True)
    incoterm: Mapped[str | None] = mapped_column(String(20), nullable=True)
    country_of_origin: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expected_arrival_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=ImportPoStatus.DRAFT.value, nullable=False)
    purchase_bill_id: Mapped[int | None] = mapped_column(ForeignKey("purchase_bills.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["ImportPurchaseOrderItem"]] = relationship(
        "ImportPurchaseOrderItem", back_populates="purchase_order", cascade="all, delete-orphan"
    )


class ImportPurchaseOrderItem(Base):
    __tablename__ = "import_purchase_order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    import_purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_orders.id", ondelete="CASCADE"), nullable=False
    )
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    line_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    purchase_order: Mapped["ImportPurchaseOrder"] = relationship("ImportPurchaseOrder", back_populates="items")


class LcRecord(Base):
    __tablename__ = "lc_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_purchase_order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_orders.id", ondelete="SET NULL"), nullable=True
    )
    lc_no: Mapped[str] = mapped_column(String(100), nullable=False)
    lc_date: Mapped[date] = mapped_column(Date, nullable=False)
    lc_bank: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lc_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    lc_expiry_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    margin_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    swift_charge: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    bank_charge: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    lc_status: Mapped[str] = mapped_column(String(30), default=LcStatus.OPEN.value, nullable=False)
    margin_voucher_id: Mapped[int | None] = mapped_column(ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportShipment(Base):
    __tablename__ = "import_shipments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_orders.id", ondelete="CASCADE"), nullable=False
    )
    shipment_no: Mapped[str] = mapped_column(String(100), nullable=False)
    shipment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    arrival_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    vessel_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    container_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    container_size: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bl_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bl_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    airway_bill_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    package_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    gross_weight: Mapped[float | None] = mapped_column(Numeric(14, 3), nullable=True)
    net_weight: Mapped[float | None] = mapped_column(Numeric(14, 3), nullable=True)
    port_of_loading: Mapped[str | None] = mapped_column(String(255), nullable=True)
    port_of_entry: Mapped[str | None] = mapped_column(String(255), nullable=True)
    shipping_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    forwarding_agent: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=ImportShipmentStatus.DRAFT.value, nullable=False)
    git_voucher_id: Mapped[int | None] = mapped_column(ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportCustomsEntry(Base):
    __tablename__ = "import_customs_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_shipments.id", ondelete="CASCADE"), nullable=False
    )
    pragyapan_patra_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pragyapan_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    customs_office: Mapped[str | None] = mapped_column(String(255), nullable=True)
    agent_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customs_reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    customs_duty: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    vat_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    excise_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    advance_tax: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    customs_rate: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    hs_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customs_valuation: Mapped[float | None] = mapped_column(Numeric(18, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportExpense(Base):
    __tablename__ = "import_expenses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_shipment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_shipments.id", ondelete="SET NULL"), nullable=True
    )
    expense_type: Mapped[str] = mapped_column(String(50), nullable=False)
    expense_bill_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expense_bill_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    vendor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    vat_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    allocation_method: Mapped[str] = mapped_column(String(30), default=LandedAllocationMethod.QUANTITY.value, nullable=False)
    ledger_id: Mapped[int | None] = mapped_column(ForeignKey("ledgers.id", ondelete="SET NULL"), nullable=True)
    voucher_id: Mapped[int | None] = mapped_column(ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ImportLandedCostRun(Base):
    __tablename__ = "import_landed_cost_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_orders.id", ondelete="CASCADE"), nullable=False
    )
    allocation_method: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=LandedRunStatus.DRAFT.value, nullable=False)
    total_pool: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    total_allocated: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    posted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    lines: Mapped[list["ImportLandedCostRunLine"]] = relationship(
        "ImportLandedCostRunLine", back_populates="run", cascade="all, delete-orphan"
    )


class ImportLandedCostRunLine(Base):
    __tablename__ = "import_landed_cost_run_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_landed_cost_runs.id", ondelete="CASCADE"), nullable=False
    )
    import_purchase_order_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_order_items.id", ondelete="CASCADE"), nullable=False
    )
    basis_qty: Mapped[float] = mapped_column(Numeric(14, 3), default=0, nullable=False)
    basis_value: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    allocated_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    run: Mapped["ImportLandedCostRun"] = relationship("ImportLandedCostRun", back_populates="lines")


class ImportReceipt(Base):
    __tablename__ = "import_receipts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    import_purchase_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_orders.id"), nullable=False
    )
    import_shipment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_shipments.id", ondelete="SET NULL"), nullable=True
    )
    receipt_no: Mapped[str] = mapped_column(String(100), nullable=False)
    receipt_stage: Mapped[str] = mapped_column(String(20), default=ImportReceiptStage.IN_TRANSIT.value, nullable=False)
    warehouse_id: Mapped[int] = mapped_column(ForeignKey("warehouses.id"), nullable=False)
    received_date: Mapped[date] = mapped_column(Date, nullable=False)
    received_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=ImportReceiptStatus.DRAFT.value, nullable=False)
    final_journal_voucher_id: Mapped[int | None] = mapped_column(ForeignKey("vouchers.id", ondelete="SET NULL"), nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    lines: Mapped[list["ImportReceiptLine"]] = relationship(
        "ImportReceiptLine", back_populates="receipt", cascade="all, delete-orphan"
    )


class ImportReceiptLine(Base):
    __tablename__ = "import_receipt_lines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    receipt_id: Mapped[int] = mapped_column(ForeignKey("import_receipts.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), nullable=False)
    import_purchase_order_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("import_purchase_order_items.id", ondelete="SET NULL"), nullable=True
    )
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit_cost_base: Mapped[float] = mapped_column(Numeric(14, 6), default=0, nullable=False)
    landed_cost_per_unit: Mapped[float] = mapped_column(Numeric(14, 6), default=0, nullable=False)
    total_unit_cost: Mapped[float] = mapped_column(Numeric(14, 6), default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    receipt: Mapped["ImportReceipt"] = relationship("ImportReceipt", back_populates="lines")


class ExportOrder(Base):
    __tablename__ = "export_orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), nullable=False)
    export_order_no: Mapped[str] = mapped_column(String(100), nullable=False)
    currency_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    destination_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    incoterm: Mapped[str | None] = mapped_column(String(20), nullable=True)
    shipping_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default=ExportOrderStatus.DRAFT.value, nullable=False)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["ExportOrderItem"]] = relationship(
        "ExportOrderItem", back_populates="export_order", cascade="all, delete-orphan"
    )


class ExportOrderItem(Base):
    __tablename__ = "export_order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    export_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("export_orders.id", ondelete="CASCADE"), nullable=False
    )
    item_id: Mapped[int] = mapped_column(ForeignKey("items.id"), nullable=False)
    quantity: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(14, 2), default=0, nullable=False)
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    line_no: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    export_order: Mapped["ExportOrder"] = relationship("ExportOrder", back_populates="items")


class ExportShipment(Base):
    __tablename__ = "export_shipments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    export_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("export_orders.id", ondelete="CASCADE"), nullable=False
    )
    shipment_no: Mapped[str] = mapped_column(String(100), nullable=False)
    container_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bl_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    airway_bill_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    vessel_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    export_customs_office: Mapped[str | None] = mapped_column(String(255), nullable=True)
    export_pragyapan_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    shipped_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExportCustomsEntry(Base):
    __tablename__ = "export_customs_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    export_shipment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("export_shipments.id", ondelete="CASCADE"), nullable=False
    )
    reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cleared_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ExportInvoice(Base):
    __tablename__ = "export_invoices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    export_order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("export_orders.id", ondelete="CASCADE"), nullable=False
    )
    export_shipment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("export_shipments.id", ondelete="SET NULL"), nullable=True
    )
    invoice_no: Mapped[str] = mapped_column(String(100), nullable=False)
    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    export_value: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    currency_rate: Mapped[float | None] = mapped_column(Numeric(14, 6), nullable=True)
    taxable_amount: Mapped[float] = mapped_column(Numeric(18, 2), default=0, nullable=False)
    sales_invoice_id: Mapped[int | None] = mapped_column(ForeignKey("sales_invoices.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
