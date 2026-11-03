import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen, StatusBadge } from '../components/ui';
import { deleteSpool, listSpoolsByColor, updateSpoolStatus } from '../features/spools/repository';
import type { Spool, SpoolStatus } from '../features/spools/types';
import { formatDate } from '../lib/dates';
import { formatCents } from '../lib/money';
import { spacing } from '../theme';

export default function SpoolsByColorScreen() {
  const db = useSQLiteContext();
  const { material, colorName } = useLocalSearchParams<{ material: string; colorName: string }>();
  const [spools, setSpools] = useState<Spool[] | null>(null);

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
      <Screen>
        {spools !== null && spools.length === 0 ? (
          <EmptyState title="Sin bobinas" message="No quedan bobinas de este color." />
        ) : null}

        {(spools ?? []).map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.header}>
              <StatusBadge status={item.status} />
              {item.priceCents !== null ? (
                <AppText variant="caption" tone="secondary">
                  {formatCents(item.priceCents)}
                </AppText>
              ) : null}
            </View>

            <View style={styles.details}>
              {item.brand ? <AppText tone="secondary">{item.brand}</AppText> : null}
              {item.status === 'in_use' ? (
                <AppText tone="secondary">≈ {item.remainingWeightG} g restantes (aprox.)</AppText>
              ) : null}
              {item.openedAt ? (
                <AppText tone="secondary">Abierta el {formatDate(item.openedAt)}</AppText>
              ) : null}
              {item.finishedAt ? (
                <AppText tone="secondary">Gastada el {formatDate(item.finishedAt)}</AppText>
              ) : null}
            </View>

            <View style={styles.actions}>
              {item.status === 'sealed' ? (
                <Button label="Abrir" small onPress={() => void changeStatus(item, 'in_use')} />
              ) : null}
              {item.status === 'in_use' ? (
                <>
                  <Button label="Marcar gastada" small onPress={() => confirmFinish(item)} />
                  <Button
                    label="Volver a sin abrir"
                    small
                    variant="secondary"
                    onPress={() => void changeStatus(item, 'sealed')}
                  />
                </>
              ) : null}
              <Button label="Eliminar" small variant="danger" onPress={() => confirmDelete(item)} />
            </View>
          </Card>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  details: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
