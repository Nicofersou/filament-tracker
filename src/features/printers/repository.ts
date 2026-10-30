import type { SQLiteDatabase } from 'expo-sqlite';
import type { NewPrinter, Printer } from './types';

interface PrinterRow {
  id: number;
  brand: string;
  model: string;
  power_w: number | null;
  cost_cents: number | null;
  lifetime_hours: number | null;
  archived_at: string | null;
  created_at: string;
}

function toPrinter(row: PrinterRow): Printer {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    powerW: row.power_w,
    costCents: row.cost_cents,
    lifetimeHours: row.lifetime_hours,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
  };
}

export async function createPrinter(db: SQLiteDatabase, input: NewPrinter): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO printers (brand, model, power_w, cost_cents, lifetime_hours)
     VALUES (?, ?, ?, ?, ?)`,
    [
      input.brand,
      input.model,
      input.powerW ?? null,
      input.costCents ?? null,
      input.lifetimeHours ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function getPrinter(db: SQLiteDatabase, id: number): Promise<Printer | null> {
  const row = await db.getFirstAsync<PrinterRow>('SELECT * FROM printers WHERE id = ?', [id]);
  return row ? toPrinter(row) : null;
}

export async function listPrinters(
  db: SQLiteDatabase,
  options: { includeArchived?: boolean } = {},
): Promise<Printer[]> {
  // La condición es una constante del código, nunca texto del usuario.
  const where = options.includeArchived ? '' : 'WHERE archived_at IS NULL';
  const rows = await db.getAllAsync<PrinterRow>(`SELECT * FROM printers ${where} ORDER BY id`);
  return rows.map(toPrinter);
}

export async function updatePrinter(
  db: SQLiteDatabase,
  id: number,
  input: NewPrinter,
): Promise<void> {
  await db.runAsync(
    `UPDATE printers
        SET brand = ?, model = ?, power_w = ?, cost_cents = ?, lifetime_hours = ?
      WHERE id = ?`,
    [
      input.brand,
      input.model,
      input.powerW ?? null,
      input.costCents ?? null,
      input.lifetimeHours ?? null,
      id,
    ],
  );
}

export async function setPrinterArchived(
  db: SQLiteDatabase,
  id: number,
  archived: boolean,
): Promise<void> {
  await db.runAsync('UPDATE printers SET archived_at = ? WHERE id = ?', [
    archived ? new Date().toISOString() : null,
    id,
  ]);
}

/** Falla si la impresora tiene impresiones (restricción de la base de datos). */
export async function deletePrinter(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM printers WHERE id = ?', [id]);
}
