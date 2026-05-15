"use client";

import * as React from "react";

type TradeTransactionShellProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
  /** Optional toolbar row (actions) above the card body */
  toolbar?: React.ReactNode;
};

export function TradeTransactionShell({ title, description, toolbar, children }: TradeTransactionShellProps) {
  return (
    <div className="trade-scope mx-auto max-w-5xl space-y-3">
      <div className="trade-shell-card rounded-2xl border border-slate-200/80 bg-gradient-to-r from-white via-slate-50 to-indigo-50 px-4 py-3 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950/30">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
            {description ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <span className="trade-chip">
            Trade Flow
          </span>
        </div>
      </div>
      {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      <div className="trade-shell-card rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_-22px_rgba(15,23,42,0.6)] dark:border-slate-700 dark:bg-slate-950">
        {children}
      </div>
    </div>
  );
}
