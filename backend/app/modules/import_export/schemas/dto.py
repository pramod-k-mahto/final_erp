from __future__ import annotations

import math
import uuid
from decimal import Decimal
from datetime import date, datetime
from typing import Annotated, Any

from pydantic import (
    AliasChoices,
    BaseModel,
    BeforeValidator,
    ConfigDict,
    Field,
    field_serializer,
    field_validator,
    model_validator,
)


def _coerce_finite_amount(v: Any) -> float:
    """LC / import money fields: treat blank, null, and non-finite values as 0 (avoids NaN in clients)."""
    if v is None:
        return 0.0
    if isinstance(v, str) and not v.strip():
        return 0.0
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return 0.0
    if isinstance(v, Decimal):
        try:
            x = float(v)
        except (ValueError, TypeError, OverflowError):
            return 0.0
        if math.isnan(x) or math.isinf(x):
            return 0.0
        return x
    try:
        x = float(v)
    except (TypeError, ValueError, OverflowError):
        return 0.0
    if math.isnan(x) or math.isinf(x):
        return 0.0
    return x


AmountFloat = Annotated[float, BeforeValidator(_coerce_finite_amount)]


def _snake_to_camel(name: str) -> str:
    parts = name.split("_")
    return parts[0] + "".join(p.title() for p in parts[1:])


def _coerce_optional_finite_float(v: Any) -> float | None:
    if v is None or (isinstance(v, str) and not str(v).strip()):
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, Decimal):
        try:
            x = float(v)
        except (ValueError, TypeError, OverflowError):
            return None
        if math.isnan(x) or math.isinf(x):
            return None
        return x
    try:
        x = float(v)
    except (TypeError, ValueError, OverflowError):
        return None
    if math.isnan(x) or math.isinf(x):
        return None
    return x


def _coerce_optional_package_count(v: Any) -> int | None:
    if v is None or (isinstance(v, str) and not str(v).strip()):
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    try:
        x = float(v)
        if math.isnan(x) or math.isinf(x):
            return None
        return int(round(x))
    except (TypeError, ValueError, OverflowError):
        return None


def _coerce_optional_calendar_date(v: Any) -> date | None:
    """Accept YYYY-MM-DD or ISO datetimes from browsers (e.g. toISOString()) for date-only columns."""
    if v is None or (isinstance(v, str) and not str(v).strip()):
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str):
        s = v.strip()
        if len(s) >= 10 and s[4] == "-" and s[7] == "-":
            try:
                return date.fromisoformat(s[:10])
            except ValueError:
                pass
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00")).date()
        except ValueError as e:
            raise ValueError(f"Invalid date: {s!r}") from e
    raise ValueError(f"Invalid date: {v!r}")


OptionalCalendarDate = Annotated[date | None, BeforeValidator(_coerce_optional_calendar_date)]


# --- Accounting profile ---
class ImportAccountingProfileUpsert(BaseModel):
    goods_in_transit_ledger_id: int | None = None
    lc_margin_ledger_id: int | None = None
    advance_supplier_ledger_id: int | None = None
    import_expense_ledger_id: int | None = None
    vat_receivable_ledger_id: int | None = None
    forex_gain_loss_ledger_id: int | None = None
    export_sales_ledger_id: int | None = None
    default_bank_ledger_id: int | None = None


class ImportAccountingProfileRead(BaseModel):
    company_id: int
    goods_in_transit_ledger_id: int | None = None
    lc_margin_ledger_id: int | None = None
    advance_supplier_ledger_id: int | None = None
    import_expense_ledger_id: int | None = None
    vat_receivable_ledger_id: int | None = None
    forex_gain_loss_ledger_id: int | None = None
    export_sales_ledger_id: int | None = None
    default_bank_ledger_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Import PO ---
class ImportPurchaseOrderItemCreate(BaseModel):
    item_id: int
    quantity: float
    rate: float
    discount: float = 0.0
    tax_rate: float = 0.0
    line_no: int = 1
    remarks: str | None = None


