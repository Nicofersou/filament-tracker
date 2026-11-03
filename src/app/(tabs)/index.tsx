import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen, StatusDot } from '../../components/ui';
import { getInventorySummary } from '../../features/spools/repository';
import { STATUS_LABELS, type InventoryRow, type SpoolStatus } from '../../features/spools/types';
import { radius, spacing, useTheme } from '../../theme';

export default function InventoryScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const [summary, setSummary] = useState<InventoryRow[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      void getInventorySummary(db).then(setSummary);
    }, [db]),
  );

  if (summary === null) {
    return <Screen />;
  }

  if (summary.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Aún no hay bobinas"
          message="Añade tu primera bobina para empezar a llevar el inventario."
        >
          <Button label="Añadir bobinas" onPress={() => router.push('/add-spool')} />
        </EmptyState>
      </Screen>
    );
  }

  const total = (key: 'sealed' | 'inUse' | 'empty') =>
    summary.reduce((sum, row) => sum + row[key], 0);

  return (
    <Screen>
      <View style={styles.stats}>
        <StatTile status="sealed" value={total('sealed')} />
        <StatTile status="in_use" value={total('inUse')} />
        <StatTile status="empty" value={total('empty')} />
      </View>

      {summary.map((row) => (
        <Pressable
          key={`${row.material}-${row.colorName}`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/spools',
              params: { material: row.material, colorName: row.colorName },
            })
          }
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Card style={styles.row}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: row.colorHex ?? colors.border, borderColor: colors.border },
              ]}
            />
            <View style={styles.rowText}>
              <AppText variant="heading">{row.colorName}</AppText>
              <AppText variant="caption" tone="secondary">
                {row.material}
              </AppText>
            </View>
            <View style={styles.counts}>
              <Count status="sealed" value={row.sealed} />
              <Count status="in_use" value={row.inUse} />
              <Count status="empty" value={row.empty} />
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function StatTile({ status, value }: { status: SpoolStatus; value: number }) {
  return (
    <Card style={styles.tile}>
      <AppText style={styles.tileValue}>{value}</AppText>
      <View style={styles.tileLabel}>
        <StatusDot status={status} size={6} />
        <AppText variant="caption" tone="secondary">
          {STATUS_LABELS[status]}
        </AppText>
      </View>
    </Card>
  );
}

function Count({ status, value }: { status: SpoolStatus; value: number }) {
  return (
    <View style={styles.count}>
      <StatusDot status={status} size={6} />
      <AppText variant="caption" tone={value === 0 ? 'secondary' : 'default'}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.lg },
  tileValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  tileLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  counts: { flexDirection: 'row', gap: spacing.md },
  count: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
