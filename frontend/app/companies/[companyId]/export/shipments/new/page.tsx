"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { exportCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ExportWorkflowStepper } from "@/components/importExport/ExportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import { formatZodIssues, exportShipmentPayloadSchema } from "@/lib/importExport/schemas";
import { normalizeListResponse } from "@/lib/importExport/tradeApi";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ExportShipmentNewPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const orderFromUrl = sp.get("export_order_id") || "";

  const ordersUrl = companyId ? withQuery(`${exportCompanyBase(companyId)}/orders`, { skip: 0, limit: 200 }) : null;
  const { data: orderList } = useSWR(ordersUrl, fetcher);
  const orderRows = useMemo(() => normalizeListResponse<{ id: number; order_no?: string }>(orderList), [orderList]);
  const orderOptions = useMemo(
    () => orderRows.map((o) => ({ value: String(o.id), label: o.order_no ? `${o.order_no} (#${o.id})` : `Order #${o.id}` })),
    [orderRows]
  );

  const [exportOrderId, setExportOrderId] = useState(orderFromUrl);
  const [blNo, setBlNo] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [portOfLoading, setPortOfLoading] = useState("");
  const [portOfDischarge, setPortOfDischarge] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      export_order_id: Number(exportOrderId),
      bl_no: blNo.trim() || null,
      vessel_name: vesselName.trim() || null,
      shipment_date: shipmentDate.trim() || null,
      port_of_loading: portOfLoading.trim() || null,
      port_of_discharge: portOfDischarge.trim() || null,
      container_no: containerNo.trim() || null,
      remarks: remarks.trim() || null,
    };
    const parsed = exportShipmentPayloadSchema.safeParse(draft);
    if (!parsed.success) {
      setErr(formatZodIssues(parsed.error));
      return;
    }
    const body: Record<string, unknown> = { ...parsed.data };
    Object.keys(body).forEach((k) => {
      if (body[k] === null || body[k] === undefined) delete body[k];
    });
    setSaving(true);
    try {
      const res = await api.post(`${exportCompanyBase(companyId)}/shipments`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/export/shipments/${id}`);
      else router.replace(`/companies/${companyId}/export/shipments`);
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <ExportModuleNav companyId={companyId} />
      <TradeTransactionShell title="New export shipment" description="Link to an export order, then record BL and routing." toolbar={<ExportWorkflowStepper activeKey="shipment" />}>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection variant="export" title="Shipment Header" subtitle="Choose export order and BL basics.">
            <label className="text-xs font-semibold sm:col-span-2 text-slate-700 dark:text-slate-200">
              Export order *
              <SearchableSelect options={orderOptions} value={exportOrderId} onChange={setExportOrderId} placeholder="Select order" triggerClassName="mt-1 h-10" />
            </label>
          </TradeFormSection>
          <TradeFormSection variant="export" title="Routing & Vessel" subtitle="Capture vessel, ports, container, and dates.">
          <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">
            BL no
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={blNo} onChange={(e) => setBlNo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Vessel name
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Shipment date
            <input type="date" className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Container no
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={containerNo} onChange={(e) => setContainerNo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Port of loading
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Port of discharge
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={portOfDischarge} onChange={(e) => setPortOfDischarge(e.target.value)} />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Remarks
            <textarea className="mt-1 min-h-[56px] w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
          </label>
          </div>
          </TradeFormSection>
          {err && <div className="text-xs text-rose-600">{err}</div>}
          <div className="sticky bottom-2 z-10 rounded-xl border border-emerald-100 bg-white/95 p-2 backdrop-blur dark:border-emerald-900/40 dark:bg-slate-950/95">
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Create shipment"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
