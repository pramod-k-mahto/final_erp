"use client";

import * as React from "react";

type TradeListShellProps = {
  title: string;
  description?: string;
  badge?: string;
  variant?: "import" | "export";
  actions?: React.ReactNode;
  helperText?: React.ReactNode;
  children: React.ReactNode;
};

export function TradeListShell({
  title,
  description,
  badge,
  variant = "import",
  actions,
  helperText,
  children,
}: TradeListShellProps) {
  const isImport = variant === "import";
  const tone = isImport
    ? {
        wrap: "border-indigo-100/80 from-indigo-50 via-violet-50 to-fuchsia-50 dark:border-indigo-900/40 dark:from-indigo-950/25 dark:via-slate-950 dark:to-violet-950/20",
        badge: "border-indigo-200 bg-white/80 text-indigo-700 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300",
      }
    : {
        wrap: "border-emerald-100/80 from-emerald-50 via-cyan-50 to-teal-50 dark:border-emerald-900/40 dark:from-emerald-950/25 dark:via-slate-950 dark:to-cyan-950/20",
        badge: "border-emerald-200 bg-white/80 text-emerald-700 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-300",
      };

  return (
    <section className={`trade-scope trade-shell-card rounded-2xl border bg-gradient-to-r p-4 shadow-sm ${tone.wrap}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {description ? <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {badge ? <span className={`trade-chip ${tone.badge}`}>{badge}</span> : null}
          {actions}
        </div>
      </div>
      {helperText ? (
        <div className="mb-3 rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
          {helperText}
        </div>
      ) : null}
      <div className="trade-shell-card overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_10px_35px_-25px_rgba(15,23,42,0.7)] dark:border-slate-700 dark:bg-slate-950">
        {children}
      </div>
    </section>
  );
}
