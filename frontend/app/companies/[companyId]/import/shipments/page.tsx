"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { TradeListShell } from "@/components/importExport/TradeListShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportShipmentsListPage() {
  const params = useParams();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const poFilter = sp.get("import_purchase_order_id") || "";
  const url = companyId
    ? withQuery(`${importCompanyBase(companyId)}/shipments`, {
        skip: 0,
        limit: 100,
        ...(poFilter ? { import_purchase_order_id: poFilter } : {}),
      })
    : null;
  const { data, isLoading, error } = useSWR(url, fetcher);
  const rows: any[] = Array.isArray(data) ? data : data?.items || data?.results || [];

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeListShell
        variant="import"
        title="Import shipments"
        description="Track BL/reference details and move into customs, expenses, and receipt flow."
        badge="Shipment Board"
        helperText="Filter by PO with query parameter: ?import_purchase_order_id=123"
        actions={
          <Link
            href={`/companies/${companyId}/import/shipments/new`}
            className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(79,70,229,0.35)]"
          >
            New shipment
          </Link>
        }
      >
        {isLoading && <p className="px-3 py-2 text-sm">Loading…</p>}
        {error && <p className="px-3 py-2 text-sm text-rose-600">Failed to load.</p>}
        <table className="w-full text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">BL / Ref</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-2 font-mono">{r.id}</td>
                <td className="p-2">{r.bl_no ?? r.pragyapan_no ?? r.reference ?? "—"}</td>
                <td className="p-2">
                  <Link className="font-semibold text-indigo-600 hover:underline" href={`/companies/${companyId}/import/shipments/${r.id}`}>
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
