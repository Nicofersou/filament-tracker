import type { Material } from '../spools/types';

export type PrintResult = 'success' | 'failed';

export interface NewPrint {
  printerId: number;
  name: string;
  printedAt: string; // fecha ISO
  durationMin: number;
  result?: PrintResult; // 'success' por defecto
  notes?: string | null;
  spools: { spoolId: number; grams: number }[];
}

export interface PrintListItem {
  id: number;
  printerId: number;
  printerName: string;
  name: string;
  printedAt: string;
  durationMin: number;
  result: PrintResult;
  materialCostCents: number;
  energyCostCents: number;
  wearCostCents: number;
  totalCostCents: number;
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
