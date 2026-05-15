// Force rebuild - Ref fix
import React from "react";
import SalesInvoiceClient from "./SalesInvoiceClient";

export const metadata = {
  title: "Sales Invoices | Enterprise Accounting System",
  description: "Manage sales invoices, bulk imports, and billing.",
};

export default function SalesInvoicesPage() {
  return (
    <div className="w-full h-full">
      <SalesInvoiceClient />
    </div>
  );
}