class ImportPurchaseOrderCreate(BaseModel):
    supplier_id: int
    po_no: str = Field(..., max_length=100)
    currency_code: str | None = Field(None, max_length=10)
    exchange_rate: float | None = None
    incoterm: str | None = Field(None, max_length=20)
    country_of_origin: str | None = None
    expected_arrival_date: date | None = None
    remarks: str | None = None
    status: str = "DRAFT"
    purchase_bill_id: int | None = None
    items: list[ImportPurchaseOrderItemCreate] = []


class ImportPurchaseOrderItemRead(BaseModel):
    id: uuid.UUID
    item_id: int
    quantity: float
    rate: float
    discount: float
    tax_rate: float
    line_no: int
    remarks: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImportPurchaseOrderRead(BaseModel):
    id: uuid.UUID
    company_id: int
    supplier_id: int
    po_no: str
    currency_code: str | None
    exchange_rate: float | None
    incoterm: str | None
    country_of_origin: str | None
    expected_arrival_date: date | None
    remarks: str | None
    status: str
    purchase_bill_id: int | None
    created_at: datetime
    updated_at: datetime
    items: list[ImportPurchaseOrderItemRead] = []

    model_config = ConfigDict(from_attributes=True)


# --- LC ---
class LcRecordCreate(BaseModel):
    import_purchase_order_id: uuid.UUID | None = None
    lc_no: str = Field(..., max_length=100)
    lc_date: date
    lc_bank: str | None = None
    lc_amount: AmountFloat = 0.0
    lc_expiry_date: date | None = None
    margin_amount: AmountFloat = 0.0
    swift_charge: AmountFloat = 0.0
    bank_charge: AmountFloat = 0.0
    lc_status: str = "OPEN"


class LcRecordUpdate(BaseModel):
    lc_no: str | None = None
    lc_date: Annotated[date | None, BeforeValidator(_coerce_optional_calendar_date)] = None
    lc_bank: str | None = None
    lc_amount: Annotated[AmountFloat | None, BeforeValidator(lambda v: _coerce_finite_amount(v) if v is not None else None)] = None
    lc_expiry_date: Annotated[date | None, BeforeValidator(_coerce_optional_calendar_date)] = None
    margin_amount: Annotated[AmountFloat | None, BeforeValidator(lambda v: _coerce_finite_amount(v) if v is not None else None)] = None
    swift_charge: Annotated[AmountFloat | None, BeforeValidator(lambda v: _coerce_finite_amount(v) if v is not None else None)] = None
    bank_charge: Annotated[AmountFloat | None, BeforeValidator(lambda v: _coerce_finite_amount(v) if v is not None else None)] = None
    lc_status: str | None = None



class LcRecordRead(BaseModel):
    id: uuid.UUID
    company_id: int
    import_purchase_order_id: uuid.UUID | None
    lc_no: str
    lc_date: date
    lc_bank: str | None
    lc_amount: float
    lc_expiry_date: date | None
    margin_amount: float
    swift_charge: float
    bank_charge: float
    lc_status: str
    margin_voucher_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("lc_amount", "margin_amount", "swift_charge", "bank_charge")
    def _serialize_lc_amounts(self, v: Any) -> float:
        return _coerce_finite_amount(v)


def _deep_scrub_non_finite_json_values(obj: Any) -> Any:
    """Replace JS NaN/Infinity and string 'NaN' with None so Pydantic never sees non-finite floats."""
    if isinstance(obj, dict):
        return {k: _deep_scrub_non_finite_json_values(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_deep_scrub_non_finite_json_values(v) for v in obj]
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, str) and obj.strip().lower() in ("nan", "infinity", "-infinity", "undefined"):
        return None
    return obj


class ImportPurchaseOrderItemUpdate(BaseModel):
    id: uuid.UUID | None = None
    item_id: int | None = None
    quantity: AmountFloat | None = None
    rate: AmountFloat | None = None
    discount: AmountFloat | None = None
    tax_rate: AmountFloat | None = None
    line_no: int | None = None
    remarks: str | None = None


class ImportPurchaseOrderUpdate(BaseModel):
    supplier_id: int | None = None
    po_no: str | None = None
    currency_code: str | None = None
    exchange_rate: AmountFloat | None = None
    incoterm: str | None = None
    country_of_origin: str | None = None
    expected_arrival_date: OptionalCalendarDate = None
    remarks: str | None = None
    status: str | None = None
    items: list[ImportPurchaseOrderItemUpdate] | None = None


