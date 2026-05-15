import React from "react";
import { useCustomerStatement } from "@/lib/api/partyStatements";

export function CustomerBalanceBadge({ companyId, customerId }: { companyId: string; customerId: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const { report, isLoading } = useCustomerStatement(
    companyId || undefined,
    customerId || undefined,
    "2000-01-01",
    today,
    { suppressForbidden: true },
  );

  if (!customerId) return null;

  if (isLoading) {
    return (
      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
        <span className="inline-flex h-3 w-3 animate-spin rounded-full border border-slate-300 border-t-transparent" />
        Loading balance…
      </div>
    );
  }

  if (!report) return null;

  const balance = report.closing_balance ?? 0;
  // Positive = customer owes us (receivable — normal after sales)
  // Negative = customer has advance / overpaid
  const isReceivable = balance > 0;
  const isAdvance = balance < 0;
  const absBalance = Math.abs(balance).toFixed(2);

  const colorClass = isReceivable
    ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-700/40 dark:text-amber-300"
    : isAdvance
      ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700/40 dark:text-emerald-300"
      : "bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400";

  const label = isReceivable ? "Receivable (Owes us)" : isAdvance ? "Advance (Credit)" : "Settled";

  return (
    <div className={`mt-1.5 inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium ${colorClass}`}>
      {isReceivable ? (
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
        </svg>
      ) : isAdvance ? (
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-7a1 1 0 012 0v3a1 1 0 11-2 0v-3zm1-5a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
      )}
      <span>{label}:</span>
      <span className="font-semibold">{absBalance}</span>
    </div>
  );
}
