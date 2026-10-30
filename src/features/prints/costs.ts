export interface SpoolUsageInput {
  grams: number;
  priceCents: number | null;
  initialWeightG: number;
}

export interface PrinterCostParams {
  powerW: number | null;
  costCents: number | null;
  lifetimeHours: number | null;
}

export type MissingCostParam = 'spoolPrice' | 'energyPrice' | 'printerPower' | 'printerCost';

export interface PrintCostInput {
  durationMin: number;
  spools: SpoolUsageInput[];
  printer: PrinterCostParams;
  energyPricePerKwh: number | null;
}

export interface PrintCostBreakdown {
  materialCents: number;
  energyCents: number;
  wearCents: number;
  totalCents: number;
  /** Parámetros que faltan y han hecho que algún concepto se calcule como 0. */
  missing: MissingCostParam[];
}

/** Redondea a entero eliminando antes el ruido de coma flotante (4.4999999999 -> 4.5 -> 5). */
function roundCents(value: number): number {
  return Math.round(Number(value.toFixed(6)));
}

export function calcMaterialCostCents(spool: SpoolUsageInput): number {
  if (spool.priceCents === null || spool.initialWeightG <= 0) return 0;
  return roundCents((spool.grams * spool.priceCents) / spool.initialWeightG);
}

export function calcEnergyCostCents(
  durationMin: number,
  powerW: number | null,
  energyPricePerKwh: number | null,
): number {
  if (powerW === null || energyPricePerKwh === null) return 0;
  const kwh = ((powerW / 1000) * durationMin) / 60;
  return roundCents(kwh * energyPricePerKwh * 100);
}

export function calcWearCostCents(
  durationMin: number,
  printerCostCents: number | null,
  lifetimeHours: number | null,
): number {
  if (printerCostCents === null || lifetimeHours === null || lifetimeHours <= 0) return 0;
  return roundCents(((durationMin / 60) * printerCostCents) / lifetimeHours);
}

export function calcPrintCost(input: PrintCostInput): PrintCostBreakdown {
  const { durationMin, spools, printer, energyPricePerKwh } = input;

  // Cada concepto se redondea por separado y el total es la suma de las partes ya redondeadas.
  const materialCents = spools.reduce((sum, spool) => sum + calcMaterialCostCents(spool), 0);
  const energyCents = calcEnergyCostCents(durationMin, printer.powerW, energyPricePerKwh);
  const wearCents = calcWearCostCents(durationMin, printer.costCents, printer.lifetimeHours);

  const missing: MissingCostParam[] = [];
  if (spools.some((spool) => spool.priceCents === null)) missing.push('spoolPrice');
  if (energyPricePerKwh === null) missing.push('energyPrice');
  if (printer.powerW === null) missing.push('printerPower');
  if (printer.costCents === null || printer.lifetimeHours === null || printer.lifetimeHours <= 0) {
    missing.push('printerCost');
  }

  return {
    materialCents,
    energyCents,
    wearCents,
    totalCents: materialCents + energyCents + wearCents,
    missing,
  };
}
