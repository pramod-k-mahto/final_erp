import { api } from './api';

/**
 * ENTERPRISE V1 API CLIENT
 * 
 * This file contains all the new endpoints mapped to the refactored Enterprise Architecture.
 * As UI components are migrated, they should import from this file instead of api.ts.
 */

// --- ACCOUNTING / LEDGERS ---

export async function listLedgers(companyId: number) {
  const res = await api.get(`/api/v1/accounting/ledgers`, {
    params: { company_id: companyId }
  });
  return res.data;
}

export async function createLedger(companyId: number, payload: any) {
  const res = await api.post(`/api/v1/accounting/ledgers`, payload, {
    params: { company_id: companyId }
  });
  return res.data;
}

// --- SALES INVOICES ---

export async function listSalesInvoices(companyId: number) {
  const res = await api.get(`/api/v1/sales/invoices`, {
    params: { company_id: companyId }
  });
  return res.data;
}

export async function createSalesInvoice(companyId: number, payload: any) {
  const res = await api.post(`/api/v1/sales/invoices`, payload, {
    params: { company_id: companyId }
  });
  return res.data;
}

// --- PURCHASES ---

export async function listPurchaseBills(companyId: number) {
  const res = await api.get(`/api/v1/purchases/bills`, {
    params: { company_id: companyId }
  });
  return res.data;
}

export async function createPurchaseBill(companyId: number, payload: any) {
  const res = await api.post(`/api/v1/purchases/bills`, payload, {
    params: { company_id: companyId }
  });
  return res.data;
}

// --- INVENTORY / WAREHOUSES ---

export async function listWarehouses(companyId: number) {
  const res = await api.get(`/api/v1/inventory/warehouses`, {
    params: { company_id: companyId }
  });
  return res.data;
}

export async function createWarehouse(companyId: number, payload: any) {
  const res = await api.post(`/api/v1/inventory/warehouses`, payload, {
    params: { company_id: companyId }
  });
  return res.data;
}
