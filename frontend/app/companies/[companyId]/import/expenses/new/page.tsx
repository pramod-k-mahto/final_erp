"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { formatZodIssues, importExpensePayloadSchema } from "@/lib/importExport/schemas";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportExpenseNewPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const shipmentId = sp.get("import_shipment_id") || "";

  const { data: ledgers } = useSWR(companyId ? `/ledgers/companies/${companyId}/ledgers` : null, fetcher);

  const ledgerOptions = useMemo(
    () => (ledgers || []).map((l: { id: number; name: string }) => ({ value: String(l.id), label: l.name })),
    [ledgers]
  );

  const [importShipmentId, setImportShipmentId] = useState(shipmentId);
  const [expenseType, setExpenseType] = useState("");
  const [ledgerId, setLedgerId] = useState("");
  const [billNo, setBillNo] = useState("");
  const [billDate, setBillDate] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [vat, setVat] = useState("");
  const [allocationMethod, setAllocationMethod] = useState<"" | "QUANTITY" | "ITEM_VALUE">("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      import_shipment_id: importShipmentId,
      expense_type: expenseType.trim(),
      bill_no: billNo.trim() || null,
      bill_date: billDate.trim() || null,
      ledger_id: ledgerId ? Number(ledgerId) : null,
      vendor_name: vendorName.trim() || null,
      amount,
      vat,
      allocation_method: allocationMethod || null,
    };

    const parsed = importExpensePayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErr(formatZodIssues(parsed.error));
      return;
    }
    const body: Record<string, unknown> = { ...parsed.data };
    Object.keys(body).forEach((k) => {
      if (body[k] === null || body[k] === undefined || body[k] === "") delete body[k];
    });
    setSaving(true);
    try {
      const res = await api.post(`${importCompanyBase(companyId)}/expenses`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/import/expenses/${id}`);
      else if (importShipmentId) router.replace(`/companies/${companyId}/import/shipments/${importShipmentId}`);
      else router.replace(`/companies/${companyId}/import/shipments`);
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title="New import expense"
        description="Log clearing, freight, insurance, or other landed cost drivers. Post the accounting voucher from the expense detail page."
        toolbar={<ImportWorkflowStepper activeKey="expense" />}
      >
        <form onSubmit={onSubmit} className="grid max-w-xl gap-3 p-4">
          <label className="text-xs font-semibold">
            Shipment ID *
            <input
              required
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={importShipmentId}
              onChange={(e) => setImportShipmentId(e.target.value)}
            />
          </label>
          <Link href={`/companies/${companyId}/import/shipments`} className="text-xs text-indigo-600 hover:underline">
            Open shipments list
          </Link>
          <label className="text-xs font-semibold">
            Expense type *
            <input required className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={expenseType} onChange={(e) => setExpenseType(e.target.value)} placeholder="e.g. Freight" />
          </label>
          <label className="text-xs font-semibold">
            Ledger (optional override)
            <SearchableSelect
              options={ledgerOptions}
              value={ledgerId}
              onChange={setLedgerId}
              placeholder="Default expense ledger"
              triggerClassName="mt-1 h-9"
            />
          </label>
          <label className="text-xs font-semibold">
            Bill no
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={billNo} onChange={(e) => setBillNo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Bill date
            <input type="date" className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Vendor name
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Amount *
            <input required className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            VAT
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={vat} onChange={(e) => setVat(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Allocation method
            <select
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={allocationMethod}
              onChange={(e) => setAllocationMethod(e.target.value as typeof allocationMethod)}
            >
              <option value="">Default / server</option>
              <option value="QUANTITY">Quantity</option>
              <option value="ITEM_VALUE">Item value</option>
            </select>
          </label>
          {err ? <div className="text-xs text-rose-600">{err}</div> : null}
          <button type="submit" disabled={saving} className="w-fit rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Create expense"}
          </button>
        </form>

      </TradeTransactionShell>
    </div>
  );
}
