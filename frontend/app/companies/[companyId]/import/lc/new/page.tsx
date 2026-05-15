"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import { formatZodIssues, importLcPayloadSchema } from "@/lib/importExport/schemas";
import { normalizeListResponse } from "@/lib/importExport/tradeApi";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportLCNewPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = String(params?.companyId ?? "");

  const poUrl = companyId ? withQuery(`${importCompanyBase(companyId)}/purchase-orders`, { skip: 0, limit: 200 }) : null;
  const { data: poList } = useSWR(poUrl, fetcher);
  const poRows = useMemo(() => normalizeListResponse<{ id: number; po_no?: string }>(poList), [poList]);
  const poOptions = useMemo(
    () => poRows.map((p) => ({ value: String(p.id), label: p.po_no ? `${p.po_no} (#${p.id})` : `PO #${p.id}` })),
    [poRows]
  );

  const [importPoId, setImportPoId] = useState("");
  const [lcNo, setLcNo] = useState("");
  const [lcDate, setLcDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [lcAmount, setLcAmount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [marginAmount, setMarginAmount] = useState("");
  const [swiftCharge, setSwiftCharge] = useState("");
  const [bankCharge, setBankCharge] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      import_purchase_order_id: importPoId ? importPoId : null,
      lc_no: lcNo.trim(),
      lc_date: lcDate.trim(),
      lc_bank: bankName.trim(),
      lc_amount: lcAmount,          // coerced by z.preprocess in schema
      lc_expiry_date: expiryDate.trim() || null,
      margin_amount: marginAmount,  // coerced by z.preprocess in schema
      swift_charge: swiftCharge,    // coerced by z.preprocess in schema
      bank_charge: bankCharge,      // coerced by z.preprocess in schema
    };
    const parsed = importLcPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErr(formatZodIssues(parsed.error));
      return;
    }
    const body: Record<string, unknown> = { ...parsed.data };
    if (body.import_purchase_order_id == null) delete body.import_purchase_order_id;
    setSaving(true);
    try {
      const res = await api.post(`${importCompanyBase(companyId)}/lc`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/import/lc/${id}`);
      else router.replace(`/companies/${companyId}/import/lc`);
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
        title="New letter of credit"
        description="Link an optional import PO. After save, post the margin voucher from the LC detail screen when the accounting profile is complete."
        toolbar={<ImportWorkflowStepper activeKey="lc" />}
      >
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection variant="import" title="LC Details" subtitle="Capture core letter-of-credit data and optional PO linkage.">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold sm:col-span-2 text-slate-700 dark:text-slate-200">
                Import PO (optional)
                <SearchableSelect
                  options={poOptions}
                  value={importPoId}
                  onChange={setImportPoId}
                  placeholder="None"
                  triggerClassName="mt-1 h-10"
                />
              </label>
              <label className="text-xs font-semibold">
                LC number *
                <input required className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={lcNo} onChange={(e) => setLcNo(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                LC date *
                <input required type="date" className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={lcDate} onChange={(e) => setLcDate(e.target.value)} />
              </label>
              <label className="text-xs font-semibold sm:col-span-2">
                Bank name *
                <input required className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bankName} onChange={(e) => setBankName(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                LC amount *
                <input required className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={lcAmount} onChange={(e) => setLcAmount(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                Expiry date
                <input type="date" className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                Margin amount
                <input className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={marginAmount} onChange={(e) => setMarginAmount(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                SWIFT charge
                <input className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={swiftCharge} onChange={(e) => setSwiftCharge(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                Bank charge
                <input className="mt-1 h-10 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={bankCharge} onChange={(e) => setBankCharge(e.target.value)} />
              </label>
            </div>
          </TradeFormSection>
          {err ? <div className="text-xs text-rose-600">{err}</div> : null}
          <div className="sticky bottom-2 z-10 rounded-xl border border-indigo-100 bg-white/95 p-2 backdrop-blur dark:border-indigo-900/40 dark:bg-slate-950/95">
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Creating…" : "Create LC"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
