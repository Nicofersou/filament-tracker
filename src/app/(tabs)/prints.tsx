import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen } from '../../components/ui';
import { listPrints } from '../../features/prints/repository';
import type { PrintListItem } from '../../features/prints/types';
import { formatDate, formatDuration } from '../../lib/dates';
import { formatCents } from '../../lib/money';
import { spacing } from '../../theme';

export default function PrintsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const [prints, setPrints] = useState<PrintListItem[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      void listPrints(db).then(setPrints);
    }, [db]),
  );

  if (prints === null) {
    return <Screen />;
  }

  if (prints.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Todavía no hay impresiones"
          message="Registra tu primera impresión para ver cuánto te cuesta cada pieza."
        >
          <Button label="Registrar impresión" onPress={() => router.push('/new-print')} />
        </EmptyState>
      </Screen>
    );
  }

  const totalCents = prints.reduce((sum, p) => sum + p.totalCostCents, 0);
  const failedCents = prints
    .filter((p) => p.result === 'failed')
    .reduce((sum, p) => sum + p.totalCostCents, 0);

  return (
    <Screen>
      <Card style={styles.summary}>
        <AppText variant="caption" tone="secondary">
          {prints.length === 1 ? '1 impresión' : `${prints.length} impresiones`} · coste total
        </AppText>
        <AppText style={styles.summaryValue}>{formatCents(totalCents)}</AppText>
        {failedCents > 0 ? (
          <AppText variant="caption" tone="danger">
            {formatCents(failedCents)} en impresiones fallidas
          </AppText>
        ) : null}
      </Card>

      {prints.map((print) => (
        <Pressable
          key={print.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/print', params: { id: String(print.id) } })}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Card style={styles.row}>
            <View style={styles.rowText}>
              <AppText variant="heading">{print.name}</AppText>
              <AppText variant="caption" tone="secondary">
                {formatDate(print.printedAt)} · {formatDuration(print.durationMin)} ·{' '}
                {print.printerName}
              </AppText>
              {print.result === 'failed' ? (
                <AppText variant="caption" tone="danger">
                  Fallida
                </AppText>
              ) : null}
            </View>
            <AppText variant="heading">{formatCents(print.totalCostCents)}</AppText>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { gap: spacing.xs },
  summaryValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowText: { flex: 1, gap: 2 },
});
