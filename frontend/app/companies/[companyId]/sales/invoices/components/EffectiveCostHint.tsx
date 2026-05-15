import React from "react";
import useSWR from "swr";
import { getEffectiveItemRate } from "@/lib/api/inventory";

type InventoryValuationMethod = "AVERAGE" | "FIFO";

export function EffectiveCostHint({
  companyId,
  itemId,
  warehouseId,
  dateParam,
  valuationMethod,
}: {
  companyId: number;
  itemId: number;
  warehouseId: number;
  dateParam: string;
  valuationMethod: InventoryValuationMethod;
}) {
  const { data, error } = useSWR<number | null>(
    companyId && itemId && warehouseId && dateParam
      ? ["effective-rate", companyId, itemId, warehouseId, dateParam]
      : null,
    () => getEffectiveItemRate(companyId, itemId, warehouseId, dateParam)
  );

  if (error) {
    return (
      <div className="mt-0.5 text-[10px] text-slate-500">
        Cost rate ({valuationMethod}): -
      </div>
    );
  }

  if (data == null) {
    return (
      <div className="mt-0.5 text-[10px] text-slate-500">
        Cost rate ({valuationMethod}): -
      </div>
    );
  }

  return (
    <div className="mt-0.5 text-[10px] text-slate-500">
      Cost rate ({valuationMethod}): {Number(data).toFixed(2)}
    </div>
  );
}
