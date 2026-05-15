import useSWR from 'swr';
import * as apiV1 from '@/lib/apiV1';
import { api } from '@/lib/api';

/**
 * Custom hook to cleanly separate Sales Invoice data fetching from the UI components.
 * This utilizes the new V1 Enterprise Architecture.
 */
export function useSalesInvoices(companyId: string | number | undefined) {
  const { data, error, mutate, isLoading } = useSWR(
    companyId ? `/api/v1/sales/invoices?company_id=${companyId}` : null,
    () => apiV1.listSalesInvoices(Number(companyId))
  );

  const createInvoice = async (payload: any) => {
    if (!companyId) throw new Error("Company ID is required");
    const newInvoice = await apiV1.createSalesInvoice(Number(companyId), payload);
    // Optimistic UI update or trigger re-fetch
    mutate();
    return newInvoice;
  };

  const deleteInvoice = async (invoiceId: number | string) => {
    if (!companyId) return;
    // Note: Assuming a delete endpoint exists in the future, fallback to legacy for now
    await api.delete(`/api/v1/sales/invoices/${invoiceId}?company_id=${companyId}`);
    mutate();
  };

  return {
    invoices: data || [],
    isLoading,
    isError: error,
    mutate,
    createInvoice,
    deleteInvoice
  };
}
