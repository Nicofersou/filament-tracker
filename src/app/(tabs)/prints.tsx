import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen } from '../../components/ui';
import { summarizeSales } from '../../features/prints/profit';
import { listPrints } from '../../features/prints/repository';
import type { PrintListItem } from '../../features/prints/types';
import { formatDate, formatDuration } from '../../lib/dates';
import { formatCents, formatSignedCents } from '../../lib/money';
import { spacing, useTheme } from '../../theme';

export default function PrintsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
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
  const sales = summarizeSales(prints);

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
        {sales.soldCount > 0 ? (
          <AppText variant="caption" tone="secondary">
            {sales.soldCount === 1 ? '1 vendida' : `${sales.soldCount} vendidas`} · ingresos{' '}
            {formatCents(sales.revenueCents)} · beneficio {formatSignedCents(sales.profitCents)}
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
            <View style={styles.amounts}>
              <AppText variant="heading">{formatCents(print.totalCostCents)}</AppText>
              {print.profitCents !== null ? (
                <AppText
                  variant="caption"
                  style={{ color: print.profitCents >= 0 ? colors.sealed : colors.danger }}
                >
                  Beneficio {formatSignedCents(print.profitCents)}
                </AppText>
              ) : null}
            </View>
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
  amounts: { alignItems: 'flex-end', gap: 2 },
});
