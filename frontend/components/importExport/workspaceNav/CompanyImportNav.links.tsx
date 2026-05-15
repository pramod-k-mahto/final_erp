"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = (companyId: string) =>
  [
    { href: `/companies/${companyId}/import/settings`, label: "Settings" },
    { href: `/companies/${companyId}/import/po`, label: "PO" },
    { href: `/companies/${companyId}/import/lc`, label: "LC" },
    { href: `/companies/${companyId}/import/shipments`, label: "Shipments" },
    { href: `/companies/${companyId}/import/expenses`, label: "Expenses" },
    { href: `/companies/${companyId}/import/landed-costs`, label: "Landed costs" },

    { href: `/companies/${companyId}/import/receipts`, label: "Receipts" },
    { href: `/companies/${companyId}/import/reports`, label: "Reports" },
  ] as const;

/** Client-only (loaded after mount) — uses pathname for active tab. */
export function ImportModuleNavLinks({ companyId }: { companyId: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="mb-4 rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 p-3 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-500/90 dark:text-indigo-300/90">
            Trade Workspace
          </p>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Import Operations</h2>
        </div>
        <div className="rounded-full border border-indigo-200/80 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-indigo-600 dark:border-indigo-800 dark:bg-slate-900/70 dark:text-indigo-300">
          Clean Workflow
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {links(companyId).map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-[0_6px_16px_rgba(79,70,229,0.35)]"
                  : "border border-white/70 bg-white/75 text-slate-700 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
