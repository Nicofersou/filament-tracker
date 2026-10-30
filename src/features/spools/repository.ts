import type { SQLiteDatabase } from 'expo-sqlite';
import type { InventoryRow, Material, NewSpool, Spool, SpoolStatus } from './types';

interface SpoolRow {
  id: number;
  material: string;
  color_name: string;
  color_hex: string | null;
  brand: string | null;
  initial_weight_g: number;
  remaining_weight_g: number;
  price_cents: number | null;
  status: string;
  opened_at: string | null;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
}

function toSpool(row: SpoolRow): Spool {
  return {
    id: row.id,
    material: row.material as Material,
    colorName: row.color_name,
    colorHex: row.color_hex,
    brand: row.brand,
    initialWeightG: row.initial_weight_g,
    remainingWeightG: row.remaining_weight_g,
    priceCents: row.price_cents,
    status: row.status as SpoolStatus,
    openedAt: row.opened_at,
    finishedAt: row.finished_at,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function listSpools(db: SQLiteDatabase): Promise<Spool[]> {
  const rows = await db.getAllAsync<SpoolRow>('SELECT * FROM spools ORDER BY created_at DESC');
  return rows.map(toSpool);
}

export async function createSpool(db: SQLiteDatabase, input: NewSpool): Promise<number> {
  const initialWeight = input.initialWeightG ?? 1000;
  const status = input.status ?? 'sealed';
  const now = new Date().toISOString();

  const result = await db.runAsync(
    `INSERT INTO spools
      (material, color_name, color_hex, brand, initial_weight_g, remaining_weight_g,
       price_cents, status, opened_at, finished_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.material,
      input.colorName,
      input.colorHex ?? null,
      input.brand ?? null,
      initialWeight,
      status === 'empty' ? 0 : initialWeight,
      input.priceCents ?? null,
      status,
      status === 'sealed' ? null : now,
      status === 'empty' ? now : null,
      input.notes ?? null,
    ],
  );
  return result.lastInsertRowId;
}

export async function getInventorySummary(db: SQLiteDatabase): Promise<InventoryRow[]> {
  const rows = await db.getAllAsync<{
    material: string;
    color_name: string;
    color_hex: string | null;
    sealed: number;
    in_use: number;
    empty: number;
  }>(
    `SELECT material,
            color_name,
            MIN(color_hex) AS color_hex,
            SUM(status = 'sealed') AS sealed,
            SUM(status = 'in_use') AS in_use,
            SUM(status = 'empty') AS empty
       FROM spools
      GROUP BY material, color_name
      ORDER BY material, color_name`,
  );
  return rows.map((r) => ({
    material: r.material as Material,
    colorName: r.color_name,
    colorHex: r.color_hex,
    sealed: r.sealed,
    inUse: r.in_use,
    empty: r.empty,
  }));
}

export async function createSpools(
  db: SQLiteDatabase,
  input: NewSpool,
  quantity: number,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (let i = 0; i < quantity; i++) {
      await createSpool(db, input);
    }
  });
}

export async function listSpoolsByColor(
  db: SQLiteDatabase,
  material: string,
  colorName: string,
): Promise<Spool[]> {
  const rows = await db.getAllAsync<SpoolRow>(
    `SELECT * FROM spools
      WHERE material = ? AND color_name = ?
      ORDER BY CASE status WHEN 'in_use' THEN 0 WHEN 'sealed' THEN 1 ELSE 2 END, id DESC`,
    [material, colorName],
  );
  return rows.map(toSpool);
}

export async function updateSpoolStatus(
  db: SQLiteDatabase,
  id: number,
  status: SpoolStatus,
): Promise<void> {
  const now = new Date().toISOString();

  switch (status) {
    case 'in_use':
      await db.runAsync(
        `UPDATE spools
            SET status = 'in_use', opened_at = COALESCE(opened_at, ?), finished_at = NULL
          WHERE id = ?`,
        [now, id],
      );
      break;
    case 'empty':
      await db.runAsync(
        `UPDATE spools
            SET status = 'empty', remaining_weight_g = 0,
                opened_at = COALESCE(opened_at, ?), finished_at = ?
          WHERE id = ?`,
        [now, now, id],
      );
      break;
    case 'sealed':
      await db.runAsync(
        `UPDATE spools
            SET status = 'sealed', remaining_weight_g = initial_weight_g,
                opened_at = NULL, finished_at = NULL
          WHERE id = ?`,
        [id],
      );
      break;
  }
}

export async function deleteSpool(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM spools WHERE id = ?', [id]);
}

export async function getSpoolById(db: SQLiteDatabase, id: number): Promise<Spool | null> {
  const row = await db.getFirstAsync<SpoolRow>('SELECT * FROM spools WHERE id = ?', [id]);
  return row ? toSpool(row) : null;
}
