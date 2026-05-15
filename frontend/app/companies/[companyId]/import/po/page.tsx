"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { normalizeListResponse } from "@/lib/importExport/tradeApi";
import { TradeListShell } from "@/components/importExport/TradeListShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

const PAGE_SIZE = 25;

export default function ImportPurchaseOrdersListPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const [skip, setSkip] = useState(0);

  const url = companyId
    ? withQuery(`${importCompanyBase(companyId)}/purchase-orders`, { skip, limit: PAGE_SIZE })
    : null;
  const { data, error, isLoading } = useSWR(url, fetcher);

  const rows = useMemo(() => normalizeListResponse<Record<string, unknown>>(data), [data]);
  const hasNext = rows.length === PAGE_SIZE;

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeListShell
        variant="import"
        title="Import purchase orders"
        description="Track supplier purchase orders and jump into detailed trade operations."
        badge="PO Ledger"
        actions={
          <Link
            href={`/companies/${companyId}/import/po/new`}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]"
          >
            New PO
          </Link>
        }
      >
        {isLoading && <p className="px-3 py-2 text-sm text-slate-500">Loading…</p>}
        {error && <p className="px-3 py-2 text-sm text-rose-600">Failed to load list.</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">PO #</th>
              <th className="p-2">Supplier</th>
              <th className="p-2"></th>
            </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.id)} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-2 font-mono">{String(r.id)}</td>
                  <td className="p-2">{String((r as { po_no?: string }).po_no ?? "")}</td>
                  <td className="p-2">{(r as { supplier_name?: string }).supplier_name ?? (r as { supplier_id?: number }).supplier_id}</td>
                  <td className="p-2">
                    <Link className="font-semibold text-indigo-600 hover:underline" href={`/companies/${companyId}/import/po/${r.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <span>
            Page {Math.floor(skip / PAGE_SIZE) + 1} · {PAGE_SIZE} per page
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40 dark:border-slate-600"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setSkip((s) => s + PAGE_SIZE)}
              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold disabled:opacity-40 dark:border-slate-600"
            >
              Next
            </button>
          </div>
        </div>
      </TradeListShell>
    </div>
  );
}
