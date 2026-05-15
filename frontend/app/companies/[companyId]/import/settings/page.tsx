"use client";

import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import type { ImportAccountingProfile } from "@/types/importExport";
import { LedgerPicker } from "@/components/importExport/LedgerPicker";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportAccountingSettingsPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");

  const { data, error, isLoading, mutate } = useSWR<ImportAccountingProfile>(
    companyId ? `${importCompanyBase(companyId)}/accounting-profile` : null,
    fetcher
  );

  const [form, setForm] = useState<ImportAccountingProfile>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setForm({ ...data });
  }, [data]);

  const setId = (key: keyof ImportAccountingProfile, v: number | null) => {
    setForm((f) => ({ ...f, [key]: v }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);
    try {
      await api.put(`${importCompanyBase(companyId)}/accounting-profile`, form);
      await mutate();
      setMsg("Profile saved.");
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl">
      <ImportTradeNav companyId={companyId} />
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">Import / export accounting defaults</h1>
      <p className="text-xs text-slate-500 mb-4">
        Map ledgers used by GIT vouchers, LC margin, import expenses, VAT receivable, forex, export sales, and default bank.
      </p>
      {isLoading && <div className="text-sm text-slate-500">Loading…</div>}
      {error && (
        <div className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {getApiErrorMessage(error)}
        </div>
      )}
      <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
        <strong className="block text-slate-800 dark:text-slate-100">Help</strong>
        <ul className="mt-1 list-disc space-y-1 pl-4">
          <li>GIT voucher and finalize journal need <code className="font-mono">goods_in_transit_ledger_id</code>.</li>
          <li>LC margin posting needs <code className="font-mono">lc_margin_ledger_id</code> + <code className="font-mono">default_bank_ledger_id</code>.</li>
          <li>Import expense voucher needs <code className="font-mono">import_expense_ledger_id</code> + bank + optional <code className="font-mono">vat_receivable_ledger_id</code>.</li>
        </ul>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="grid gap-4 sm:grid-cols-2">
          <LedgerPicker companyId={companyId} label="Goods in transit" value={form.goods_in_transit_ledger_id ?? ""} onChange={(id) => setId("goods_in_transit_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="LC margin" value={form.lc_margin_ledger_id ?? ""} onChange={(id) => setId("lc_margin_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="Advance supplier" value={form.advance_supplier_ledger_id ?? ""} onChange={(id) => setId("advance_supplier_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="Import expense" value={form.import_expense_ledger_id ?? ""} onChange={(id) => setId("import_expense_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="VAT receivable" value={form.vat_receivable_ledger_id ?? ""} onChange={(id) => setId("vat_receivable_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="Forex gain/loss" value={form.forex_gain_loss_ledger_id ?? ""} onChange={(id) => setId("forex_gain_loss_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="Export sales" value={form.export_sales_ledger_id ?? ""} onChange={(id) => setId("export_sales_ledger_id", id)} />
          <LedgerPicker companyId={companyId} label="Default bank" value={form.default_bank_ledger_id ?? ""} onChange={(id) => setId("default_bank_ledger_id", id)} />
        </div>
        {msg && <div className="text-xs font-medium text-emerald-600">{msg}</div>}
        {err && <div className="text-xs font-medium text-rose-600">{err}</div>}
        <button
          type="submit"
          disabled={saving || !companyId}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
