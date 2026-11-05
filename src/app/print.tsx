import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen, SectionTitle } from '../components/ui';
import { CostBreakdown } from '../features/prints/CostBreakdown';
import { deletePrint, getPrintDetail } from '../features/prints/repository';
import type { PrintDetail } from '../features/prints/types';
import { formatDate, formatDuration } from '../lib/dates';
import { formatCents } from '../lib/money';
import { radius, spacing, useTheme } from '../theme';

export default function PrintDetailScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parsedId = id ? Number(id) : NaN;

  // undefined = cargando, null = no existe
  const [detail, setDetail] = useState<PrintDetail | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      if (!Number.isInteger(parsedId)) {
        setDetail(null);
        return;
      }
      void getPrintDetail(db, parsedId).then(setDetail);
    }, [db, parsedId]),
  );

  const confirmDelete = (printId: number) =>
    Alert.alert(
      'Eliminar impresión',
      'Se borrará la impresión y se devolverán los gramos a las bobinas que no estén gastadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deletePrint(db, printId)
              .then(() => router.back())
              .catch(() => Alert.alert('Error', 'No se pudo eliminar la impresión.'));
          },
        },
      ],
    );

  if (detail === undefined) {
    return <Screen />;
  }

  if (detail === null) {
    return (
      <Screen>
        <EmptyState title="Impresión no encontrada" message="Puede que ya se haya eliminado." />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: detail.name }} />
      <Screen>
        <Card style={styles.card}>
          <InfoRow label="Fecha" value={formatDate(detail.printedAt)} />
          <InfoRow label="Duración" value={formatDuration(detail.durationMin)} />
          {detail.dryingMin > 0 ? (
            <InfoRow label="Secado" value={formatDuration(detail.dryingMin)} />
          ) : null}
          <InfoRow label="Impresora" value={detail.printerName} />
          <InfoRow
            label="Resultado"
            value={detail.result === 'failed' ? 'Fallida' : 'Correcta'}
            danger={detail.result === 'failed'}
          />
        </Card>

        <SectionTitle>Coste</SectionTitle>
        <Card>
          <CostBreakdown
            materialCents={detail.materialCostCents}
            energyCents={detail.energyCostCents}
            wearCents={detail.wearCostCents}
            dryingCents={detail.dryingCostCents}
            totalCents={detail.totalCostCents}
            showDrying={detail.dryingMin > 0}
          />
        </Card>

        <SectionTitle>Material</SectionTitle>
        <Card style={styles.card}>
          {detail.usages.map((usage) => (
            <View key={usage.spoolId} style={styles.usage}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: usage.colorHex ?? colors.border, borderColor: colors.border },
                ]}
              />
              <View style={styles.usageText}>
                <AppText>{usage.colorName}</AppText>
                <AppText variant="caption" tone="secondary">
                  {usage.material} · {usage.grams.toLocaleString('es-ES')} g
                </AppText>
              </View>
              <AppText>{formatCents(usage.costCents)}</AppText>
            </View>
          ))}
        </Card>

        {detail.notes ? (
          <>
            <SectionTitle>Notas</SectionTitle>
            <Card>
              <AppText>{detail.notes}</AppText>
            </Card>
          </>
        ) : null}

        <Button
          label="Eliminar impresión"
          variant="danger"
          onPress={() => confirmDelete(detail.id)}
        />
      </Screen>
    </>
  );
}

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <AppText tone="secondary">{label}</AppText>
      <AppText tone={danger ? 'danger' : 'default'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  usage: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  usageText: { flex: 1 },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
