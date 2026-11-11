import type { Material } from '../spools/types';

export type PrintResult = 'success' | 'failed';

export interface NewPrint {
  printerId: number;
  name: string;
  printedAt: string; // fecha ISO
  durationMin: number;
  /** Minutos de secado atribuidos a esta impresión (0 por defecto). */
  dryingMin?: number;
  result?: PrintResult; // 'success' por defecto
  notes?: string | null;
  /** Venta ya conocida al registrar la impresión (opcional). */
  sale?: { priceCents: number; feesCents?: number } | null;
  spools: { spoolId: number; grams: number }[];
}

export interface PrintListItem {
  id: number;
  printerId: number;
  printerName: string;
  name: string;
  printedAt: string;
  durationMin: number;
  dryingMin: number;
  result: PrintResult;
  materialCostCents: number;
  energyCostCents: number;
  wearCostCents: number;
  dryingCostCents: number;
  totalCostCents: number;
  /** Total cobrado por la impresión (null si no se ha vendido). */
  salePriceCents: number | null;
  saleFeesCents: number;
  /** Beneficio = venta − comisiones − coste (null si no se ha vendido). */
  profitCents: number | null;
  notes: string | null;
}

export interface PrintUsageDetail {
  spoolId: number;
  material: Material;
  colorName: string;
  colorHex: string | null;
  grams: number;
  costCents: number;
}

export interface PrintDetail extends PrintListItem {
  usages: PrintUsageDetail[];
}

export type CreatePrintErrorCode =
  | 'NO_SPOOLS'
  | 'DUPLICATE_SPOOL'
  | 'PRINTER_NOT_FOUND'
  | 'PRINTER_ARCHIVED'
  | 'SPOOL_NOT_FOUND'
  | 'SPOOL_EMPTY';

export class CreatePrintError extends Error {
  readonly code: CreatePrintErrorCode;

  constructor(code: CreatePrintErrorCode) {
    super(code);
    this.name = 'CreatePrintError';
    this.code = code;
  }
}

export type PrintSaleErrorCode = 'PRINT_NOT_FOUND' | 'PRINT_FAILED';

export class PrintSaleError extends Error {
  readonly code: PrintSaleErrorCode;

  constructor(code: PrintSaleErrorCode) {
    super(code);
    this.name = 'PrintSaleError';
    this.code = code;
  }
}
