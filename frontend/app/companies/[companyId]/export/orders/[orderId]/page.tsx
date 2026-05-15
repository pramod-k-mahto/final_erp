"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { exportCompanyBase } from "@/lib/importExport/paths";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { ExportWorkflowStepper } from "@/components/importExport/ExportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ExportOrderDetailPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const orderId = String(params?.orderId ?? "");
  const url = companyId && orderId ? `${exportCompanyBase(companyId)}/orders/${orderId}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return (
    <div className="p-4 max-w-5xl">
      <ExportModuleNav companyId={companyId} />
      <TradeTransactionShell
        title={`Export order #${orderId}`}
        description="Review order details and jump to shipment or invoice creation."
        toolbar={<ExportWorkflowStepper activeKey="order" />}
      >
      <div className="px-4 pt-4">
        <Link href={`/companies/${companyId}/export/orders`} className="text-xs text-emerald-700 hover:underline">
          ← Orders
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 px-4 text-xs">
        <Link
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          href={`/companies/${companyId}/export/shipments/new?export_order_id=${encodeURIComponent(orderId)}`}
        >
          New shipment
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          href={`/companies/${companyId}/export/invoices/new?export_order_id=${encodeURIComponent(orderId)}`}
        >
          New invoice
        </Link>
      </div>
      {isLoading && <p className="mt-3 px-4 text-sm">Loading…</p>}
      {error && <p className="mt-3 px-4 text-sm text-rose-600">{getApiErrorMessage(error)}</p>}
      {data && (
        <div className="m-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          <TradeEntityDetailView data={data} />
          <button type="button" className="mt-4 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600" onClick={() => mutate()}>
            Refresh
          </button>
        </div>
      )}
      </TradeTransactionShell>
    </div>
  );
}
