/** Beneficio = venta − comisiones y envío − coste de la impresión. Null si no hay venta. */
export function calcProfitCents(
  salePriceCents: number | null,
  saleFeesCents: number,
  totalCostCents: number,
): number | null {
  if (salePriceCents === null) return null;
  return salePriceCents - saleFeesCents - totalCostCents;
}

export interface SalesSummary {
  soldCount: number;
  revenueCents: number;
  profitCents: number;
}

/** Resumen de las impresiones vendidas: cuántas, ingresos brutos y beneficio total. */
export function summarizeSales(
  prints: { salePriceCents: number | null; profitCents: number | null }[],
): SalesSummary {
  let soldCount = 0;
  let revenueCents = 0;
  let profitCents = 0;

  for (const print of prints) {
    if (print.salePriceCents === null || print.profitCents === null) continue;
    soldCount += 1;
    revenueCents += print.salePriceCents;
    profitCents += print.profitCents;
  }

  return { soldCount, revenueCents, profitCents };
}
