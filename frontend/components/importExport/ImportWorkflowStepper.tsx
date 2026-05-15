"use client";

import * as React from "react";

const STEPS = [
  { key: "po", label: "PO" },
  { key: "lc", label: "LC" },
  { key: "shipment", label: "Shipment" },
  { key: "customs", label: "Customs" },
  { key: "expense", label: "Expenses" },
  { key: "landed", label: "Landed cost" },
  { key: "receipt", label: "Receipt" },
] as const;

export type ImportWorkflowStepKey = (typeof STEPS)[number]["key"];

export function ImportWorkflowStepper({ activeKey }: { activeKey: ImportWorkflowStepKey }) {
  const idx = STEPS.findIndex((s) => s.key === activeKey);
  return (
    <nav aria-label="Import workflow" className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-slate-700 dark:bg-slate-900/50">
      <ol className="flex flex-wrap items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {STEPS.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.key} className="flex items-center gap-1">
              {i > 0 ? <span className="px-0.5 text-slate-300 dark:text-slate-600">→</span> : null}
              <span
                className={[
                  "rounded-md px-2 py-1",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : done
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
                      : "bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600",
                ].join(" ")}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
