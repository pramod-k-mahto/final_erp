"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = (companyId: string) =>
  [
    { href: `/companies/${companyId}/export/orders`, label: "Orders" },
    { href: `/companies/${companyId}/export/shipments`, label: "Shipments" },
    { href: `/companies/${companyId}/export/customs`, label: "Customs" },
    { href: `/companies/${companyId}/export/invoices`, label: "Invoices" },
    { href: `/companies/${companyId}/export/reports`, label: "Reports" },
  ] as const;

export function ExportModuleNavLinks({ companyId }: { companyId: string }) {
  const pathname = usePathname() ?? "";

  return (
    <nav className="mb-4 rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50 via-cyan-50 to-teal-50 p-3 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-cyan-950/20">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-500/90 dark:text-emerald-300/90">
            Trade Workspace
          </p>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Export Operations</h2>
        </div>
        <div className="rounded-full border border-emerald-200/80 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-slate-900/70 dark:text-emerald-300">
          Smart Dispatch
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
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_6px_16px_rgba(5,150,105,0.35)]"
                  : "border border-white/70 bg-white/75 text-slate-700 hover:-translate-y-0.5 hover:border-emerald-200 hover:text-emerald-700 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:text-emerald-300"
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
