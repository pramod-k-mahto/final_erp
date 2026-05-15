"use client";

import { useEffect, useState, type ComponentType } from "react";

function ImportModuleNavSkeleton() {
  return (
    <nav
      className="mb-4 min-h-[108px] rounded-2xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 p-3 shadow-sm dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-violet-950/20"
      aria-hidden
    >
      <div className="mb-2 flex animate-pulse items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-2.5 w-24 rounded bg-indigo-200/60 dark:bg-indigo-800/50" />
          <div className="h-4 w-36 rounded bg-indigo-100/80 dark:bg-indigo-900/40" />
        </div>
        <div className="h-6 w-20 rounded-full bg-white/60 dark:bg-slate-800/60" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
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

/**
 * Import trade sub-nav. Rename to ImportTradeNav to break any legacy browser cache
 * for the old 'ImportModuleNav' component name.
 */
export function ImportTradeNav({ companyId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [Panel, setPanel] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    // Dynamic import to ensure the links chunk has a fresh hash/id
    void import("./CompanyImportNav.links").then((m) => {
      if (!cancelled) setPanel(() => m.ImportModuleNavLinks);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Strict check: server and first client frame MUST render the same skeleton.
  if (!mounted || !Panel) return <ImportModuleNavSkeleton />;
  return <Panel companyId={companyId} />;
}
