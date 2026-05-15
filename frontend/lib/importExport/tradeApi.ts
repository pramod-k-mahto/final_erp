import { api } from "@/lib/api";
import { exportCompanyBase, importCompanyBase, withQuery } from "./paths";

export function normalizeListResponse<T = unknown>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const o = data as Record<string, unknown> | null | undefined;
  if (!o) return [];
  const items = o.items ?? o.results ?? o.data;
  return Array.isArray(items) ? (items as T[]) : [];
}

export async function listImportPurchaseOrders(companyId: string, params: { skip?: number; limit?: number } = {}) {
  const url = withQuery(`${importCompanyBase(companyId)}/purchase-orders`, {
    skip: params.skip ?? 0,
    limit: params.limit ?? 50,
  });
  const { data } = await api.get(url);
  return data;
}

export async function listImportShipments(
  companyId: string,
  params: { skip?: number; limit?: number; import_purchase_order_id?: string | number } = {}
) {
  const url = withQuery(`${importCompanyBase(companyId)}/shipments`, {
    skip: params.skip ?? 0,
    limit: params.limit ?? 50,
    ...(params.import_purchase_order_id != null && params.import_purchase_order_id !== ""
      ? { import_purchase_order_id: params.import_purchase_order_id }
      : {}),
  });
  const { data } = await api.get(url);
  return data;
}

export async function createImportShipment(companyId: string, payload: Record<string, unknown>) {
  const { data } = await api.post(`${importCompanyBase(companyId)}/shipments`, payload);
  return data;
}

export async function createImportLc(companyId: string, payload: Record<string, unknown>) {
  const { data } = await api.post(`${importCompanyBase(companyId)}/lc`, payload);
  return data;
}

export async function createImportCustoms(companyId: string, payload: Record<string, unknown>) {
  const { data } = await api.post(`${importCompanyBase(companyId)}/customs`, payload);
  return data;
}

export async function listExportOrders(companyId: string, params: { skip?: number; limit?: number } = {}) {
  const url = withQuery(`${exportCompanyBase(companyId)}/orders`, {
    skip: params.skip ?? 0,
    limit: params.limit ?? 50,
  });
  const { data } = await api.get(url);
  return data;
}
