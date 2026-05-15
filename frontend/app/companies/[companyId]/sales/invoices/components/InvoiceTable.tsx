"use client";

import React from "react";

interface InvoiceTableProps {
  invoices: any[];
  isLoading: boolean;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  // Add other props like print/email handlers
}

/**
 * 🚧 WORKFLOW EXTRACTION TARGET 🚧
 * 
 * Move the massive <table> from SalesInvoiceClient.tsx into this component.
 * It should ONLY receive data via props, and emit actions via callbacks.
 */
export function InvoiceTable({ invoices, isLoading, onEdit, onDelete }: InvoiceTableProps) {
  if (isLoading) {
    return <div className="p-10 text-center animate-pulse">Loading invoices...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200">
      {/* 
        TODO: Copy the <table> logic from SalesInvoiceClient.tsx here.
        Replace `useSWR` fetched `invoices` with the `invoices` prop above.
      */}
      <p className="p-5 text-sm text-slate-500">
        Extract the table from SalesInvoiceClient here.
      </p>
    </div>
  );
}
