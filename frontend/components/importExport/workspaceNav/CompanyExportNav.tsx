"use client";

import { useEffect, useState, type ComponentType } from "react";

function ExportModuleNavSkeleton() {
  return (
    <nav
      className="mb-4 min-h-[108px] rounded-2xl border border-emerald-100/80 bg-gradient-to-r from-emerald-50 via-cyan-50 to-teal-50 p-3 shadow-sm dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-slate-900 dark:to-cyan-950/20"
      aria-hidden
    >
      <div className="mb-2 flex animate-pulse items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-2.5 w-24 rounded bg-emerald-200/60 dark:bg-emerald-800/50" />
          <div className="h-4 w-36 rounded bg-emerald-100/80 dark:bg-emerald-900/40" />
        </div>
        <div className="h-6 w-20 rounded-full bg-white/60 dark:bg-slate-800/60" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-[4.5rem] shrink-0 animate-pulse rounded-xl bg-white/70 dark:bg-slate-800/50"
          />
        ))}
      </div>
    </nav>
  );
}

type Props = { companyId: string };

export function ExportModuleNav({ companyId }: Props) {
  const [Panel, setPanel] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./CompanyExportNav.links").then((m) => {
      if (!cancelled) setPanel(() => m.ExportModuleNavLinks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Panel) return <ExportModuleNavSkeleton />;
  return <Panel companyId={companyId} />;
}
