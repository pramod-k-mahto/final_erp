import { parseSalesPersonIds, formatSalesPersonIdsFromList } from "@/components/sales/SalesPersonMultiSearchSelect";

/** Hydrate inline incentive inputs from GET invoice (tolerant of alternate API shapes) */
export function parseIncentiveAmountsFromInvoicePayload(data: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!data || typeof data !== "object") return out;
  const d = data as Record<string, unknown>;
  const raw =
    d.sales_person_incentive_amounts ??
    d.sales_person_incentive_overrides ??
    d.sales_incentive_amounts ??
    d.incentives;
  if (!Array.isArray(raw)) return out;
  for (const entry of raw as Record<string, unknown>[]) {
    const sid = entry?.sales_person_id ?? entry?.sales_personId;
    const amt = entry?.incentive_amount ?? entry?.amount;
    const isManual = entry?.is_manual ?? entry?.isManual;
    const postMethod = entry?.post_method ?? entry?.postMethod;
    
    if (sid == null || amt == null) continue;
    const n = Number(amt);
    if (!Number.isFinite(n)) continue;
    
    // Only populate if it was specifically a manual override or if it came from stored incentives
    // In fact, always populating ensures the EXACT stored amount is visible in the UI during edit.
    if (isManual === true || postMethod === "Manual Override" || postMethod === "Manual") {
      out[String(sid)] = n.toFixed(2);
    }
  }
  return out;
}

/**
 * Rebuild header comma-separated sales person ids after GET.
 * The API persists a single numeric `sales_person_id` (primary); additional selections
 * are recovered from `sales_person_incentive_amounts` when present, or from optional
 * `sales_person_ids` / CSV string shapes if the backend sends them.
 */
export function headerSalesPersonCsvFromInvoicePayload(inv: Record<string, unknown> | null | undefined): string {
  if (!inv || typeof inv !== "object") return "";
  const ordered: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (raw: string) => {
    const id = raw.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  const rawHeader = inv.sales_person_id;
  if (rawHeader != null && rawHeader !== "") {
    if (typeof rawHeader === "string") {
      for (const id of parseSalesPersonIds(rawHeader)) pushUnique(id);
    } else {
      pushUnique(String(rawHeader));
    }
  }

  const idsField = inv.sales_person_ids;
  if (Array.isArray(idsField)) {
    for (const x of idsField) pushUnique(String(x));
  }

  const rawInc =
    inv.sales_person_incentive_amounts ??
    inv.sales_person_incentive_overrides ??
    inv.sales_incentive_amounts ??
    inv.incentives;
  if (Array.isArray(rawInc)) {
    for (const entry of rawInc as Record<string, unknown>[]) {
      const sid = entry?.sales_person_id ?? entry?.sales_personId;
      if (sid != null) pushUnique(String(sid));
    }
  }

  return ordered.join(",");
}

export function lineSalesPersonCsvFromApi(line: Record<string, unknown> | null | undefined): string {
  if (!line || typeof line !== "object") return "";
  const idsField = line.sales_person_ids;
  if (Array.isArray(idsField) && idsField.length > 0) {
    return formatSalesPersonIdsFromList(idsField.map(String));
  }
  const sp = line.sales_person_id;
  if (sp != null && sp !== "") {
    if (typeof sp === "string") {
      const ids = parseSalesPersonIds(sp);
      if (ids.length > 1) return ids.join(",");
      if (ids.length === 1) return ids[0];
      return "";
    }
    return String(sp);
  }
  return "";
}
