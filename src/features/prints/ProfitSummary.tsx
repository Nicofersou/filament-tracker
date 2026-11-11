import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/ui';
import { formatCents, formatSignedCents } from '../../lib/money';
import { spacing, useTheme } from '../../theme';

export function ProfitSummary({
  salePriceCents,
  saleFeesCents,
  totalCostCents,
  profitCents,
}: {
  salePriceCents: number;
  saleFeesCents: number;
  totalCostCents: number;
  profitCents: number;
}) {
  const { colors } = useTheme();
  const profitColor =
    profitCents > 0 ? colors.sealed : profitCents < 0 ? colors.danger : colors.text;

  return (
    <View style={styles.container}>
      <Row label="Precio de venta" value={formatCents(salePriceCents)} />
      {saleFeesCents > 0 ? (
        <Row label="Comisiones y envío" value={`-${formatCents(saleFeesCents)}`} />
      ) : null}
      <Row label="Coste de la impresión" value={`-${formatCents(totalCostCents)}`} />
      <View style={[styles.total, { borderTopColor: colors.border }]}>
        <AppText variant="heading">Beneficio</AppText>
        <AppText variant="heading" style={{ color: profitColor }}>
          {formatSignedCents(profitCents)}
        </AppText>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText tone="secondary">{label}</AppText>
      <AppText>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
});
