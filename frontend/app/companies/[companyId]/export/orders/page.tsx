"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { exportCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { TradeListShell } from "@/components/importExport/TradeListShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ExportOrdersListPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const url = companyId ? withQuery(`${exportCompanyBase(companyId)}/orders`, { skip: 0, limit: 100 }) : null;
  const { data, isLoading, error } = useSWR(url, fetcher);
  const rows: any[] = Array.isArray(data) ? data : data?.items || data?.results || [];

  return (
    <div className="p-4">
      <ExportModuleNav companyId={companyId} />
      <TradeListShell
        variant="export"
        title="Export orders"
        description="Manage buyer orders and move them through shipment and invoice flow."
        badge="Order Desk"
        actions={
          <Link
            href={`/companies/${companyId}/export/orders/new`}
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(5,150,105,0.35)]"
          >
            New order
          </Link>
        }
      >
        {isLoading && <p className="px-3 py-2 text-sm">Loading…</p>}
        {error && <p className="px-3 py-2 text-sm text-rose-600">Failed to load.</p>}
        <table className="w-full text-xs dark:border-slate-700">
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
                  <Link className="font-semibold text-emerald-700 hover:underline" href={`/companies/${companyId}/export/orders/${r.id}`}>
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
