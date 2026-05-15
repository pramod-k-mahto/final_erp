"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { exportCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { TradeListShell } from "@/components/importExport/TradeListShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ExportInvoicesListPage() {
  const params = useParams();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const eo = sp.get("export_order_id") || "";
  const url = companyId ? withQuery(`${exportCompanyBase(companyId)}/invoices`, { skip: 0, limit: 100, ...(eo ? { export_order_id: eo } : {}) }) : null;
  const { data, isLoading, error } = useSWR(url, fetcher);
  const rows: any[] = Array.isArray(data) ? data : data?.items || data?.results || [];

  return (
    <div className="p-4">
      <ExportModuleNav companyId={companyId} />
      <TradeListShell
        variant="export"
        title="Export invoices"
        description="Review export invoices and open line-level invoice details quickly."
        badge="Invoice Desk"
        actions={
          <Link href={`/companies/${companyId}/export/invoices/new`} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_8px_18px_rgba(5,150,105,0.35)]">
            New invoice
          </Link>
        }
      >
        {isLoading && <p className="px-3 py-2 text-sm">Loading…</p>}
        {error && <p className="px-3 py-2 text-sm text-rose-600">Failed.</p>}
        <ul className="divide-y divide-slate-100 px-3 py-1 text-xs dark:divide-slate-800">
          {rows.map((r) => (
            <li key={r.id} className="py-2">
              <Link className="font-semibold text-emerald-700 hover:underline" href={`/companies/${companyId}/export/invoices/${r.id}`}>
                Invoice #{r.id}
              </Link>
            </li>
          ))}
        </ul>
      </TradeListShell>
    </div>
  );
}
