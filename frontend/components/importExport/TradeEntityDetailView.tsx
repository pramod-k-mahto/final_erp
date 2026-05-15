"use client";

import * as React from "react";

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "—";
    return Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(v);
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t.length > 160 ? `${t.slice(0, 157)}…` : t || "—";
  }
  return String(v);
}

const LINE_KEYS = ["lines", "line_items", "items", "allocation_lines", "results", "rows"] as const;
type LineKey = (typeof LINE_KEYS)[number];

function isLineKey(k: string): k is LineKey {
  return (LINE_KEYS as readonly string[]).includes(k);
}

function pickLineArray(data: Record<string, unknown>): { key: string; rows: Record<string, unknown>[] } | null {
  for (const k of LINE_KEYS) {
    const v = data[k];
    if (Array.isArray(v) && v.length > 0 && v.every(isPlainRecord)) {
      return { key: k, rows: v as Record<string, unknown>[] };
    }
  }
  return null;
}

export function TradeEntityDetailView({
  data,
  className = "",
  depth = 0,
}: {
  data: unknown;
  className?: string;
  /** Prevent runaway layout on deeply nested API objects */
  depth?: number;
}) {
  if (!isPlainRecord(data)) {
    return <p className="text-xs text-slate-500">No detail payload.</p>;
  }

  if (depth > 2) {
    return (
      <pre className="max-h-48 overflow-auto rounded border border-slate-100 p-2 text-[10px] dark:border-slate-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  const lineBlock = pickLineArray(data);
  const lineKeys = lineBlock
    ? Array.from(new Set(lineBlock.rows.flatMap((r) => Object.keys(r)))).filter((k) => !k.startsWith("_")).slice(0, 14)
    : [];

  const summaryKeys = Object.keys(data)
    .filter((k) => !isLineKey(k))
    .filter((k) => {
      const v = data[k];
      if (Array.isArray(v)) return false;
      if (isPlainRecord(v)) return false;
      return true;
    })
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid gap-2 sm:grid-cols-2">
        {summaryKeys.map((key) => (
          <div
            key={key}
            className="flex flex-col rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 px-3 py-2 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-900/70"
          >
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{key.replace(/_/g, " ")}</span>
            <span className="font-mono text-xs text-slate-900 dark:text-slate-100">{formatScalar(data[key])}</span>
          </div>
        ))}
      </div>

      {lineBlock && lineKeys.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{lineBlock.key.replace(/_/g, " ")}</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm dark:border-slate-700">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead className="bg-slate-100/90 dark:bg-slate-900">
                <tr>
                  {lineKeys.map((k) => (
                    <th key={k} className="whitespace-nowrap px-2 py-1.5 font-semibold text-slate-600 dark:text-slate-300">
                      {k.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineBlock.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-slate-100 dark:border-slate-800">
                    {lineKeys.map((k) => (
                      <td key={k} className="px-2 py-1.5 font-mono text-slate-800 dark:text-slate-200">
                        {formatScalar(row[k])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {Object.keys(data).some((k) => isPlainRecord(data[k])) ? (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Nested objects</h3>
          {Object.entries(data).map(([k, v]) => {
            if (!isPlainRecord(v)) return null;
            return (
              <details key={k} className="rounded-xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-900/40">
                <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300">{k}</summary>
                <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                  <TradeEntityDetailView data={v} depth={depth + 1} />
                </div>
              </details>
            );
          })}
        </div>
      ) : null}

      <details className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
        <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Raw JSON</summary>
        <pre className="max-h-64 overflow-auto border-t border-slate-100 p-2 text-[10px] leading-relaxed dark:border-slate-800">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}
