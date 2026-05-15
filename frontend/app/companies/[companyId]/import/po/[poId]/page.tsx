"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { useState } from "react";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportPODetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = String(params?.companyId ?? "");
  const poId = String(params?.poId ?? "");
  const url = companyId && poId ? `${importCompanyBase(companyId)}/purchase-orders/${poId}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);
  const [delErr, setDelErr] = useState<string | null>(null);

  const onDelete = async () => {
    if (!confirm("Soft-delete this import PO?")) return;
    setDelErr(null);
    try {
      await api.delete(`${importCompanyBase(companyId)}/purchase-orders/${poId}`);
      router.push(`/companies/${companyId}/import/po`);
    } catch (e: unknown) {
      setDelErr(getApiErrorMessage(e));
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditValues({
      po_no: data?.po_no || "",
      currency_code: data?.currency_code || "",
      exchange_rate: data?.exchange_rate || 1,
      incoterm: data?.incoterm || "",
      country_of_origin: data?.country_of_origin || "",
      expected_arrival_date: data?.expected_arrival_date || "",
      remarks: data?.remarks || "",
      status: data?.status || "DRAFT",
    });
    setIsEditing(true);
  };

  const saveEdits = async () => {
    setDelErr(null);
    setSaving(true);
    try {
      await api.patch(`${importCompanyBase(companyId)}/purchase-orders/${poId}`, editValues);
      setIsEditing(false);
      await mutate();
    } catch (e: unknown) {
      setDelErr(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";
  const labelCls = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <div className="p-4 max-w-5xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title={data?.po_no ? `Import PO #${data.po_no}` : "Loading..."}
        description="Inspect PO details and continue through import workflow actions."
        toolbar={<ImportWorkflowStepper activeKey="po" />}
      >
      <div className="mb-3 flex flex-wrap items-center justify-between p-4 pb-0">
        <Link href={`/companies/${companyId}/import/po`} className="text-xs text-indigo-600 hover:underline">
          ← All POs
        </Link>
        {!isEditing && (
          <button onClick={startEdit} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
            Edit PO
          </button>
        )}
      </div>
      <div className="mt-1 flex flex-wrap gap-2 px-4 text-xs">
        <Link
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          href={`/companies/${companyId}/import/lc/new`}
        >
          New LC
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          href={`/companies/${companyId}/import/shipments/new?import_purchase_order_id=${encodeURIComponent(poId)}`}
        >
          New shipment
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          href={`/companies/${companyId}/import/landed-costs?import_purchase_order_id=${encodeURIComponent(poId)}`}
        >
          Landed costs
        </Link>
        <Link
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          href={`/companies/${companyId}/import/receipts/new?import_purchase_order_id=${encodeURIComponent(poId)}`}
        >
          New receipt
        </Link>
      </div>
      {isLoading && <p className="mt-3 px-4 text-sm text-slate-500">Loading…</p>}
      {error && <p className="mt-3 px-4 text-sm text-rose-600">{getApiErrorMessage(error)}</p>}
      {data && (
        <div className="m-4 mt-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>PO Number</label>
                  <input className={inputCls} value={editValues.po_no} onChange={(e) => setEditValues({ ...editValues, po_no: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Currency</label>
                  <input className={inputCls} value={editValues.currency_code} onChange={(e) => setEditValues({ ...editValues, currency_code: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Exchange Rate</label>
                  <input type="number" className={inputCls} value={editValues.exchange_rate} onChange={(e) => setEditValues({ ...editValues, exchange_rate: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Arrival Date</label>
                  <input type="date" className={inputCls} value={editValues.expected_arrival_date} onChange={(e) => setEditValues({ ...editValues, expected_arrival_date: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelCls}>Remarks</label>
                  <textarea className={inputCls} rows={2} value={editValues.remarks} onChange={(e) => setEditValues({ ...editValues, remarks: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button onClick={saveEdits} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={() => setIsEditing(false)} disabled={saving} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold dark:border-slate-600 disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <TradeEntityDetailView data={data} />
          )}
          {!isEditing && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button type="button" onClick={() => mutate()} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-slate-600">
                Refresh
              </button>
              <button type="button" onClick={onDelete} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white">
                Delete
              </button>
            </div>
          )}
          {delErr && <p className="mt-2 text-xs text-rose-600">{delErr}</p>}
        </div>
      )}

      </TradeTransactionShell>
    </div>
  );
}
