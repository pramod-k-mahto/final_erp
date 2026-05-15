"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportReceiptDetailPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const receiptId = String(params?.receiptId ?? "");
  const url = companyId && receiptId ? `${importCompanyBase(companyId)}/receipts/${receiptId}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  const { data: warehouses } = useSWR(
    companyId ? `/inventory/companies/${companyId}/warehouses` : null,
    fetcher
  );

  const [wh, setWh] = useState("");
  const [postJournal, setPostJournal] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const postInTransit = async () => {
    setMsg(null);
    setErr(null);
    try {
      await api.post(`${importCompanyBase(companyId)}/receipts/${receiptId}/post-in-transit`);
      setMsg("Posted to in-transit stock.");
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    }
  };

  const finalize = async () => {
    setMsg(null);
    setErr(null);
    try {
      await api.post(`${importCompanyBase(companyId)}/receipts/${receiptId}/finalize-to-warehouse`, {
        to_warehouse_id: Number(wh),
        post_stock_journal: postJournal,
      });
      setMsg("Finalized to warehouse.");
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    }
  };

  return (
    <div className="p-4 max-w-5xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title={`Receipt #${receiptId}`}
        description="Draft -> in-transit posting -> warehouse finalization with optional stock journal."
        toolbar={<ImportWorkflowStepper activeKey="receipt" />}
      >
      <div className="px-4 pt-4">
        <Link href={`/companies/${companyId}/import/receipts`} className="text-xs text-indigo-600 hover:underline">
          ← Receipts
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          Draft {'->'} Post in transit (virtual warehouse <span className="font-mono">IN_TRANSIT</span>) {'->'} Finalize to destination warehouse.
        </p>
      </div>
      {isLoading && <p className="mt-3 px-4 text-sm">Loading…</p>}
      {error && <p className="mt-3 px-4 text-sm text-rose-600">{getApiErrorMessage(error)}</p>}
      {data && (
        <div className="m-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <TradeEntityDetailView data={data} />
        </div>
      )}

      <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs dark:border-slate-700 dark:bg-slate-900/40">
        <button type="button" onClick={postInTransit} className="rounded-lg bg-slate-800 px-3 py-2 font-semibold text-white hover:bg-slate-900">
          Post to in-transit stock
        </button>
        <div className="flex flex-wrap items-end gap-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <label className="font-semibold text-slate-700 dark:text-slate-200">
            Destination warehouse
            <select
              className="ml-1 mt-1 block h-9 min-w-[200px] rounded-md border border-slate-200 px-2 dark:border-slate-600 dark:bg-slate-900"
              value={wh}
              onChange={(e) => setWh(e.target.value)}
            >
              <option value="">— Select —</option>
              {(warehouses || []).map((w: { id: number; name: string }) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={postJournal} onChange={(e) => setPostJournal(e.target.checked)} />
            Post stock journal
          </label>
          <button type="button" onClick={finalize} className="trade-btn trade-btn-import px-3 py-2">
            Finalize to warehouse
          </button>
          <button type="button" onClick={() => mutate()} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold dark:border-slate-600">
            Refresh
          </button>
        </div>
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      </TradeTransactionShell>
    </div>
  );
}
