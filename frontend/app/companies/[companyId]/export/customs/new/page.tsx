"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api";
import { exportCompanyBase } from "@/lib/importExport/paths";
import { ExportModuleNav } from "@/components/importExport/workspaceNav/CompanyExportNav";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ExportWorkflowStepper } from "@/components/importExport/ExportWorkflowStepper";
import { TradeFormSection } from "@/components/importExport/TradeFormSection";
import { formatZodIssues, exportCustomsPayloadSchema } from "@/lib/importExport/schemas";

export default function ExportCustomsNewPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const shipmentFromUrl = sp.get("export_shipment_id") || "";

  const [exportShipmentId, setExportShipmentId] = useState(shipmentFromUrl);
  const [declarationNo, setDeclarationNo] = useState("");
  const [customsOffice, setCustomsOffice] = useState("");
  const [clearanceDate, setClearanceDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      export_shipment_id: Number(exportShipmentId),
      declaration_no: declarationNo.trim() || null,
      customs_office: customsOffice.trim() || null,
      clearance_date: clearanceDate.trim() || null,
      remarks: remarks.trim() || null,
    };
    const parsed = exportCustomsPayloadSchema.safeParse(draft);
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
      const res = await api.post(`${exportCompanyBase(companyId)}/customs`, body);
      const id = res.data?.id;
      if (id) router.replace(`/companies/${companyId}/export/customs/${id}`);
      else router.replace(`/companies/${companyId}/export/customs`);
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <ExportModuleNav companyId={companyId} />
      <TradeTransactionShell title="New export customs" description="Link to the export shipment clearance record." toolbar={<ExportWorkflowStepper activeKey="customs" />}>
        <form onSubmit={onSubmit} className="space-y-4 p-4">
          <TradeFormSection variant="export" title="Customs Declaration" subtitle="Map shipment to declaration, office, and clearance date.">
            <div className="grid max-w-lg gap-3">
              <label className="text-xs font-semibold">
                Export shipment ID *
                <input
                  required
                  className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={exportShipmentId}
                  onChange={(e) => setExportShipmentId(e.target.value)}
                />
              </label>
              <Link href={`/companies/${companyId}/export/shipments`} className="text-xs text-emerald-700 hover:underline">
                Open shipments list
              </Link>
              <label className="text-xs font-semibold">
                Declaration no
                <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={declarationNo} onChange={(e) => setDeclarationNo(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                Customs office
                <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={customsOffice} onChange={(e) => setCustomsOffice(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                Clearance date
                <input type="date" className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={clearanceDate} onChange={(e) => setClearanceDate(e.target.value)} />
              </label>
              <label className="text-xs font-semibold">
                Remarks
                <textarea className="mt-1 min-h-[56px] w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
              </label>
            </div>
          </TradeFormSection>
          {err && <div className="text-xs text-rose-600">{err}</div>}
          <div className="sticky bottom-2 z-10 rounded-xl border border-emerald-100 bg-white/95 p-2 backdrop-blur dark:border-emerald-900/40 dark:bg-slate-950/95">
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Saving…" : "Create"}
            </button>
          </div>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
