import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

type Params = unknown[];

/** Base de datos SQLite real en memoria con la parte de la API de expo-sqlite que usa la app. */
export function createTestDb(): SQLiteDatabase {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = OFF');
  const adapter = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: Params = []) {
      const result = db.prepare(sql).run(...params);
      return { lastInsertRowId: Number(result.lastInsertRowid), changes: result.changes };
    },
    async getAllAsync<T>(sql: string, params: Params = []) {
      return db.prepare(sql).all(...params) as T[];
    },
    async getFirstAsync<T>(sql: string, params: Params = []) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async withTransactionAsync(task: () => Promise<void>) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    async closeAsync() {
      db.close();
    },
  };

  return adapter as unknown as SQLiteDatabase;
}
