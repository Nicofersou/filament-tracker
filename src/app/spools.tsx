import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate } from '../lib/dates';
import { formatCents } from '../lib/money';
import { deleteSpool, listSpoolsByColor, updateSpoolStatus } from '../features/spools/repository';
import type { Spool, SpoolStatus } from '../features/spools/types';

const STATUS_LABELS: Record<SpoolStatus, string> = {
  sealed: 'Sin abrir',
  in_use: 'En uso',
  empty: 'Gastada',
};

export default function SpoolsByColorScreen() {
  const db = useSQLiteContext();
  const { material, colorName } = useLocalSearchParams<{ material: string; colorName: string }>();
  const [spools, setSpools] = useState<Spool[]>([]);

  const load = useCallback(async () => {
    if (!material || !colorName) return;
    setSpools(await listSpoolsByColor(db, material, colorName));
  }, [db, material, colorName]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      await load();
    } catch {
      Alert.alert('Error', 'No se pudo completar la acción. Inténtalo de nuevo.');
    }
  };

  const changeStatus = (spool: Spool, status: SpoolStatus) =>
    run(() => updateSpoolStatus(db, spool.id, status));

  const confirmFinish = (spool: Spool) =>
    Alert.alert('Marcar como gastada', '¿Seguro que esta bobina ya está terminada?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Gastada', onPress: () => void changeStatus(spool, 'empty') },
    ]);

  const confirmDelete = (spool: Spool) =>
    Alert.alert(
      'Eliminar bobina',
      'Se borrará del inventario y no se puede deshacer. Úsalo solo si la creaste por error.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => void run(() => deleteSpool(db, spool.id)),
        },
      ],
    );

  return (
    <>
      <Stack.Screen options={{ title: `${material ?? ''} · ${colorName ?? ''}` }} />
      <FlatList
        contentContainerStyle={styles.list}
        data={spools}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>No hay bobinas de este color.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.status}>{STATUS_LABELS[item.status]}</Text>
              {item.priceCents !== null ? <Text>{formatCents(item.priceCents)}</Text> : null}
            </View>

            {item.brand ? <Text>{item.brand}</Text> : null}
            {item.openedAt ? <Text>Abierta: {formatDate(item.openedAt)}</Text> : null}
            {item.finishedAt ? <Text>Gastada: {formatDate(item.finishedAt)}</Text> : null}

            <View style={styles.actions}>
              {item.status === 'sealed' ? (
                <ActionButton
                  label="Abrir"
                  onPress={() => void changeStatus(item, 'in_use')}
                  primary
                />
              ) : null}
              {item.status === 'in_use' ? (
                <>
                  <ActionButton
                    label="Marcar gastada"
                    onPress={() => confirmFinish(item)}
                    primary
                  />
                  <ActionButton
                    label="Volver a sin abrir"
                    onPress={() => void changeStatus(item, 'sealed')}
                  />
                </>
              ) : null}
              <ActionButton label="Eliminar" onPress={() => confirmDelete(item)} danger />
            </View>
          </View>
        )}
      />
    </>
  );
}

function ActionButton({
  label,
  onPress,
  primary,
  danger,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, primary && styles.buttonPrimary, danger && styles.buttonDanger]}
    >
      <Text
        style={[
          styles.buttonText,
          primary && styles.buttonTextPrimary,
          danger && styles.buttonTextDanger,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
  empty: { textAlign: 'center', marginTop: 32, color: '#666' },
  card: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, gap: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  button: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buttonPrimary: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  buttonDanger: { borderColor: '#c0392b' },
  buttonText: { color: '#333' },
  buttonTextPrimary: { color: '#fff', fontWeight: '600' },
  buttonTextDanger: { color: '#c0392b' },
});
