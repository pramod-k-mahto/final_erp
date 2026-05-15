"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { useEffect, useState } from "react";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportShipmentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const shipmentId = String(params?.shipmentId ?? "");
  const base = companyId && shipmentId ? `${importCompanyBase(companyId)}/shipments/${shipmentId}` : null;
  const { data, error, isLoading, mutate } = useSWR(base, fetcher);

  const customsUrl = companyId ? withQuery(`${importCompanyBase(companyId)}/customs`, { import_shipment_id: shipmentId, skip: 0, limit: 50 }) : null;
  const expensesUrl = companyId ? withQuery(`${importCompanyBase(companyId)}/expenses`, { import_shipment_id: shipmentId, skip: 0, limit: 50 }) : null;
  const { data: customs } = useSWR(customsUrl, fetcher);
  const { data: expenses } = useSWR(expensesUrl, fetcher);

  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "customs" || tabParam === "expenses" || tabParam === "detail" ? tabParam : "detail";
  const [tab, setTab] = useState<"detail" | "customs" | "expenses">(initialTab);
  useEffect(() => {
    if (tabParam === "customs" || tabParam === "expenses" || tabParam === "detail") {
      setTab(tabParam);
    }
  }, [tabParam]);
  const [gitAmount, setGitAmount] = useState("");
  const [gitDate, setGitDate] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const postGit = async () => {
    setMsg(null);
    setErr(null);
    try {
      await api.post(`${importCompanyBase(companyId)}/shipments/${shipmentId}/post-git-voucher`, {
        amount: Number(gitAmount),
        ...(gitDate ? { voucher_date: gitDate } : {}),
      });
      setMsg("GIT voucher posted.");
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    }
  };

  const customsRows: any[] = Array.isArray(customs) ? customs : customs?.items || customs?.results || [];
  const expenseRows: any[] = Array.isArray(expenses) ? expenses : expenses?.items || expenses?.results || [];

  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<any>({});
  const [saving, setSaving] = useState(false);


  const startEdit = () => {
    setEditValues({
      shipment_no: data?.shipment_no || "",
      vessel_name: data?.vessel_name || "",
      container_no: data?.container_no || "",
      container_size: data?.container_size || "",
      bl_no: data?.bl_no || "",
      bl_date: data?.bl_date || "",
      shipment_date: data?.shipment_date || "",
      arrival_date: data?.arrival_date || "",
      package_count: data?.package_count || 0,
      gross_weight: data?.gross_weight || 0,
      net_weight: data?.net_weight || 0,
      port_of_loading: data?.port_of_loading || "",
      port_of_entry: data?.port_of_entry || "",
      shipping_company: data?.shipping_company || "",
      forwarding_agent: data?.forwarding_agent || "",
    });
    setIsEditing(true);
  };

  const saveEdits = async () => {
    setErr(null);
    setSaving(true);
    try {
      await api.patch(`${importCompanyBase(companyId)}/shipments/${shipmentId}`, editValues);
      setIsEditing(false);
      await mutate();
    } catch (e: unknown) {
      setErr(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1 block w-full rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900";
  const labelCls = "block text-xs font-medium text-slate-500 mb-1";

  return (
    <div className="p-4 max-w-5xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell title={data?.shipment_no ? `Shipment #${data.shipment_no}` : "Loading..."} description="Review shipment, customs, and expenses in one place." toolbar={<ImportWorkflowStepper activeKey="shipment" />}>
      <div className="px-4 pt-4 flex justify-between items-center">
        <Link href={`/companies/${companyId}/import/shipments`} className="text-xs text-indigo-600 hover:underline">
          ← Shipments
        </Link>
        {!isEditing && tab === "detail" && (
          <button onClick={startEdit} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400">
            Edit Shipment
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-2 border-b border-slate-200 pb-2 text-xs dark:border-slate-700">
        {(["detail", "customs", "expenses"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1 font-semibold capitalize ${tab === t ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {isLoading && <p className="mt-2 px-4 text-sm">Loading…</p>}
      {error && <p className="mt-2 px-4 text-sm text-rose-600">{getApiErrorMessage(error)}</p>}

      {tab === "detail" && data && (
        <div className="mt-3 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Shipment No</label>
                    <input className={inputCls} value={editValues.shipment_no} onChange={(e) => setEditValues({ ...editValues, shipment_no: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Vessel Name</label>
                    <input className={inputCls} value={editValues.vessel_name} onChange={(e) => setEditValues({ ...editValues, vessel_name: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Container No</label>
                    <input className={inputCls} value={editValues.container_no} onChange={(e) => setEditValues({ ...editValues, container_no: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>BL No</label>
                    <input className={inputCls} value={editValues.bl_no} onChange={(e) => setEditValues({ ...editValues, bl_no: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>BL Date</label>
                    <input type="date" className={inputCls} value={editValues.bl_date} onChange={(e) => setEditValues({ ...editValues, bl_date: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Arrival Date</label>
                    <input type="date" className={inputCls} value={editValues.arrival_date} onChange={(e) => setEditValues({ ...editValues, arrival_date: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Package Count</label>
                    <input type="number" className={inputCls} value={editValues.package_count} onChange={(e) => setEditValues({ ...editValues, package_count: e.target.value })} />
                  </div>
                  <div>
                    <label className={labelCls}>Gross Weight</label>
                    <input type="number" className={inputCls} value={editValues.gross_weight} onChange={(e) => setEditValues({ ...editValues, gross_weight: e.target.value })} />
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
          </div>
          {!isEditing && (
            <div className="rounded border border-slate-200 p-3 dark:border-slate-700">
              <div className="text-xs font-bold uppercase text-slate-500">Post GIT voucher</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <input className="h-9 rounded border px-2 text-xs" placeholder="Amount" value={gitAmount} onChange={(e) => setGitAmount(e.target.value)} />
                <input type="date" className="h-9 rounded border px-2 text-xs" value={gitDate} onChange={(e) => setGitDate(e.target.value)} />
                <button type="button" onClick={postGit} className="trade-btn trade-btn-import px-3 py-1 text-xs">
                  Post GIT
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {tab === "customs" && (
        <div className="mt-3 text-xs">
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href={`/companies/${companyId}/import/customs/new?import_shipment_id=${encodeURIComponent(shipmentId)}`}
              className="trade-btn trade-btn-import px-3 py-1.5"
            >
              Add customs / Pragyapan
            </Link>
          </div>
          <p className="mb-2 text-slate-500">Rows for this shipment:</p>
          <pre className="max-h-80 overflow-auto rounded border p-2 dark:border-slate-700">{JSON.stringify(customsRows, null, 2)}</pre>
        </div>
      )}

      {tab === "expenses" && (
        <div className="mt-3 text-xs">
          <div className="mb-3 flex flex-wrap gap-2">
            <Link
              href={`/companies/${companyId}/import/expenses/new?import_shipment_id=${encodeURIComponent(shipmentId)}`}
              className="trade-btn trade-btn-import px-3 py-1.5"
            >
              Add import expense
            </Link>
          </div>
          <p className="mb-2 text-slate-500">Expense rows; post voucher from expense detail.</p>
          <ul className="space-y-1">
            {expenseRows.map((ex: any) => (
              <li key={ex.id}>
                <Link className="text-indigo-600 hover:underline" href={`/companies/${companyId}/import/expenses/${ex.id}`}>
                  Expense #{ex.id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <p className="mt-2 text-xs text-emerald-600">{msg}</p>}
      {err && <p className="mt-2 text-xs text-rose-600">{err}</p>}
      </TradeTransactionShell>
    </div>
  );
}
