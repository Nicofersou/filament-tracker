import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../db/migrations';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="filament-tracker.db" onInit={migrateDbIfNeeded}>
      <Stack />
    </SQLiteProvider>
  );
}