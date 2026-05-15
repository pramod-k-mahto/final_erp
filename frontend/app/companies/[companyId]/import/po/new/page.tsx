"use client";

import { useParams, useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import {
  formatZodIssues,
  importPurchaseOrderPayloadSchema,
  type ImportPurchaseOrderPayload,
} from "@/lib/importExport/schemas";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type Line = { item_id: string; quantity: string; rate: string; discount: string; tax_rate: string };

export default function ImportPONewPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = String(params?.companyId ?? "");

  const { data: suppliers } = useSWR(companyId ? `/purchases/companies/${companyId}/suppliers` : null, fetcher);
  const { data: items } = useSWR(companyId ? `/inventory/companies/${companyId}/items` : null, fetcher);

  const [supplierId, setSupplierId] = useState("");
  const [poNo, setPoNo] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [incoterm, setIncoterm] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [expectedArrivalDate, setExpectedArrivalDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<Line[]>([{ item_id: "", quantity: "1", rate: "0", discount: "0", tax_rate: "0" }]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const supplierOptions = useMemo(
    () => (suppliers || []).map((s: { id: number; name: string }) => ({ value: String(s.id), label: s.name })),
    [suppliers]
  );
  const itemOptions = useMemo(
    () => (items || []).map((it: { id: number; name: string }) => ({ value: String(it.id), label: it.name })),
    [items]
  );

  const addLine = () => setLines((l) => [...l, { item_id: "", quantity: "1", rate: "0", discount: "0", tax_rate: "0" }]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    const draft: ImportPurchaseOrderPayload = {
      supplier_id: Number(supplierId), // Supplier ID is a positive int
      po_no: poNo.trim(),
      currency_code: currencyCode.trim() || null,
      exchange_rate,
      incoterm: incoterm.trim() || null,
      country_of_origin: countryOfOrigin.trim() || null,
      expected_arrival_date: expectedArrivalDate.trim() || null,
      remarks: remarks.trim() || null,
      lines: lines.filter(l => l.item_id).map(l => ({
        item_id: Number(l.item_id),
        quantity: l.quantity,
        rate: l.rate,
        discount: l.discount,
        tax_rate: l.tax_rate,
      })),
    };


    const parsed = importPurchaseOrderPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErr(formatZodIssues(parsed.error));
      return;
    }

    const body: Record<string, unknown> = {
      supplier_id: parsed.data.supplier_id,
      po_no: parsed.data.po_no,
      items: parsed.data.lines,
    };

    if (parsed.data.currency_code) {
      body.currency_code = parsed.data.currency_code;
      body.exchange_rate = parsed.data.exchange_rate;
    }
    if (parsed.data.incoterm) body.incoterm = parsed.data.incoterm;
    if (parsed.data.country_of_origin) body.country_of_origin = parsed.data.country_of_origin;
    if (parsed.data.expected_arrival_date) body.expected_arrival_date = parsed.data.expected_arrival_date;
    if (parsed.data.remarks) body.remarks = parsed.data.remarks;

    setSaving(true);
    try {
      const res = await api.post(`${importCompanyBase(companyId)}/purchase-orders`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/import/po/${id}`);
      else router.replace(`/companies/${companyId}/import/po`);
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
        title="New import purchase order"
        description="Create the import PO, then continue with LC, shipment, customs, landed cost, and warehouse receipt."
        toolbar={<ImportWorkflowStepper activeKey="po" />}
      >
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection
            variant="import"
            title="PO Header"
            subtitle="Supplier, terms, currency, and expected arrival details."
          >
            <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Supplier *
              <SearchableSelect
                options={supplierOptions}
                value={supplierId}
                onChange={setSupplierId}
                placeholder="Select supplier"
                triggerClassName="mt-1 h-10"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              PO number *
              <input
                required
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm shadow-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-900"
                value={poNo}
                onChange={(e) => setPoNo(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Currency
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                placeholder="e.g. USD"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Exchange rate
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                placeholder="Required if currency is set"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Incoterm
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                placeholder="e.g. FOB"
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Country of origin
              <input
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={countryOfOrigin}
                onChange={(e) => setCountryOfOrigin(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Expected arrival
              <input
                type="date"
                className="mt-1 h-10 w-full rounded-md border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={expectedArrivalDate}
                onChange={(e) => setExpectedArrivalDate(e.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200 sm:col-span-2">
              Remarks
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
              />
            </label>
            </div>
          </TradeFormSection>

          <TradeFormSection
            variant="import"
            title="Line Items"
            subtitle="Add all ordered items with quantity, rate, discount, and tax."
            actions={
              <button type="button" onClick={addLine} className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300">
                + Add line
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
              <span className="text-xs font-bold uppercase text-slate-500">Line items</span>
            </div>
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 sm:grid-cols-5 dark:border-slate-800 dark:bg-slate-900/30"
              >
                <SearchableSelect
                  options={itemOptions}
                  value={line.item_id}
                  onChange={(v) => {
                    const copy = [...lines];
                    copy[idx] = { ...copy[idx], item_id: v };
                    setLines(copy);
                  }}
                  placeholder="Item"
                  triggerClassName="h-9 text-xs"
                />
                <input
                  className="h-9 rounded-md border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) => {
                    const c = [...lines];
                    c[idx].quantity = e.target.value;
                    setLines(c);
                  }}
                />
                <input
                  className="h-9 rounded-md border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Rate"
                  value={line.rate}
                  onChange={(e) => {
                    const c = [...lines];
                    c[idx].rate = e.target.value;
                    setLines(c);
                  }}
                />
                <input
                  className="h-9 rounded-md border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Discount"
                  value={line.discount}
                  onChange={(e) => {
                    const c = [...lines];
                    c[idx].discount = e.target.value;
                    setLines(c);
                  }}
                />
                <input
                  className="h-9 rounded-md border border-slate-200 px-2 text-xs dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Tax %"
                  value={line.tax_rate}
                  onChange={(e) => {
                    const c = [...lines];
                    c[idx].tax_rate = e.target.value;
                    setLines(c);
                  }}
                />
              </div>
            ))}
            </div>
          </TradeFormSection>

          {err ? <div className="text-xs text-rose-600">{err}</div> : null}
          <div className="sticky bottom-2 z-10 rounded-xl border border-indigo-100 bg-white/95 p-2 backdrop-blur dark:border-indigo-900/40 dark:bg-slate-950/95">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:from-indigo-700 hover:to-violet-700 disabled:opacity-50"
            >
              {saving ? "Creating…" : "Create PO"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
