/** API paths under `/api/v1` (axios baseURL is host root). */

export function importCompanyBase(companyId: string | number) {
  return `/api/v1/imports/companies/${companyId}`;
}

export function exportCompanyBase(companyId: string | number) {
  return `/api/v1/exports/companies/${companyId}`;
}

export function withQuery(path: string, params?: Record<string, string | number | undefined | null>) {
  if (!params) return path;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    sp.set(k, String(v));
  }
  const q = sp.toString();
  return q ? `${path}?${q}` : path;
}
