import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { createSpool, getInventorySummary } from '../features/spools/repository';
import type { InventoryRow } from '../features/spools/types';

export default function Index() {
  const db = useSQLiteContext();
  const [summary, setSummary] = useState<InventoryRow[]>([]);

  const refresh = useCallback(async () => {
    setSummary(await getInventorySummary(db));
  }, [db]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTestSpool = async () => {
    await createSpool(db, { material: 'PLA', colorName: 'Negro' });
    await refresh();
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '600' }}>Inventario (prueba)</Text>
      <Button title="Añadir bobina de prueba" onPress={addTestSpool} />
      {summary.map((row) => (
        <View key={`${row.material}-${row.colorName}`}>
          <Text>
            {row.material} {row.colorName}: {row.sealed} sin abrir, {row.inUse} en uso,{' '}
            {row.empty} gastadas
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}