"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const REPORTS = [
  {
    title: "Export order register",
    desc: "Orders, lines, and linked shipments from the export orders area.",
    href: (cid: string) => `/companies/${cid}/export/orders`,
    ready: true,
  },
  {
    title: "Export shipment tracking",
    desc: "Shipment milestones and documents.",
    href: (cid: string) => `/companies/${cid}/export/shipments`,
    ready: true,
  },
  {
    title: "Export sales & invoice register",
    desc: "Export invoices and optional linkage to posted sales invoices when enabled.",
    href: (cid: string) => `/companies/${cid}/export/invoices`,
    ready: true,
  },
  {
    title: "Dispatch summary",
    desc: "Dedicated dispatch API report—add when backend is available.",
    href: null,
    ready: false,
  },
] as const;

export default function ExportReportsHubPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");

  return (
    <div className="p-4">
      <ExportModuleNav companyId={companyId} />
      <TradeTransactionShell title="Export reports" description="Hub for trade registers; extend with API-backed analytics as endpoints ship.">
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {REPORTS.map((r) => (
            <li key={r.title} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">{r.title}</div>
                <p className="mt-0.5 max-w-2xl text-xs text-slate-500">{r.desc}</p>
              </div>
              {r.ready && r.href ? (
                <Link
                  href={r.href(companyId)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Open
                </Link>
              ) : (
                <span className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-center text-xs text-slate-400 dark:border-slate-700">
                  Coming soon
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="border-t border-slate-100 p-4 text-xs text-slate-500 dark:border-slate-800">
          Revenue analytics:{" "}
          <Link className="text-emerald-700 hover:underline" href={`/companies/${companyId}/reports/revenue-analytics`}>
            Revenue analytics
          </Link>
        </div>
      </TradeTransactionShell>
    </div>
  );
}
