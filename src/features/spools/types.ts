export const MATERIALS = ['PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU'] as const;
export type Material = (typeof MATERIALS)[number];

export const SPOOL_STATUSES = ['sealed', 'in_use', 'empty'] as const;
export type SpoolStatus = (typeof SPOOL_STATUSES)[number];

export interface Spool {
  id: number;
  material: Material;
  colorName: string;
  colorHex: string | null;
  brand: string | null;
  initialWeightG: number;
  remainingWeightG: number;
  priceCents: number | null;
  status: SpoolStatus;
  openedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface NewSpool {
  material: Material;
  colorName: string;
  colorHex?: string | null;
  brand?: string | null;
  initialWeightG?: number; // 1000 por defecto
  priceCents?: number | null;
  status?: SpoolStatus; // 'sealed' por defecto
  notes?: string | null;
}

export interface InventoryRow {
  material: Material;
  colorName: string;
  colorHex: string | null;
  sealed: number;
  inUse: number;
  empty: number;
}