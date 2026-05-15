import { z } from "zod";

/** Line item for import purchase order (API body). */
export const importPoLineSchema = z.object({
  item_id: z.number().int().positive(),
  quantity: z.number().positive(),
  rate: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  tax_rate: z.number().nonnegative().default(0),
});

export const importPurchaseOrderPayloadSchema = z
  .object({
    supplier_id: z.number().int().positive(),
    po_no: z.string().trim().min(1, "PO number is required"),
    currency_code: z.string().trim().optional().nullable(),
    exchange_rate: z.number().positive().optional().nullable(),
    incoterm: z.string().trim().optional().nullable(),
    country_of_origin: z.string().trim().optional().nullable(),
    expected_arrival_date: z.string().trim().optional().nullable(),
    remarks: z.string().trim().optional().nullable(),
    lines: z.array(importPoLineSchema).min(1, "At least one line item is required"),
  })
  .superRefine((data, ctx) => {
    const cur = data.currency_code?.trim();
    if (cur) {
      const er = data.exchange_rate;
      if (er == null || !(er > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exchange_rate"],
          message: "When currency is set, exchange rate must be greater than 0.",
        });
      }
    }
  });

export type ImportPurchaseOrderPayload = z.infer<typeof importPurchaseOrderPayloadSchema>;

/** Safely coerce a value to a non-negative number, defaulting to 0 for blank/NaN/null. */
const _lcNum = z.preprocess(
  (v) => {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return 0;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  },
  z.number().nonnegative()
);

/** Safely coerce a value to a non-negative number, returning null for blank/NaN/null. */
const _lcOptNum = z.preprocess(
  (v) => {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  },
  z.number().nonnegative().nullable()
);

/** Parse a float from a string safely; returns 0 for empty/NaN. */
export function safeParseFloat(s: string, fallback = 0): number {
  if (!s.trim()) return fallback;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
}

export const importLcPayloadSchema = z.object({
  import_purchase_order_id: z.string().uuid().optional().nullable(),
  lc_no: z.string().trim().min(1, "LC number is required"),
  lc_date: z.string().trim().min(1, "LC date is required"),
  lc_bank: z.string().trim().min(1, "Bank name is required"),
  lc_amount: _lcNum,
  lc_expiry_date: z.string().trim().optional().nullable(),
  margin_amount: _lcOptNum,
  swift_charge: _lcOptNum,
  bank_charge: _lcOptNum,
});

export type ImportLcPayload = z.infer<typeof importLcPayloadSchema>;

const _optNum = z.preprocess(
  (v) => {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : undefined;
  },
  z.number().nonnegative().optional()
);

const _optInt = z.preprocess(
  (v) => {
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return undefined;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : undefined;
  },
  z.number().int().nonnegative().optional()
);

export const importShipmentPayloadSchema = z.object({
  // API expects a UUID string, not a numeric id
  import_purchase_order_id: z.string().uuid("Select a valid import PO").optional().nullable(),
  shipment_no: z.string().trim().min(1, "Shipment number is required"),
  container_no: z.string().trim().optional().nullable(),
  container_size: z.string().trim().optional().nullable(),
  vessel_name: z.string().trim().optional().nullable(),
  bl_no: z.string().trim().optional().nullable(),
  bl_date: z.string().trim().optional().nullable(),
  airway_bill_no: z.string().trim().optional().nullable(),
  shipment_date: z.string().trim().optional().nullable(),
  arrival_date: z.string().trim().optional().nullable(),
  package_count: _optInt,
  gross_weight: _optNum,
  net_weight: _optNum,
  shipping_company: z.string().trim().optional().nullable(),
  forwarding_agent: z.string().trim().optional().nullable(),
  port_of_loading: z.string().trim().optional().nullable(),
  port_of_entry: z.string().trim().optional().nullable(),
});

export type ImportShipmentPayload = z.infer<typeof importShipmentPayloadSchema>;

export const importCustomsPayloadSchema = z.object({
  import_shipment_id: z.string().uuid("Invalid shipment selection"),
  pragyapan_patra_no: z.string().trim().min(1, "Pragyapan number is required"),
  pragyapan_date: z.string().trim().min(1, "Pragyapan date is required"),
  customs_office: z.string().trim().optional().nullable(),
  customs_reference_no: z.string().trim().optional().nullable(),
  hs_code: z.string().trim().optional().nullable(),
  customs_valuation: _lcOptNum,
  customs_duty: _lcOptNum,
  vat_amount: _lcOptNum,
  excise_amount: _lcOptNum,
  advance_tax: _lcOptNum,
  customs_rate: _lcOptNum,
  agent_name: z.string().trim().optional().nullable(),
});

export type ImportCustomsPayload = z.infer<typeof importCustomsPayloadSchema>;


