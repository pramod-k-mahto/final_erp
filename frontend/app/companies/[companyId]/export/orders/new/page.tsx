"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { exportCompanyBase } from "@/lib/importExport/paths";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ExportWorkflowStepper } from "@/components/importExport/ExportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import { formatZodIssues, exportOrderPayloadSchema, type ExportOrderPayload } from "@/lib/importExport/schemas";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type Line = { item_id: string; quantity: string; rate: string; discount: string; tax_rate: string };

export default function ExportOrderNewPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = String(params?.companyId ?? "");

  const { data: customers } = useSWR(companyId ? `/sales/companies/${companyId}/customers` : null, fetcher);
  const { data: items } = useSWR(companyId ? `/inventory/companies/${companyId}/items` : null, fetcher);

  const [customerId, setCustomerId] = useState("");
  const [orderNo, setOrderNo] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([{ item_id: "", quantity: "1", rate: "0", discount: "0", tax_rate: "0" }]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const customerOptions = useMemo(
    () => (customers || []).map((c: { id: number; name?: string; party_name?: string }) => ({ value: String(c.id), label: c.name || c.party_name || `Customer #${c.id}` })),
    [customers]
  );
  const itemOptions = useMemo(
    () => (items || []).map((it: { id: number; name: string }) => ({ value: String(it.id), label: it.name })),
    [items]
  );

  const addLine = () => setLines((l) => [...l, { item_id: "", quantity: "1", rate: "0", discount: "0", tax_rate: "0" }]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const linePayload = lines
      .filter((l) => l.item_id)
      .map((l) => ({
        item_id: Number(l.item_id),
        quantity: Number(l.quantity),
        rate: Number(l.rate),
        discount: Number(l.discount || 0),
        tax_rate: Number(l.tax_rate || 0),
      }));

    const draft: ExportOrderPayload = {
      customer_id: Number(customerId),
      order_no: orderNo.trim(),
      currency_code: currencyCode.trim() || null,
      exchange_rate: exchangeRate.trim() ? Number(exchangeRate) : null,
      remarks: remarks.trim() || null,
      lines: linePayload,
    };

    const parsed = exportOrderPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErr(formatZodIssues(parsed.error));
      return;
    }

    const body: Record<string, unknown> = {
      customer_id: parsed.data.customer_id,
      order_no: parsed.data.order_no,
      lines: parsed.data.lines,
    };
    if (parsed.data.currency_code) {
      body.currency_code = parsed.data.currency_code;
      body.exchange_rate = parsed.data.exchange_rate;
    }
    if (parsed.data.remarks) body.remarks = parsed.data.remarks;

    setSaving(true);
    try {
      const res = await api.post(`${exportCompanyBase(companyId)}/orders`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/export/orders/${id}`);
      else router.replace(`/companies/${companyId}/export/orders`);
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <ExportModuleNav companyId={companyId} />
      <TradeTransactionShell title="New export order" description="Create the export order, then add shipments, customs, and invoices." toolbar={<ExportWorkflowStepper activeKey="order" />}>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection
            variant="export"
            title="Order Header"
            subtitle="Customer, currency, and notes for the export order."
          >
            <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Customer *
              <SearchableSelect
                options={customerOptions}
                value={customerId}
                onChange={setCustomerId}
                placeholder="Select customer"
                triggerClassName="mt-1 h-10"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Order number *
              <input
                required
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Currency
              <input className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} placeholder="e.g. USD" />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Exchange rate
              <input className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Remarks
              <textarea className="mt-1 min-h-[64px] w-full rounded-md border px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
            </label>
            </div>
          </TradeFormSection>
          <TradeFormSection
            variant="export"
            title="Order Lines"
            subtitle="Add export line items with quantity, rate, discount, and tax."
            actions={
              <button type="button" onClick={addLine} className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300">
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
              <span className="text-xs font-bold uppercase text-slate-500">Lines</span>
            </div>
            {lines.map((line, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border border-slate-100 p-2 sm:grid-cols-5 dark:border-slate-800">
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
                <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Qty" value={line.quantity} onChange={(e) => { const c=[...lines]; c[idx].quantity=e.target.value; setLines(c);}} />
                <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Rate" value={line.rate} onChange={(e) => { const c=[...lines]; c[idx].rate=e.target.value; setLines(c);}} />
                <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Disc" value={line.discount} onChange={(e) => { const c=[...lines]; c[idx].discount=e.target.value; setLines(c);}} />
                <input className="h-9 rounded border px-2 text-xs dark:border-slate-700 dark:bg-slate-900" placeholder="Tax %" value={line.tax_rate} onChange={(e) => { const c=[...lines]; c[idx].tax_rate=e.target.value; setLines(c);}} />
              </div>
            ))}
            </div>
          </TradeFormSection>
          {err && <div className="text-xs text-rose-600">{err}</div>}
          <div className="sticky bottom-2 z-10 rounded-xl border border-emerald-100 bg-white/95 p-2 backdrop-blur dark:border-emerald-900/40 dark:bg-slate-950/95">
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Creating…" : "Create order"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
