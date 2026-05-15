"use client";

import * as React from "react";

type TradeFormSectionProps = {
  title: string;
  subtitle?: string;
  variant?: "import" | "export";
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function TradeFormSection({ title, subtitle, variant = "import", children, actions }: TradeFormSectionProps) {
  const isImport = variant === "import";
  const titleColor = isImport
    ? "text-indigo-700 dark:text-indigo-300"
    : "text-emerald-700 dark:text-emerald-300";
  const wrapTone = isImport
    ? "border-indigo-100/80 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20"
    : "border-emerald-100/80 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20";

  return (
    <section className={`trade-scope trade-shell-card rounded-2xl border p-3 sm:p-4 ${wrapTone}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className={`text-sm font-bold tracking-tight ${titleColor}`}>{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
