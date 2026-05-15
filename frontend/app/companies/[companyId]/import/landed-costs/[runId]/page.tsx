"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { api, getApiErrorMessage } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportLandedCostRunDetailPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const runId = String(params?.runId ?? "");
  const url = companyId && runId ? `${importCompanyBase(companyId)}/landed-costs/${runId}` : null;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher);

  return (
    <div className="p-4 max-w-5xl">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell title={`Landed cost run #${runId}`} description="Review allocation run output and journal impact." toolbar={<ImportWorkflowStepper activeKey="landed" />}>
      <div className="px-4 pt-4">
        <Link href={`/companies/${companyId}/import/landed-costs`} className="text-xs text-indigo-600 hover:underline">
          ← Landed costs
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
