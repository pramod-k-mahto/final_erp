"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { TradeListShell } from "@/components/importExport/TradeListShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportReceiptsListPage() {
  const params = useParams();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const po = sp.get("import_purchase_order_id") || "";
  const url = companyId
    ? withQuery(`${importCompanyBase(companyId)}/receipts`, { skip: 0, limit: 100, ...(po ? { import_purchase_order_id: po } : {}) })
    : null;
  const { data, isLoading, error } = useSWR(url, fetcher);
  const rows: any[] = Array.isArray(data) ? data : data?.items || data?.results || [];

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeListShell
        variant="import"
        title="Import receipts"
        description="Confirm goods receipts and continue to landed-cost reconciliation."
        badge="Receipt Desk"
        helperText="Virtual warehouse IN_TRANSIT is managed automatically by backend posting."
        actions={
          <Link href={`/companies/${companyId}/import/receipts/new`} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]">
            New receipt
          </Link>
        }
      >
        {isLoading && <p className="px-3 py-2 text-sm">Loading…</p>}
        {error && <p className="px-3 py-2 text-sm text-rose-600">Failed to load.</p>}
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t dark:border-slate-800">
                <td className="p-2 font-mono">{r.id}</td>
                <td className="p-2">
                  <Link className="font-semibold text-indigo-600 hover:underline" href={`/companies/${companyId}/import/receipts/${r.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TradeListShell>
    </div>
  );
}
