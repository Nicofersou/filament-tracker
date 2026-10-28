import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getInventorySummary } from '../features/spools/repository';
import type { InventoryRow } from '../features/spools/types';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [summary, setSummary] = useState<InventoryRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getInventorySummary(db).then(setSummary);
    }, [db]),
  );

  const totalSealed = summary.reduce((sum, row) => sum + row.sealed, 0);
  const totalEmpty = summary.reduce((sum, row) => sum + row.empty, 0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.totals}>
        <Text style={styles.totalsText}>{totalSealed} sin abrir</Text>
        <Text style={styles.totalsText}>{totalEmpty} gastadas</Text>
      </View>

      {summary.length === 0 ? (
        <Text style={styles.empty}>Todavía no hay bobinas. Añade la primera.</Text>
      ) : (
        summary.map((row) => (
          <Pressable
            key={`${row.material}-${row.colorName}`}
            style={styles.row}
            onPress={() =>
              router.push({
                pathname: '/spools',
                params: { material: row.material, colorName: row.colorName },
              })
            }
          >
            <View style={[styles.dot, { backgroundColor: row.colorHex ?? '#ccc' }]} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>
                {row.material} · {row.colorName}
              </Text>
              <Text>
                {row.sealed} sin abrir · {row.inUse} en uso · {row.empty} gastadas
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))
      )}

      <Pressable style={styles.addButton} onPress={() => router.push('/add-spool')}>
        <Text style={styles.addButtonText}>Añadir bobinas</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  totals: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  totalsText: { fontSize: 18, fontWeight: '600' },
  empty: { textAlign: 'center', marginVertical: 24, color: '#666' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#999' },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chevron: { fontSize: 28, color: '#999' },
});
