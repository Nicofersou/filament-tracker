import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { migrateDbIfNeeded } from '../db/migrations';
import { useTheme } from '../theme';

export default function RootLayout() {
  const { colors } = useTheme();

  return (
    <SQLiteProvider databaseName="filament-tracker.db" onInit={migrateDbIfNeeded}>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-spool"
          options={{ title: 'Añadir bobinas', presentation: 'modal' }}
        />
        <Stack.Screen name="spools" options={{ title: 'Bobinas' }} />
        <Stack.Screen name="printer" options={{ presentation: 'modal' }} />
      </Stack>
    </SQLiteProvider>
  );
}
