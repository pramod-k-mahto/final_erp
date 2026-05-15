export type {
  ImportPurchaseOrderPayload,
  ImportLcPayload,
  ImportShipmentPayload,
  ImportCustomsPayload,
  ImportExpensePayload,
  ImportWarehouseReceiptPayload,
  ExportOrderPayload,
  ImportReceiptCreatePayload,
  ExportShipmentPayload,
  ExportCustomsPayload,
  ExportInvoicePayload,
} from "@/lib/importExport/schemas";

/** Company-scoped import/export accounting profile (snake_case from API). */
export type ImportAccountingProfile = {
  goods_in_transit_ledger_id?: number | null;
  lc_margin_ledger_id?: number | null;
  advance_supplier_ledger_id?: number | null;
  import_expense_ledger_id?: number | null;
  vat_receivable_ledger_id?: number | null;
  forex_gain_loss_ledger_id?: number | null;
  export_sales_ledger_id?: number | null;
  default_bank_ledger_id?: number | null;
};

export type LedgerOption = { id: number; name: string };
