import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { migrateDbIfNeeded } from '../db/migrations';

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName="filament-tracker.db" onInit={migrateDbIfNeeded}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Inventario' }} />
        <Stack.Screen
          name="add-spool"
          options={{ title: 'Añadir bobinas', presentation: 'modal' }}
        />
        <Stack.Screen name="spools" options={{ title: 'Bobinas' }} />
      </Stack>
    </SQLiteProvider>
  );
}