export const importExpensePayloadSchema = z.object({
  import_shipment_id: z.string().uuid("Select a valid shipment").optional().nullable(),
  expense_type: z.string().trim().min(1, "Expense type is required"),
  bill_no: z.string().trim().optional().nullable(),
  bill_date: z.string().trim().optional().nullable(),
  ledger_id: z.number().int().optional().nullable(),

  vendor_name: z.string().trim().optional().nullable(),
  amount: _lcNum,
  vat: _lcOptNum,
  allocation_method: z.enum(["QUANTITY", "ITEM_VALUE"]).optional().nullable(),
});


export type ImportExpensePayload = z.infer<typeof importExpensePayloadSchema>;

export const importWarehouseReceiptPayloadSchema = z.object({
  import_purchase_order_id: z.string().uuid("Select a valid import PO"),
  receipt_date: z.string().trim().min(1, "Receipt date is required"),
  remarks: z.string().trim().optional().nullable(),
  to_warehouse_id: z.number().int().positive().optional().nullable(),
});


export type ImportWarehouseReceiptPayload = z.infer<typeof importWarehouseReceiptPayloadSchema>;

export const exportOrderPayloadSchema = z
  .object({
    customer_id: z.number().int().positive(),
    order_no: z.string().trim().min(1, "Order number is required"),
    currency_code: z.string().trim().optional().nullable(),
    exchange_rate: _lcOptNum,
    remarks: z.string().trim().optional().nullable(),
    lines: z
      .array(
        z.object({
          item_id: z.number().int().positive(),
          quantity: _lcNum,
          rate: _lcNum,
          discount: _lcOptNum,
          tax_rate: _lcOptNum,
        })
      )

      .min(1, "At least one line is required"),
  })
  .superRefine((data, ctx) => {
    const cur = data.currency_code?.trim();
    if (cur) {
      const er = data.exchange_rate;
      if (er == null || !(er > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exchange_rate"],
          message: "When currency is set, exchange rate must be greater than 0.",
        });
      }
    }
  });

export type ExportOrderPayload = z.infer<typeof exportOrderPayloadSchema>;

export const importReceiptCreateSchema = z.object({
  import_purchase_order_id: z.string().uuid("Select a valid import PO"),
  receipt_no: z.string().trim().min(1, "Receipt number is required"),
  received_date: z.string().trim().min(1, "Receipt date is required"),
  remarks: z.string().trim().optional().nullable(),

  lines: z
    .array(
      z.object({
        item_id: z.number().int().positive(),
        quantity: _lcNum,
        rate: _lcNum,
        discount: _lcOptNum,
        tax_rate: _lcOptNum,
      })
    )
    .min(1, "At least one receipt line is required"),
});


export const exportShipmentPayloadSchema = z.object({
  export_order_id: z.string().uuid("Select a valid export order"),
  bl_no: z.string().trim().optional().nullable(),
  vessel_name: z.string().trim().optional().nullable(),
  shipment_date: z.string().trim().optional().nullable(),
  port_of_loading: z.string().trim().optional().nullable(),
  port_of_discharge: z.string().trim().optional().nullable(),
  container_no: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
});


export const exportCustomsPayloadSchema = z.object({
  export_shipment_id: z.string().uuid("Select a valid shipment"),
  declaration_no: z.string().trim().optional().nullable(),
  customs_office: z.string().trim().optional().nullable(),
  clearance_date: z.string().trim().optional().nullable(),
  remarks: z.string().trim().optional().nullable(),
});


export type ExportShipmentPayload = z.infer<typeof exportShipmentPayloadSchema>;
export type ExportCustomsPayload = z.infer<typeof exportCustomsPayloadSchema>;

export const exportInvoicePayloadSchema = z
  .object({
    export_order_id: z.string().uuid("Select a valid export order"),
    invoice_no: z.string().trim().min(1, "Invoice number is required"),
    invoice_date: z.string().trim().min(1, "Invoice date is required"),
    currency_code: z.string().trim().optional().nullable(),
    exchange_rate: _lcOptNum,
    remarks: z.string().trim().optional().nullable(),
    sales_invoice_id: z.number().int().positive().optional().nullable(),
    lines: z
      .array(
        z.object({

          item_id: z.number().int().positive(),
          quantity: _lcNum,
          rate: _lcNum,
          discount: _lcOptNum,
          tax_rate: _lcOptNum,

        })
      )
      .min(1, "At least one line is required"),
  })
  .superRefine((data, ctx) => {
    const cur = data.currency_code?.trim();
    if (cur) {
      const er = data.exchange_rate;
      if (er == null || !(er > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exchange_rate"],
          message: "When currency is set, exchange rate must be greater than 0.",
        });
      }
    }
  });

export type ExportInvoicePayload = z.infer<typeof exportInvoicePayloadSchema>;

export type ImportReceiptCreatePayload = z.infer<typeof importReceiptCreateSchema>;

export function formatZodIssues(err: z.ZodError): string {
  return err.issues.map((i) => i.message).join(" ");
}
