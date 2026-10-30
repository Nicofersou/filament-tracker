export interface Printer {
  id: number;
  brand: string;
  model: string;
  powerW: number | null;
  costCents: number | null;
  lifetimeHours: number | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface NewPrinter {
  brand: string;
  model: string;
  powerW?: number | null;
  costCents?: number | null;
  lifetimeHours?: number | null;
}
