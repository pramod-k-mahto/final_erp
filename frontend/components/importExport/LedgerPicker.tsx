"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { LedgerOption } from "@/types/importExport";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

type Props = {
  companyId: string;
  label: string;
  value: number | "" | null | undefined;
  onChange: (id: number | null) => void;
  disabled?: boolean;
};

export function LedgerPicker({ companyId, label, value, onChange, disabled }: Props) {
  const { data, isLoading } = useSWR<LedgerOption[]>(
    companyId ? `/api/v1/accounting/ledgers?company_id=${encodeURIComponent(companyId)}` : null,
    fetcher
  );

  const baseOptions = useMemo(
    () =>
      (data || []).map((l) => ({
        value: String(l.id),
        label: l.name,
        sublabel: `Ledger #${l.id}`,
      })),
    [data]
  );

  const options = useMemo(() => {
    const v = value === null || value === undefined || value === "" ? null : Number(value);
    if (v == null || !Number.isFinite(v)) return baseOptions;
    const key = String(v);
    if (baseOptions.some((o) => o.value === key)) return baseOptions;
    return [{ value: key, label: `Ledger #${v}`, sublabel: "Not in loaded list" }, ...baseOptions];
  }, [baseOptions, value]);

  const strValue = value === null || value === undefined || value === "" ? "" : String(value);

  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-slate-600 dark:text-slate-300">{label}</span>
      <SearchableSelect
        options={options}
        pinnedOptions={[{ value: "", label: isLoading ? "Loading…" : "— None —" }]}
        value={strValue}
        onChange={(v) => onChange(v ? Number(v) : null)}
        placeholder={isLoading ? "Loading ledgers…" : "Search or select ledger…"}
        searchInputPlaceholder="Search by name or ID…"
        disabled={disabled || isLoading}
        triggerClassName="h-10 py-0"
      />
    </label>
  );
}
