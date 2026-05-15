"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import { formatZodIssues, importReceiptCreateSchema } from "@/lib/importExport/schemas";
import { normalizeListResponse } from "@/lib/importExport/tradeApi";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type Line = { item_id: string; quantity: string; rate: string; discount: string; tax_rate: string };

export default function ImportReceiptNewPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const poFromUrl = sp.get("import_purchase_order_id") || "";

  const poUrl = companyId ? withQuery(`${importCompanyBase(companyId)}/purchase-orders`, { skip: 0, limit: 200 }) : null;
  const { data: poList } = useSWR(poUrl, fetcher);
  const { data: items } = useSWR(companyId ? `/inventory/companies/${companyId}/items` : null, fetcher);

  const poRows = useMemo(() => normalizeListResponse<{ id: number; po_no?: string }>(poList), [poList]);
  const poOptions = useMemo(
    () => poRows.map((p) => ({ value: String(p.id), label: p.po_no ? `${p.po_no} (#${p.id})` : `PO #${p.id}` })),
    [poRows]
  );
  const itemOptions = useMemo(
    () => (items || []).map((it: { id: number; name: string }) => ({ value: String(it.id), label: it.name })),
    [items]
  );

  const [importPoId, setImportPoId] = useState(poFromUrl);
  const [receiptNo, setReceiptNo] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([{ item_id: "", quantity: "1", rate: "0", discount: "0", tax_rate: "0" }]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const addLine = () => setLines((l) => [...l, { item_id: "", quantity: "1", rate: "0", discount: "0", tax_rate: "0" }]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      import_purchase_order_id: importPoId,
      receipt_no: receiptNo.trim(),
      received_date: receiptDate.trim(),
      remarks: remarks.trim() || null,
      lines: lines.filter(l => l.item_id).map(l => ({
        item_id: Number(l.item_id),
        quantity: l.quantity,
        rate: l.rate,
        discount: l.discount,
        tax_rate: l.tax_rate,
      })),
    };
    const parsed = importReceiptCreateSchema.safeParse(draft);

    if (!parsed.success) {
      setErr(formatZodIssues(parsed.error));
      return;
    }

    const body: Record<string, unknown> = {
      import_purchase_order_id: parsed.data.import_purchase_order_id,
      receipt_no: parsed.data.receipt_no,
      received_date: parsed.data.received_date,
      lines: parsed.data.lines.map((ln) => ({
        item_id: ln.item_id,
        quantity: ln.quantity,
        rate: ln.rate,
        ...(ln.discount != null ? { discount: ln.discount } : {}),
        ...(ln.tax_rate != null ? { tax_rate: ln.tax_rate } : {}),
      })),
    };
    if (parsed.data.remarks) body.remarks = parsed.data.remarks;

    setSaving(true);
    try {
      const res = await api.post(`${importCompanyBase(companyId)}/receipts`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/import/receipts/${id}`);
      else router.replace(`/companies/${companyId}/import/receipts`);
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
        title="New import warehouse receipt"
        description="Draft receipt for the PO, then post in transit and finalize to a warehouse from the receipt detail page."
        toolbar={<ImportWorkflowStepper activeKey="receipt" />}
      >
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection variant="import" title="Receipt Header" subtitle="Select PO and receipt meta details.">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Import PO *
              <SearchableSelect options={poOptions} value={importPoId} onChange={setImportPoId} placeholder="Select PO" triggerClassName="mt-1 h-10" />
            </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Receipt number *
              <input required className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} placeholder="e.g. REC-001" />
            </label>
            <label className="text-xs font-semibold">
              Receipt date *
              <input required type="date" className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Remarks
              <textarea className="mt-1 min-h-[56px] w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
            </label>
          </div>
          </TradeFormSection>

          <TradeFormSection
            variant="import"
            title="Receipt Lines"
            subtitle="Capture received quantities and valuation rates."
            actions={
              <button type="button" onClick={addLine} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">
                + Line
              </button>
            }
          >
          <div className="space-y-2">
            <div className="hidden sm:grid sm:grid-cols-5 gap-2 rounded-lg border border-slate-200 bg-slate-100/80 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <span>Item</span>
              <span>Qty</span>
              <span>Rate</span>
              <span>Discount</span>
              <span>Tax %</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-500">Receipt lines</span>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border border-slate-100 p-2 sm:grid-cols-5 dark:border-slate-800">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 sm:hidden">Item</span>
                  <SearchableSelect
                    options={itemOptions}
                    value={line.item_id}
                    onChange={(v) => {
                      const c = [...lines];
                      c[idx] = { ...c[idx], item_id: v };
                      setLines(c);
                    }}
                    placeholder="Item"
                    triggerClassName="h-9 text-xs"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 sm:hidden">Qty</span>
                  <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={line.quantity} onChange={(e) => { const c=[...lines]; c[idx].quantity=e.target.value; setLines(c);}} placeholder="Qty" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 sm:hidden">Rate</span>
                  <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={line.rate} onChange={(e) => { const c=[...lines]; c[idx].rate=e.target.value; setLines(c);}} placeholder="Rate" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 sm:hidden">Discount</span>
                  <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={line.discount} onChange={(e) => { const c=[...lines]; c[idx].discount=e.target.value; setLines(c);}} placeholder="Disc" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 sm:hidden">Tax %</span>
                  <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" value={line.tax_rate} onChange={(e) => { const c=[...lines]; c[idx].tax_rate=e.target.value; setLines(c);}} placeholder="Tax %" />
                </label>
              </div>
            ))}

          </div>
          </TradeFormSection>
          {err && <div className="text-xs text-rose-600">{err}</div>}
          <div className="sticky bottom-2 z-10 rounded-xl border border-indigo-100 bg-white/95 p-2 backdrop-blur dark:border-indigo-900/40 dark:bg-slate-950/95">
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Creating…" : "Create receipt"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
