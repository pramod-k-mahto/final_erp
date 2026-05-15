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

export default function ImportExpenseDetailPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const expenseId = String(params?.expenseId ?? "");
  const url = companyId && expenseId ? `${importCompanyBase(companyId)}/expenses/${expenseId}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);
  const [voucherDate, setVoucherDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const postVoucher = async () => {
    setMsg(null);
    setErr(null);
    try {
      const q = voucherDate ? `?voucher_date=${encodeURIComponent(voucherDate)}` : "";
      await api.post(`${importCompanyBase(companyId)}/expenses/${expenseId}/post-voucher${q}`);
      setMsg("Voucher posted.");
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    }
  };

  return (
    <div className="p-4 max-w-5xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell title={`Import expense #${expenseId}`} description="Review expense detail and post accounting voucher." toolbar={<ImportWorkflowStepper activeKey="expense" />}>
      <div className="px-4 pt-4">
        <Link href={`/companies/${companyId}/import/shipments`} className="text-xs text-indigo-600 hover:underline">
          ← Shipments
        </Link>
      </div>
      {isLoading && <p className="mt-3 px-4 text-sm">Loading…</p>}
      {error && <p className="mt-3 px-4 text-sm text-rose-600">{getApiErrorMessage(error)}</p>}
      {data && (
        <div className="m-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <TradeEntityDetailView data={data} />
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Voucher date (optional)
          <input
            type="date"
            className="ml-2 mt-1 block rounded-md border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-900"
            value={voucherDate}
            onChange={(e) => setVoucherDate(e.target.value)}
          />
        </label>
        <button type="button" onClick={postVoucher} className="trade-btn trade-btn-import px-3 py-2 text-xs">
          Post voucher
        </button>
        <button type="button" onClick={() => mutate()} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-600">
          Refresh
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      </TradeTransactionShell>
    </div>
  );
}
