"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const REPORTS = [
  {
    title: "Import PO register",
    desc: "List and filter import purchase orders (use PO list with export when available).",
    href: (cid: string) => `/companies/${cid}/import/po`,
    ready: true,
  },
  {
    title: "Shipment tracking",
    desc: "Track BL, vessel, and dates from the shipment list and detail screens.",
    href: (cid: string) => `/companies/${cid}/import/shipments`,
    ready: true,
  },
  {
    title: "Goods in transit",
    desc: "GIT postings and in-transit stock flow via receipts and accounting profile.",
    href: (cid: string) => `/companies/${cid}/import/receipts`,
    ready: true,
  },
  {
    title: "Customs & expense register",
    desc: "Customs and expense lines are created per shipment; use shipment detail tabs.",
    href: (cid: string) => `/companies/${cid}/import/shipments`,
    ready: true,
  },
  {
    title: "Landed cost runs",
    desc: "Compute and review allocation by quantity or item value.",
    href: (cid: string) => `/companies/${cid}/import/landed-costs`,
    ready: true,
  },
  {
    title: "Forex gain / loss",
    desc: "Requires dedicated API report—wire here when backend exposes the endpoint.",
    href: null,
    ready: false,
  },
] as const;

export default function ImportReportsHubPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell title="Import reports" description="Operational views today; dedicated analytics endpoints can be plugged in as the API grows.">
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
                  className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-center text-xs font-semibold text-white hover:bg-indigo-700"
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
          Company financial reports (trial balance, P&amp;L) remain under{" "}
          <Link className="text-indigo-600 hover:underline" href={`/companies/${companyId}/reports`}>
            Reports
          </Link>
          .
        </div>
      </TradeTransactionShell>
    </div>
  );
}