def _require_import_po_uuid(v: Any) -> uuid.UUID | None:

    """Coerce import_purchase_order_id to UUID, or None if omitted/blank. Rejects plain numeric ids."""
    if v is None:
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        raise ValueError(
            "import_purchase_order_id must be a UUID string (the import PO id), not a numeric id. "
            "Use GET /api/v1/imports/companies/{company_id}/purchase-orders and copy the id field."
        )
    if isinstance(v, uuid.UUID):
        return v
    s = str(v).strip()
    if not s:
        return None
    try:
        return uuid.UUID(s)
    except ValueError as e:
        raise ValueError(f"import_purchase_order_id is not a valid UUID: {e}") from e


# --- Shipments ---
class ImportShipmentCreate(BaseModel):
    """Accepts snake_case or camelCase JSON; optional numbers tolerate blank/NaN from browsers.

    If the UI shows Zod's **Expected number, received nan**, that happens **before** the request
    reaches this API: empty numeric inputs must be `null`/omitted in JSON, not JavaScript `NaN`.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=_snake_to_camel,
        json_schema_extra={
            "examples": [
                {
                    "importPurchaseOrderId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "shipmentNo": "SHIP-001",
                    "packageCount": 120,
                    "grossWeight": 1500.5,
                }
            ]
        },
    )

    import_purchase_order_id: Annotated[
        uuid.UUID | None,
        BeforeValidator(_require_import_po_uuid),
        Field(
            default=None,
            validation_alias=AliasChoices(
                "import_purchase_order_id",
                "importPurchaseOrderId",
                "purchase_order_id",
                "purchaseOrderId",
                "po_id",
                "poId",
            ),
        ),
    ] = None
    shipment_no: str = Field(
        ...,
        max_length=100,
        min_length=1,
        validation_alias=AliasChoices("shipment_no", "shipmentNo", "shipment_number", "shipmentNumber"),
    )
    shipment_date: OptionalCalendarDate = None
    arrival_date: OptionalCalendarDate = None
    vessel_name: str | None = None
    container_no: str | None = None
    container_size: str | None = None
    bl_no: str | None = None
    bl_date: OptionalCalendarDate = None
    airway_bill_no: str | None = None
    package_count: Annotated[int | None, BeforeValidator(_coerce_optional_package_count)] = None
    gross_weight: Annotated[float | None, BeforeValidator(_coerce_optional_finite_float)] = None
    net_weight: Annotated[float | None, BeforeValidator(_coerce_optional_finite_float)] = None
    port_of_loading: str | None = None
    port_of_entry: str | None = None
    shipping_company: str | None = None
    forwarding_agent: str | None = None
    status: str = Field(default="DRAFT", max_length=30)

    @model_validator(mode="before")
    @classmethod
    def _scrub_shipment_payload(cls, data: Any) -> Any:
        if not isinstance(data, dict):
            return data
        return _deep_scrub_non_finite_json_values(dict(data))

    @field_validator("shipment_no", mode="before")
    @classmethod
    def _strip_shipment_no(cls, v: Any) -> Any:
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return str(v).strip()
        if isinstance(v, str):
            return v.strip()
        return v


class ImportShipmentUpdate(BaseModel):
    import_purchase_order_id: uuid.UUID | None = None
    shipment_no: str | None = None
    shipment_date: OptionalCalendarDate = None
    arrival_date: OptionalCalendarDate = None
    vessel_name: str | None = None
    container_no: str | None = None
    container_size: str | None = None
    bl_no: str | None = None
    bl_date: OptionalCalendarDate = None
    airway_bill_no: str | None = None
    package_count: Annotated[int | None, BeforeValidator(_coerce_optional_package_count)] = None
    gross_weight: Annotated[float | None, BeforeValidator(_coerce_optional_finite_float)] = None
    net_weight: Annotated[float | None, BeforeValidator(_coerce_optional_finite_float)] = None
    port_of_loading: str | None = None
    port_of_entry: str | None = None
    shipping_company: str | None = None
    forwarding_agent: str | None = None
    status: str | None = None


class ImportShipmentRead(BaseModel):

    id: uuid.UUID
    company_id: int
    import_purchase_order_id: uuid.UUID
    shipment_no: str
    shipment_date: date | None
    arrival_date: date | None
    vessel_name: str | None
    container_no: str | None
    container_size: str | None
    bl_no: str | None
    bl_date: date | None
    airway_bill_no: str | None
    package_count: int | None
    gross_weight: float | None
    net_weight: float | None
    port_of_loading: str | None
    port_of_entry: str | None
    shipping_company: str | None
    forwarding_agent: str | None
    status: str
    git_voucher_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer("package_count")
    def _ser_package_count(self, v: Any) -> int | None:
        return _coerce_optional_package_count(v)

    @field_serializer("gross_weight", "net_weight")
    def _ser_shipment_weights(self, v: Any) -> float | None:
        if v is None:
            return None
        try:
            x = float(v)
        except (TypeError, ValueError, OverflowError):
            return None
        if math.isnan(x) or math.isinf(x):
            return None
        return x


class PostGitVoucherBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_snake_to_camel)

    amount: Annotated[float, BeforeValidator(_coerce_finite_amount), Field(gt=0)]
    voucher_date: date | None = None


# --- Customs ---
class ImportCustomsEntryCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=_snake_to_camel)

    import_shipment_id: uuid.UUID
    pragyapan_patra_no: str | None = Field(None, max_length=100)
    pragyapan_date: date | None = None
    customs_office: str | None = None
    agent_name: str | None = None
    customs_reference_no: str | None = None
    customs_duty: AmountFloat = 0.0
    vat_amount: AmountFloat = 0.0
    excise_amount: AmountFloat = 0.0
    advance_tax: AmountFloat = 0.0
    customs_rate: Annotated[float | None, BeforeValidator(_coerce_optional_finite_float)] = None
    hs_code: str | None = None
    customs_valuation: Annotated[float | None, BeforeValidator(_coerce_optional_finite_float)] = None


class ImportCustomsEntryRead(BaseModel):
    id: uuid.UUID
    company_id: int
    import_shipment_id: uuid.UUID
    pragyapan_patra_no: str | None
    pragyapan_date: date | None
    customs_office: str | None
    agent_name: str | None
    customs_reference_no: str | None
    customs_duty: float
    vat_amount: float
    excise_amount: float
    advance_tax: float
    customs_rate: float | None
    hs_code: str | None
    customs_valuation: float | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Expenses ---
class ImportExpenseCreate(BaseModel):
    import_shipment_id: uuid.UUID | None = None
    expense_type: str = Field(..., max_length=50)
    expense_bill_no: str | None = None
    expense_bill_date: date | None = None
    vendor_name: str | None = None
    amount: float = 0.0
    vat_amount: float = 0.0
    allocation_method: str = "QUANTITY"
    ledger_id: int | None = None



class ImportExpenseRead(BaseModel):
    id: uuid.UUID
    company_id: int
    import_shipment_id: uuid.UUID | None
    expense_type: str
    expense_bill_no: str | None
    expense_bill_date: date | None
    vendor_name: str | None
    amount: float
    vat_amount: float
    allocation_method: str
    ledger_id: int | None
    voucher_id: int | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Landed ---
class LandedCostComputeRequest(BaseModel):
    import_purchase_order_id: uuid.UUID
    allocation_method: str = "QUANTITY"


class ImportLandedCostRunLineRead(BaseModel):
    id: uuid.UUID
    run_id: uuid.UUID
    import_purchase_order_item_id: uuid.UUID
    basis_qty: float
    basis_value: float
    allocated_amount: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImportLandedCostRunRead(BaseModel):
    id: uuid.UUID
    company_id: int
    import_purchase_order_id: uuid.UUID
    allocation_method: str
    status: str
    total_pool: float
    total_allocated: float
    created_at: datetime
    posted_at: datetime | None
    lines: list[ImportLandedCostRunLineRead] = []

    model_config = ConfigDict(from_attributes=True)


# --- Receipts ---
class ImportReceiptLineCreate(BaseModel):
    item_id: int
    quantity: float
    unit_cost_base: float = 0.0
    landed_cost_per_unit: float = 0.0
    total_unit_cost: float = 0.0
    import_purchase_order_item_id: uuid.UUID | None = None


class ImportReceiptCreate(BaseModel):
    import_purchase_order_id: uuid.UUID
    import_shipment_id: uuid.UUID | None = None
    receipt_no: str = Field(..., max_length=100)
    received_date: date
    received_by: str | None = None
    remarks: str | None = None
    lines: list[ImportReceiptLineCreate]


class ImportReceiptLineRead(BaseModel):
    id: int
    receipt_id: int
    item_id: int
    import_purchase_order_item_id: uuid.UUID | None
    quantity: float
    unit_cost_base: float
    landed_cost_per_unit: float
    total_unit_cost: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ImportReceiptRead(BaseModel):
    id: int
    company_id: int
    import_purchase_order_id: uuid.UUID
    import_shipment_id: uuid.UUID | None
    receipt_no: str
    receipt_stage: str
    warehouse_id: int
    received_date: date
    received_by: str | None
    remarks: str | None
    status: str
    final_journal_voucher_id: int | None
    created_at: datetime
    updated_at: datetime
    lines: list[ImportReceiptLineRead] = []

    model_config = ConfigDict(from_attributes=True)


class FinalizeImportReceiptBody(BaseModel):
    to_warehouse_id: int
    post_stock_journal: bool = True


# --- Export ---
class ExportOrderItemCreate(BaseModel):
    item_id: int
    quantity: float
    rate: float
    discount: float = 0.0
    tax_rate: float = 0.0
    line_no: int = 1


class ExportOrderCreate(BaseModel):
    customer_id: int
    export_order_no: str = Field(..., max_length=100)
    currency_code: str | None = None
    destination_country: str | None = None
    incoterm: str | None = None
    shipping_method: str | None = None
    remarks: str | None = None
    status: str = "DRAFT"
    items: list[ExportOrderItemCreate] = []


class ExportOrderItemRead(BaseModel):
    id: uuid.UUID
    item_id: int
    quantity: float
    rate: float
    discount: float
    tax_rate: float
    line_no: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExportOrderRead(BaseModel):
    id: uuid.UUID
    company_id: int
    customer_id: int
    export_order_no: str
    currency_code: str | None
    destination_country: str | None
    incoterm: str | None
    shipping_method: str | None
    status: str
    remarks: str | None
    created_at: datetime
    updated_at: datetime
    items: list[ExportOrderItemRead] = []

    model_config = ConfigDict(from_attributes=True)


class ExportShipmentCreate(BaseModel):
    export_order_id: uuid.UUID
    shipment_no: str = Field(..., max_length=100)
    container_no: str | None = None
    bl_no: str | None = None
    airway_bill_no: str | None = None
    vessel_name: str | None = None
    export_customs_office: str | None = None
    export_pragyapan_no: str | None = None
    shipped_date: date | None = None


class ExportShipmentRead(BaseModel):
    id: uuid.UUID
    company_id: int
    export_order_id: uuid.UUID
    shipment_no: str
    container_no: str | None
    bl_no: str | None
    airway_bill_no: str | None
    vessel_name: str | None
    export_customs_office: str | None
    export_pragyapan_no: str | None
    shipped_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExportCustomsEntryCreate(BaseModel):
    export_shipment_id: uuid.UUID
    reference_no: str | None = None
    cleared_date: date | None = None
    remarks: str | None = None


class ExportCustomsEntryRead(BaseModel):
    id: uuid.UUID
    company_id: int
    export_shipment_id: uuid.UUID
    reference_no: str | None
    cleared_date: date | None
    remarks: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExportInvoiceCreate(BaseModel):
    export_order_id: uuid.UUID
    export_shipment_id: uuid.UUID | None = None
    invoice_no: str = Field(..., max_length=100)
    invoice_date: date
    export_value: float = 0.0
    currency_rate: float | None = None
    taxable_amount: float = 0.0
    sales_invoice_id: int | None = None


class ExportInvoiceRead(BaseModel):
    id: uuid.UUID
    company_id: int
    export_order_id: uuid.UUID
    export_shipment_id: uuid.UUID | None
    invoice_no: str
    invoice_date: date
    export_value: float
    currency_rate: float | None
    taxable_amount: float
    sales_invoice_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
