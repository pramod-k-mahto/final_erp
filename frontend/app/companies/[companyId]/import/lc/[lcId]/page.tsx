"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export default function ImportLCDetailPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const lcId = String(params?.lcId ?? "");
  const url = companyId && lcId ? `${importCompanyBase(companyId)}/lc/${lcId}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);
  const [voucherDate, setVoucherDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const marginDone = useMemo(() => {
    if (!isRecord(data)) return false;
    if (data.margin_voucher_id != null && data.margin_voucher_id !== "") return true;
    if (data.is_margin_posted === true || data.margin_posted === true) return true;
    if (typeof data.margin_voucher_status === "string" && data.margin_voucher_status.toLowerCase() === "posted") return true;
    return false;
  }, [data]);

  const postMargin = async () => {
    setMsg(null);
    setErr(null);
    try {
      const q = voucherDate ? `?voucher_date=${encodeURIComponent(voucherDate)}` : "";
      await api.post(`${importCompanyBase(companyId)}/lc/${lcId}/post-margin-voucher${q}`);
      setMsg("Margin voucher posted (or backend acknowledged).");
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditValues({
      lc_no: data?.lc_no || "",
      lc_date: data?.lc_date || "",
      lc_bank: data?.lc_bank || "",
      lc_expiry_date: data?.lc_expiry_date || "",
      margin_amount: data?.margin_amount || 0,
      swift_charge: data?.swift_charge || 0,
      bank_charge: data?.bank_charge || 0,
      lc_amount: data?.lc_amount || 0,
    });
    setIsEditing(true);
  };

  const saveEdits = async () => {
    setErr(null);
    setSaving(true);
    try {
      await api.patch(`${importCompanyBase(companyId)}/lc/${lcId}`, editValues);
      setIsEditing(false);
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";
  const labelCls = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <div className="p-4 max-w-5xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell title={data?.lc_no ? `LC #${data.lc_no}` : "Loading..."} description="Review LC details and post margin voucher when ready." toolbar={<ImportWorkflowStepper activeKey="lc" />}>
      <div className="px-4 pt-4 flex justify-between items-center">
        <Link href={`/companies/${companyId}/import/lc`} className="text-xs text-indigo-600 hover:underline">
          ← All LCs
        </Link>
        {!marginDone && !isEditing && (
          <button onClick={startEdit} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
            Edit LC Details
          </button>
        )}
      </div>
      {isLoading && <p className="mt-3 px-4 text-sm">Loading…</p>}
      {error && <p className="mt-3 px-4 text-sm text-rose-600">{getApiErrorMessage(error)}</p>}
      {data && (
        <div className="m-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>LC Number</label>
                  <input
                    className={inputCls}
                    value={editValues.lc_no}
                    onChange={(e) => setEditValues({ ...editValues, lc_no: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>LC Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editValues.lc_date}
                    onChange={(e) => setEditValues({ ...editValues, lc_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>LC Bank</label>
                  <input
                    className={inputCls}
                    value={editValues.lc_bank}
                    onChange={(e) => setEditValues({ ...editValues, lc_bank: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editValues.lc_expiry_date}
                    onChange={(e) => setEditValues({ ...editValues, lc_expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>LC Amount</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editValues.lc_amount}
                    onChange={(e) => setEditValues({ ...editValues, lc_amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Margin Amount</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editValues.margin_amount}
                    onChange={(e) => setEditValues({ ...editValues, margin_amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>SWIFT Charge</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editValues.swift_charge}
                    onChange={(e) => setEditValues({ ...editValues, swift_charge: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Bank Charge</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={editValues.bank_charge}
                    onChange={(e) => setEditValues({ ...editValues, bank_charge: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button 
                  onClick={saveEdits} 
                  disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <TradeEntityDetailView data={data} />
          )}
          {!isEditing && (
            <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Voucher date (optional)
                <input
                  type="date"
                  className="ml-2 mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                  value={voucherDate}
                  onChange={(e) => setVoucherDate(e.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={marginDone}
                title={marginDone ? "Margin voucher already posted (per API fields)." : undefined}
                onClick={postMargin}
                className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Post margin voucher
              </button>
              <button type="button" onClick={() => mutate()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-600">
                Refresh
              </button>
            </div>
          )}
          {marginDone && <p className="mt-2 text-xs text-slate-500">Margin voucher appears to be posted. If wrong, refresh after backend updates.</p>}
          {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
          {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
        </div>
      )}
      </TradeTransactionShell>
    </div>
  );
}

