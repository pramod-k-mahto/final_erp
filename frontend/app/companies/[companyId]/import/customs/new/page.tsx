"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { formatZodIssues, importCustomsPayloadSchema } from "@/lib/importExport/schemas";

export default function ImportCustomsNewPage() {
  const params = useParams();
  const router = useRouter();
  const sp = useSearchParams();
  const companyId = String(params?.companyId ?? "");
  const shipmentId = sp.get("import_shipment_id") || "";

  const [importShipmentId, setImportShipmentId] = useState(shipmentId);
  const [pragyapanNo, setPragyapanNo] = useState("");
  const [pragyapanDate, setPragyapanDate] = useState("");
  const [customsOffice, setCustomsOffice] = useState("");
  const [customsRef, setCustomsRef] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [customsValuation, setCustomsValuation] = useState("");
  const [customsDuty, setCustomsDuty] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [exciseAmount, setExciseAmount] = useState("");
  const [advanceTax, setAdvanceTax] = useState("");
  const [customsRate, setCustomsRate] = useState("");
  const [agentName, setAgentName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const n = (s: string) => (s.trim() === "" ? null : Number(s));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const draft = {
      import_shipment_id: importShipmentId,
      pragyapan_patra_no: pragyapanNo.trim(),
      pragyapan_date: pragyapanDate.trim(),
      customs_office: customsOffice.trim() || null,
      customs_reference_no: customsRef.trim() || null,
      hs_code: hsCode.trim() || null,
      customs_valuation: customsValuation,
      customs_duty: customsDuty,
      vat_amount: vatAmount,
      excise_amount: exciseAmount,
      advance_tax: advanceTax,
      customs_rate: customsRate,
      agent_name: agentName.trim() || null,
    };

    const parsed = importCustomsPayloadSchema.safeParse(draft);
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
      await api.post(`${importCompanyBase(companyId)}/customs`, body);
      router.replace(`/companies/${companyId}/import/shipments/${importShipmentId}`);
    } catch (ex: unknown) {
      setErr(getApiErrorMessage(ex));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title="Customs / Pragyapan Patra"
        description="Required Pragyapan number and date. Other duty and VAT fields align with your clearance documents."
        toolbar={<ImportWorkflowStepper activeKey="customs" />}
      >
        <form onSubmit={onSubmit} className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">
            Shipment ID *
            <input
              required
              className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={importShipmentId}
              onChange={(e) => setImportShipmentId(e.target.value)}
            />
          </label>
          <div className="flex items-end text-xs">
            <Link href={`/companies/${companyId}/import/shipments`} className="text-indigo-600 hover:underline">
              Pick from shipments list
            </Link>
          </div>
          <label className="text-xs font-semibold">
            Pragyapan Patra no *
            <input required className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={pragyapanNo} onChange={(e) => setPragyapanNo(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Pragyapan date *
            <input required type="date" className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={pragyapanDate} onChange={(e) => setPragyapanDate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Customs office
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={customsOffice} onChange={(e) => setCustomsOffice(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Customs reference no
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={customsRef} onChange={(e) => setCustomsRef(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            HS code
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={hsCode} onChange={(e) => setHsCode(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Customs valuation
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={customsValuation} onChange={(e) => setCustomsValuation(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Customs duty
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={customsDuty} onChange={(e) => setCustomsDuty(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            VAT amount
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={vatAmount} onChange={(e) => setVatAmount(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Excise amount
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={exciseAmount} onChange={(e) => setExciseAmount(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Advance tax
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={advanceTax} onChange={(e) => setAdvanceTax(e.target.value)} />
          </label>
          <label className="text-xs font-semibold">
            Customs rate %
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={customsRate} onChange={(e) => setCustomsRate(e.target.value)} />
          </label>
          <label className="text-xs font-semibold sm:col-span-2">
            Agent name
            <input className="mt-1 h-9 w-full rounded-md border px-2 text-sm dark:border-slate-700 dark:bg-slate-900" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </label>
          {err ? <div className="sm:col-span-2 text-xs text-rose-600">{err}</div> : null}
          <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {saving ? "Saving…" : "Save customs entry"}
          </button>
        </form>
      </TradeTransactionShell>
    </div>
  );
}
