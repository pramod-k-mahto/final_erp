"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { api } from "@/lib/api";
import { importCompanyBase } from "@/lib/importExport/paths";
import { ImportTradeNav } from "@/components/importExport/workspaceNav/CompanyImportNav";
import { TradeTransactionShell } from "@/components/importExport/TradeTransactionShell";
import { ImportWorkflowStepper } from "@/components/importExport/ImportWorkflowStepper";
import { TradeEntityDetailView } from "@/components/importExport/TradeEntityDetailView";

const fetcher = (url: string) => api.get(url).then((r) => r.data);

export default function ImportExpensesListPage() {
  const params = useParams();
  const companyId = String(params?.companyId ?? "");
  const url = companyId ? `${importCompanyBase(companyId)}/expenses` : null;
  const { data: expenses, isLoading } = useSWR(url, fetcher);

  const rows = useMemo(() => {
    if (!expenses) return [];
    if (Array.isArray(expenses)) return expenses;
    if (expenses.items && Array.isArray(expenses.items)) return expenses.items;
    return [];
  }, [expenses]);

  return (
    <div className="p-4">
      <ImportTradeNav companyId={companyId} />
      <TradeTransactionShell
        title="Import Expenses"
        description="View and manage clearing, freight, and other import-related costs."
        toolbar={
          <div className="flex items-center gap-2">
            <Link
              href={`/companies/${companyId}/import/expenses/new`}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 shadow-md transition-all"
            >
              + New Expense
            </Link>
            <ImportWorkflowStepper activeKey="expense" />
          </div>
        }
      >
        <div className="p-4">
          {isLoading && <p className="text-sm text-slate-500">Loading expenses...</p>}
          {!isLoading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center dark:border-slate-800">
              <p className="text-slate-500">No expenses found yet.</p>
              <Link
                href={`/companies/${companyId}/import/expenses/new`}
                className="mt-4 text-sm font-semibold text-indigo-600 hover:underline"
              >
                Create your first expense →
              </Link>
            </div>
          )}
          {rows.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((ex: any) => (
                <Link
                  key={ex.id}
                  href={`/companies/${companyId}/import/expenses/${ex.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-indigo-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-indigo-700"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-indigo-500">
                      {ex.expense_type}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ex.voucher_id ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                      {ex.voucher_id ? 'POSTED' : 'DRAFT'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {ex.vendor_name || 'Generic Vendor'}
                  </h3>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-500">Bill No</p>
                      <p className="text-xs font-semibold">{ex.expense_bill_no || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500">Amount</p>
                      <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                        {new Intl.NumberFormat().format(ex.amount + (ex.vat_amount || 0))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </TradeTransactionShell>
    </div>
  );
}
