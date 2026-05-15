"use client";

import { FormEvent, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase, withQuery } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import { formatZodIssues, importShipmentPayloadSchema } from "@/lib/importExport/schemas";
import { normalizeListResponse } from "@/lib/importExport/tradeApi";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportShipmentNewPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const poFromUrl = sp.get("import_purchase_order_id") || "";

  const poUrl = companyId ? withQuery(`${importCompanyBase(companyId)}/purchase-orders`, { skip: 0, limit: 200 }) : null;
  const { data: poList } = useSWR(poUrl, fetcher);
  const poRows = useMemo(() => normalizeListResponse<{ id: string; po_no?: string }>(poList), [poList]);
  const poOptions = useMemo(
    () => poRows.map((p) => ({ value: p.id, label: p.po_no ? `${p.po_no} (${p.id.slice(0, 8)}…)` : `PO ${p.id.slice(0, 8)}…` })),
    [poRows]
  );

  const [importPoId, setImportPoId] = useState(poFromUrl);
  const [shipmentNo, setShipmentNo] = useState("");
  const [containerNo, setContainerNo] = useState("");
  const [containerSize, setContainerSize] = useState("");
  const [vesselName, setVesselName] = useState("");
  const [blNo, setBlNo] = useState("");
  const [blDate, setBlDate] = useState("");
  const [airwayBillNo, setAirwayBillNo] = useState("");
  const [shipmentDate, setShipmentDate] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [packageCount, setPackageCount] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [netWeight, setNetWeight] = useState("");
  const [shippingCompany, setShippingCompany] = useState("");
  const [forwardingAgent, setForwardingAgent] = useState("");
  const [portOfLoading, setPortOfLoading] = useState("");
  const [portOfEntry, setPortOfEntry] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      import_purchase_order_id: importPoId || null,
      shipment_no: shipmentNo,
      container_no: containerNo.trim() || null,
      container_size: containerSize.trim() || null,
      vessel_name: vesselName.trim() || null,
      bl_no: blNo.trim() || null,
      bl_date: blDate.trim() || null,
      airway_bill_no: airwayBillNo.trim() || null,
      shipment_date: shipmentDate.trim() || null,
      arrival_date: arrivalDate.trim() || null,
      package_count: packageCount,
      gross_weight: grossWeight,
      net_weight: netWeight,
      shipping_company: shippingCompany.trim() || null,
      forwarding_agent: forwardingAgent.trim() || null,
      port_of_loading: portOfLoading.trim() || null,
      port_of_entry: portOfEntry.trim() || null,
    };
    const parsed = importShipmentPayloadSchema.safeParse(draft);
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
      const res = await api.post(`${importCompanyBase(companyId)}/shipments`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/import/shipments/${id}`);
      else router.replace(`/companies/${companyId}/import/shipments`);
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  const field =
    "block text-xs font-semibold text-slate-700 dark:text-slate-200 [&_input]:mt-1 [&_input]:h-9 [&_input]:w-full [&_input]:rounded-md [&_input]:border [&_input]:border-slate-200 [&_input]:px-2 [&_input]:text-sm [&_input]:dark:border-slate-700 [&_input]:dark:bg-slate-900";

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title="New import shipment"
        description="Capture BL, vessel, and routing. Duplicate BL / Pragyapan numbers are rejected by the server—fix and retry using the error message."
        toolbar={<ImportWorkflowStepper activeKey="shipment" />}
      >
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection variant="import" title="Shipment Header" subtitle="Link PO and provide shipment identifiers.">
            <label className="text-xs font-semibold sm:col-span-2">
              Import PO (optional)
              <SearchableSelect
                options={poOptions}
                value={importPoId}
                onChange={setImportPoId}
                placeholder="None"
                triggerClassName="mt-1 h-10"
              />
            </label>
          </TradeFormSection>
          <TradeFormSection variant="import" title="Transport and Routing" subtitle="Provide vessel, BL, dates, weight, and ports.">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className={field}>
              Shipment no
              <input value={shipmentNo} onChange={(e) => setShipmentNo(e.target.value)} />
            </label>
            <label className={field}>
              Container no
              <input value={containerNo} onChange={(e) => setContainerNo(e.target.value)} />
            </label>
            <label className={field}>
              Container size
              <input value={containerSize} onChange={(e) => setContainerSize(e.target.value)} placeholder="e.g. 40HC" />
            </label>
            <label className={field}>
              Vessel name
              <input value={vesselName} onChange={(e) => setVesselName(e.target.value)} />
            </label>
            <label className={field}>
              BL no
              <input value={blNo} onChange={(e) => setBlNo(e.target.value)} />
            </label>
            <label className={field}>
              BL date
              <input type="date" value={blDate} onChange={(e) => setBlDate(e.target.value)} />
            </label>
            <label className={field}>
              Airway bill no
              <input value={airwayBillNo} onChange={(e) => setAirwayBillNo(e.target.value)} />
            </label>
            <label className={field}>
              Shipment date
              <input type="date" value={shipmentDate} onChange={(e) => setShipmentDate(e.target.value)} />
            </label>
            <label className={field}>
              Arrival date
              <input type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} />
            </label>
            <label className={field}>
              Package count
              <input inputMode="numeric" value={packageCount} onChange={(e) => setPackageCount(e.target.value)} />
            </label>
            <label className={field}>
              Gross weight
              <input inputMode="decimal" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)} />
            </label>
            <label className={field}>
              Net weight
              <input inputMode="decimal" value={netWeight} onChange={(e) => setNetWeight(e.target.value)} />
            </label>
            <label className={field}>
              Shipping company
              <input value={shippingCompany} onChange={(e) => setShippingCompany(e.target.value)} />
            </label>
            <label className={field}>
              Forwarding agent
              <input value={forwardingAgent} onChange={(e) => setForwardingAgent(e.target.value)} />
            </label>
            <label className={field}>
              Port of loading
              <input value={portOfLoading} onChange={(e) => setPortOfLoading(e.target.value)} />
            </label>
            <label className={field}>
              Port of entry
              <input value={portOfEntry} onChange={(e) => setPortOfEntry(e.target.value)} />
            </label>
          </div>
          </TradeFormSection>
          {err ? <div className="text-xs text-rose-600">{err}</div> : null}
          <div className="sticky bottom-2 z-10 rounded-xl border border-indigo-100 bg-white/95 p-2 backdrop-blur dark:border-indigo-900/40 dark:bg-slate-950/95">
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Create shipment"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
