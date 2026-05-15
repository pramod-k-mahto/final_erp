"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { FormEvent, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { normalizeListResponse } from "@/lib/importExport/tradeApi";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportLandedCostsPage() {
  const params = useParams();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const poFromUrl = sp.get("import_purchase_order_id") || "";

  const poUrl = companyId ? withQuery(`${importCompanyBase(companyId)}/purchase-orders`, { skip: 0, limit: 200 }) : null;
  const { data: poList } = useSWR(poUrl, fetcher);
  const poRows = useMemo(() => normalizeListResponse<{ id: string; po_no?: string }>(poList), [poList]);
  const poOptions = useMemo(
    () => poRows.map((p) => ({ value: p.id, label: p.po_no ? `${p.po_no} (${p.id.slice(0, 8)}…)` : `PO ${p.id.slice(0, 8)}…` })),
    [poRows]
  );


  const [po, setPo] = useState(poFromUrl);
  const [method, setMethod] = useState<"QUANTITY" | "ITEM_VALUE">("QUANTITY");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const listUrl = companyId
    ? withQuery(`${importCompanyBase(companyId)}/landed-costs`, {
        skip: 0,
        limit: 50,
        ...(po ? { import_purchase_order_id: po } : {}),
      })
    : null;
  const { data, isLoading, error, mutate } = useSWR(listUrl, fetcher);
  const rows: any[] = Array.isArray(data) ? data : data?.items || data?.results || [];

  const compute = async (e: FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    try {
      await api.post(`${importCompanyBase(companyId)}/landed-costs/compute`, {
        import_purchase_order_id: po,
        allocation_method: method,
      });

      setMsg("Compute triggered.");
      await mutate();
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    }
  };

  return (
    <div className="p-4 max-w-4xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title="Landed costs"
        description="Allocate shipment and clearing costs to PO lines by quantity or item value, then review each run."
        toolbar={<ImportWorkflowStepper activeKey="landed" />}
      >
        <form onSubmit={compute} className="space-y-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Import PO *
            <SearchableSelect options={poOptions} value={po} onChange={setPo} placeholder="Select PO" triggerClassName="mt-1 h-10" />
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Method
              <select
                className="ml-1 mt-1 block h-10 rounded-md border border-slate-200 px-2 dark:border-slate-600 dark:bg-slate-900"
                value={method}
                onChange={(e) => setMethod(e.target.value as "QUANTITY" | "ITEM_VALUE")}
              >
                <option value="QUANTITY">QUANTITY</option>
                <option value="ITEM_VALUE">ITEM_VALUE</option>
              </select>
            </label>
            <button type="submit" className="trade-btn trade-btn-import px-4 py-2 text-xs">
              Recalculate landed cost
            </button>
          </div>
          {msg && <p className="text-xs text-emerald-600">{msg}</p>}
          {err && <p className="text-xs text-rose-600">{err}</p>}
        </form>
        {isLoading && <p className="p-4 text-sm text-slate-500">Loading runs…</p>}
        {error && <p className="p-4 text-sm text-rose-600">Failed to load runs.</p>}
        <div className="overflow-x-auto p-4">
          <table className="w-full border text-xs dark:border-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="p-2 text-left">Run ID</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t dark:border-slate-800">
                  <td className="p-2 font-mono">{r.id}</td>
                  <td className="p-2">
                    <Link href={`/companies/${companyId}/import/landed-costs/${r.id}`} className="text-indigo-600 hover:underline">
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TradeTransactionShell>
    </div>
  );
}
