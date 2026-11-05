import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/ui';
import { formatCents } from '../../lib/money';
import { spacing, useTheme } from '../../theme';

export function CostBreakdown({
  materialCents,
  energyCents,
  wearCents,
  dryingCents,
  totalCents,
  showDrying,
}: {
  materialCents: number;
  energyCents: number;
  wearCents: number;
  dryingCents: number;
  totalCents: number;
  showDrying: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Row label="Material" cents={materialCents} />
      <Row label="Electricidad" cents={energyCents} />
      <Row label="Desgaste de la impresora" cents={wearCents} />
      {showDrying ? <Row label="Secado" cents={dryingCents} /> : null}
      <View style={[styles.total, { borderTopColor: colors.border }]}>
        <AppText variant="heading">Total</AppText>
        <AppText variant="heading">{formatCents(totalCents)}</AppText>
      </View>
    </View>
  );
}

function Row({ label, cents }: { label: string; cents: number }) {
  return (
    <View style={styles.row}>
      <AppText tone="secondary">{label}</AppText>
      <AppText>{formatCents(cents)}</AppText>
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
