import type { SQLiteDatabase } from 'expo-sqlite';

export interface Settings {
  energyPricePerKwh: number | null;
}

export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const row = await db.getFirstAsync<{ energy_price_per_kwh: number | null }>(
    'SELECT energy_price_per_kwh FROM settings WHERE id = 1',
  );
  return { energyPricePerKwh: row?.energy_price_per_kwh ?? null };
}

export async function setEnergyPrice(db: SQLiteDatabase, price: number | null): Promise<void> {
  await db.runAsync('UPDATE settings SET energy_price_per_kwh = ? WHERE id = 1', [price]);
}
