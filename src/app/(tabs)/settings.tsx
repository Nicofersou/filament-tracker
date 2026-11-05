import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { AppText, Button, Card, Screen, SectionTitle, TextField } from '../../components/ui';
import { listPrinters, setPrinterArchived } from '../../features/printers/repository';
import type { Printer } from '../../features/printers/types';
import { getSettings, setEnergyPrice } from '../../features/settings/repository';
import { energyPriceSchema } from '../../features/settings/schema';
import { formatCents } from '../../lib/money';
import { spacing } from '../../theme';

function describePrinter(printer: Printer): string {
  const parts: string[] = [];
  if (printer.powerW !== null) parts.push(`${printer.powerW} W`);
  if (printer.dryerPowerW !== null) parts.push(`secado ${printer.dryerPowerW} W`);
  if (printer.costCents !== null) parts.push(formatCents(printer.costCents));
  if (printer.lifetimeHours !== null) parts.push(`${printer.lifetimeHours} h de vida útil`);
  return parts.length > 0 ? parts.join(' · ') : 'Sin datos de consumo ni coste todavía';
}

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [storedEnergy, setStoredEnergy] = useState('');
  const [energyDraft, setEnergyDraft] = useState<string | null>(null);
  const [energyError, setEnergyError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [printers, setPrinters] = useState<Printer[]>([]);

  const load = useCallback(async () => {
    const [settings, allPrinters] = await Promise.all([
      getSettings(db),
      listPrinters(db, { includeArchived: true }),
    ]);
    setStoredEnergy(
      settings.energyPricePerKwh === null
        ? ''
        : String(settings.energyPricePerKwh).replace('.', ','),
    );
    setPrinters(allPrinters);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const saveEnergy = async () => {
    const result = energyPriceSchema.safeParse(energyDraft ?? storedEnergy);
    if (!result.success) {
      setEnergyError(result.error.issues[0]?.message ?? 'Valor no válido');
      return;
    }
    setEnergyError(undefined);
    try {
      await setEnergyPrice(db, result.data);
      setEnergyDraft(null);
      setSaved(true);
      await load();
    } catch {
      Alert.alert('Error', 'No se pudo guardar el precio. Inténtalo de nuevo.');
    }
  };

  const toggleArchived = async (printer: Printer) => {
    try {
      await setPrinterArchived(db, printer.id, printer.archivedAt === null);
      await load();
    } catch {
      Alert.alert('Error', 'No se pudo actualizar la impresora. Inténtalo de nuevo.');
    }
  };

  const editPrinter = (printer: Printer) =>
    router.push({ pathname: '/printer', params: { id: String(printer.id) } });

  const active = printers.filter((p) => p.archivedAt === null);
  const archived = printers.filter((p) => p.archivedAt !== null);

  return (
    <Screen>
      <SectionTitle>Electricidad</SectionTitle>
      <Card style={styles.card}>
        <TextField
          label="Precio de la luz (€/kWh)"
          value={energyDraft ?? storedEnergy}
          onChangeText={(text) => {
            setEnergyDraft(text);
            setSaved(false);
          }}
          keyboardType="decimal-pad"
          placeholder="0,15"
          hint="Lo encontrarás en tu factura. Se usa para calcular el coste de electricidad."
          error={energyError}
        />
        <View style={styles.saveRow}>
          <Button label="Guardar" small onPress={saveEnergy} />
          {saved ? (
            <AppText variant="caption" tone="secondary">
              Guardado
            </AppText>
          ) : null}
        </View>
      </Card>

      <SectionTitle>Impresoras</SectionTitle>
      {active.length === 0 ? (
        <AppText tone="secondary">
          No tienes impresoras activas. Añade una para poder registrar impresiones.
        </AppText>
      ) : null}
      {active.map((printer) => (
        <PrinterCard
          key={printer.id}
          printer={printer}
          actions={
            <>
              <Button
                label="Editar"
                small
                variant="secondary"
                onPress={() => editPrinter(printer)}
              />
              <Button
                label="Archivar"
                small
                variant="secondary"
                onPress={() => void toggleArchived(printer)}
              />
            </>
          }
        />
      ))}
      <Button
        label="Añadir impresora"
        variant="secondary"
        onPress={() => router.push('/printer')}
      />

      {archived.length > 0 ? (
        <>
          <SectionTitle>Archivadas</SectionTitle>
          {archived.map((printer) => (
            <PrinterCard
              key={printer.id}
              printer={printer}
              actions={
                <>
                  <Button
                    label="Editar"
                    small
                    variant="secondary"
                    onPress={() => editPrinter(printer)}
                  />
                  <Button
                    label="Restaurar"
                    small
                    variant="secondary"
                    onPress={() => void toggleArchived(printer)}
                  />
                </>
              }
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function PrinterCard({ printer, actions }: { printer: Printer; actions: React.ReactNode }) {
  return (
    <Card style={styles.card}>
      <View style={styles.printerText}>
        <AppText variant="heading">
          {printer.brand} {printer.model}
        </AppText>
        <AppText variant="caption" tone="secondary">
          {describePrinter(printer)}
        </AppText>
      </View>
      <View style={styles.actions}>{actions}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  saveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  printerText: { gap: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
