import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  FieldLabel,
  Screen,
  SectionTitle,
  TextField,
} from '../components/ui';
import { listPrinters } from '../features/printers/repository';
import type { Printer } from '../features/printers/types';
import { calcPrintCost, type MissingCostParam } from '../features/prints/costs';
import { CostBreakdown } from '../features/prints/CostBreakdown';
import { createPrint } from '../features/prints/repository';
import {
  parseGrams,
  parsePreview,
  validatePrintForm,
  type DryingValues,
} from '../features/prints/schema';
import { buildSpoolOptions, type SpoolOption } from '../features/prints/spoolOptions';
import type { PrintResult } from '../features/prints/types';
import { getSettings } from '../features/settings/repository';
import { listSpools } from '../features/spools/repository';
import { formatDateInput, formatDuration } from '../lib/dates';
import { radius, spacing, useTheme } from '../theme';

const MISSING_MESSAGES: Record<MissingCostParam, string> = {
  spoolPrice: 'Alguna bobina no tiene precio: su material cuenta como 0 €.',
  energyPrice:
    'Falta el precio de la luz en Ajustes: la electricidad y el secado cuentan como 0 €.',
  printerPower: 'Falta el consumo de la impresora: la electricidad cuenta como 0 €.',
  printerCost: 'Falta el precio o la vida útil de la impresora: el desgaste cuenta como 0 €.',
  dryerPower: 'Falta el consumo del módulo de secado: el secado cuenta como 0 €.',
};

function describeOption(option: SpoolOption): string {
  if (option.status === 'in_use') {
    return `${option.material} · En uso · ≈${Math.round(option.remainingWeightG)} g`;
  }
  return option.sealedCount > 1
    ? `${option.material} · ${option.sealedCount} sin abrir`
    : `${option.material} · Sin abrir`;
}

function describeError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'PRINTER_ARCHIVED':
    case 'PRINTER_NOT_FOUND':
      return 'La impresora elegida ya no está disponible. Elige otra.';
    case 'SPOOL_EMPTY':
    case 'SPOOL_NOT_FOUND':
      return 'Una de las bobinas ya no está disponible. Vuelve a elegir las bobinas.';
    default:
      return 'No se pudo guardar la impresión. Inténtalo de nuevo.';
  }
}

export default function NewPrintScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { colors } = useTheme();

  const [loaded, setLoaded] = useState(false);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [options, setOptions] = useState<SpoolOption[]>([]);
  const [energyPrice, setEnergyPrice] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [date, setDate] = useState(formatDateInput(new Date()));
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState<PrintResult>('success');
  const [printerId, setPrinterId] = useState<number | null>(null);
  const [grams, setGrams] = useState<Record<number, string>>({});
  const [drying, setDrying] = useState<DryingValues>({
    enabled: false,
    mode: 'same',
    manualMinutes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [activePrinters, spools, settings] = await Promise.all([
        listPrinters(db),
        listSpools(db),
        getSettings(db),
      ]);
      setPrinters(activePrinters);
      setOptions(buildSpoolOptions(spools));
      setEnergyPrice(settings.energyPricePerKwh);
      setPrinterId(
        (current) =>
          current ?? (activePrinters.length === 1 ? (activePrinters[0]?.id ?? null) : null),
      );
    } catch {
      Alert.alert('Error', 'No se pudieron cargar los datos. Inténtalo de nuevo.');
    } finally {
      setLoaded(true);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const printer = printers.find((p) => p.id === printerId) ?? null;
  const hasDryer = printer !== null && printer.dryerPowerW !== null;
  const effectiveDrying: DryingValues = hasDryer ? drying : { ...drying, enabled: false };

  const toggleSpool = (spoolId: number) =>
    setGrams((current) => {
      if (spoolId in current) {
        return Object.fromEntries(
          Object.entries(current).filter(([key]) => Number(key) !== spoolId),
        );
      }
      return { ...current, [spoolId]: '' };
    });

  const handleSave = async () => {
    const validation = validatePrintForm({
      name,
      date,
      hours,
      minutes,
      notes,
      result,
      printerId,
      grams,
      drying: effectiveDrying,
    });

    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    const { data } = validation;
    setSaving(true);
    try {
      await createPrint(db, {
        printerId: data.printerId,
        name: data.name,
        printedAt: data.printedAt,
        durationMin: data.durationMin,
        dryingMin: data.dryingMin,
        result: data.result,
        notes: data.notes,
        spools: data.spools,
      });
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', describeError(error));
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <Screen />;
  }

  if (printers.length === 0) {
    return (
      <Screen>
        <EmptyState
          title="Necesitas una impresora"
          message="Para registrar una impresión primero hay que dar de alta tu impresora."
        >
          <Button label="Añadir impresora" onPress={() => router.push('/printer')} />
        </EmptyState>
      </Screen>
    );
  }

  const preview = parsePreview({ hours, minutes, drying: effectiveDrying });
  const selectedOptions = options.filter((option) => option.spoolId in grams);
  const cost =
    printer && (selectedOptions.length > 0 || preview.durationMin > 0)
      ? calcPrintCost({
          durationMin: preview.durationMin,
          dryingMin: preview.dryingMin,
          spools: selectedOptions.map((option) => ({
            grams: parseGrams(grams[option.spoolId] ?? '') ?? 0,
            priceCents: option.priceCents,
            initialWeightG: option.initialWeightG,
          })),
          printer: {
            powerW: printer.powerW,
            costCents: printer.costCents,
            lifetimeHours: printer.lifetimeHours,
            dryerPowerW: printer.dryerPowerW,
          },
          energyPricePerKwh: energyPrice,
        })
      : null;

  return (
    <Screen>
      <TextField
        label="Nombre de la pieza"
        value={name}
        onChangeText={setName}
        placeholder="Soporte de auriculares"
        error={errors.name}
      />

      <TextField
        label="Fecha (dd/mm/aaaa)"
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        error={errors.date}
      />

      <View style={styles.group}>
        <FieldLabel>Duración de la impresión</FieldLabel>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Horas"
              value={hours}
              onChangeText={setHours}
              keyboardType="number-pad"
              placeholder="0"
              error={errors.hours}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Minutos"
              value={minutes}
              onChangeText={setMinutes}
              keyboardType="number-pad"
              placeholder="0"
              error={errors.minutes}
            />
          </View>
        </View>
        {errors.duration ? (
          <AppText variant="caption" tone="danger">
            {errors.duration}
          </AppText>
        ) : null}
      </View>

      <View style={styles.group}>
        <FieldLabel>Resultado</FieldLabel>
        <View style={styles.chips}>
          <Chip
            label="Correcta"
            selected={result === 'success'}
            onPress={() => setResult('success')}
          />
          <Chip
            label="Fallida"
            selected={result === 'failed'}
            onPress={() => setResult('failed')}
          />
        </View>
      </View>

      <View style={styles.group}>
        <FieldLabel>Impresora</FieldLabel>
        {printers.length > 1 ? (
          <View style={styles.chips}>
            {printers.map((p) => (
              <Chip
                key={p.id}
                label={`${p.brand} ${p.model}`}
                selected={p.id === printerId}
                onPress={() => setPrinterId(p.id)}
              />
            ))}
          </View>
        ) : (
          <AppText>
            {printers[0]?.brand} {printers[0]?.model}
          </AppText>
        )}
        {errors.printer ? (
          <AppText variant="caption" tone="danger">
            {errors.printer}
          </AppText>
        ) : null}
      </View>

      <SectionTitle>Bobinas usadas</SectionTitle>
      {options.length === 0 ? (
        <AppText tone="secondary">
          No hay bobinas disponibles (sin abrir o en uso). Añádelas desde Inventario.
        </AppText>
      ) : null}
      {options.map((option) => {
        const selected = option.spoolId in grams;
        return (
          <View key={option.spoolId} style={styles.group}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleSpool(option.spoolId)}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <Card style={[styles.option, selected && { borderColor: colors.accent }]}>
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: option.colorHex ?? colors.border,
                      borderColor: colors.border,
                    },
                  ]}
                />
                <View style={styles.flex}>
                  <AppText variant="heading">{option.colorName}</AppText>
                  <AppText variant="caption" tone="secondary">
                    {describeOption(option)}
                  </AppText>
                </View>
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={24}
                  color={selected ? colors.accent : colors.textSecondary}
                />
              </Card>
            </Pressable>
            {selected ? (
              <TextField
                label={`Gramos usados de ${option.colorName}`}
                value={grams[option.spoolId] ?? ''}
                onChangeText={(text) =>
                  setGrams((current) => ({ ...current, [option.spoolId]: text }))
                }
                keyboardType="decimal-pad"
                placeholder="12,5"
                hint="Tal como los indica el laminador, incluida la purga si la hay."
                error={errors[`grams-${option.spoolId}`]}
              />
            ) : null}
          </View>
        );
      })}
      {errors.spools ? (
        <AppText variant="caption" tone="danger">
          {errors.spools}
        </AppText>
      ) : null}

      {hasDryer ? (
        <>
          <SectionTitle>Secado de filamento</SectionTitle>
          <View style={styles.chips}>
            <Chip
              label="Sin secado"
              selected={!drying.enabled}
              onPress={() => setDrying((d) => ({ ...d, enabled: false }))}
            />
            <Chip
              label="Con secado"
              selected={drying.enabled}
              onPress={() => setDrying((d) => ({ ...d, enabled: true }))}
            />
          </View>
          {drying.enabled ? (
            <View style={styles.group}>
              <View style={styles.chips}>
                <Chip
                  label="Igual que la impresión"
                  selected={drying.mode === 'same'}
                  onPress={() => setDrying((d) => ({ ...d, mode: 'same' }))}
                />
                <Chip
                  label="Minutos manuales"
                  selected={drying.mode === 'manual'}
                  onPress={() => setDrying((d) => ({ ...d, mode: 'manual' }))}
                />
              </View>
              {drying.mode === 'same' ? (
                <AppText variant="caption" tone="secondary">
                  {preview.durationMin > 0
                    ? `Se contarán ${formatDuration(preview.durationMin)} de secado, la duración de la impresión.`
                    : 'Indica la duración de la impresión para calcular el secado.'}
                </AppText>
              ) : (
                <TextField
                  label="Minutos de secado"
                  value={drying.manualMinutes}
                  onChangeText={(text) => setDrying((d) => ({ ...d, manualMinutes: text }))}
                  keyboardType="number-pad"
                  placeholder="240"
                  error={errors.drying}
                />
              )}
            </View>
          ) : null}
        </>
      ) : null}

      <TextField
        label="Notas (opcional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        error={errors.notes}
      />

      {cost ? (
        <>
          <SectionTitle>Coste estimado</SectionTitle>
          <Card style={styles.costCard}>
            <CostBreakdown
              materialCents={cost.materialCents}
              energyCents={cost.energyCents}
              wearCents={cost.wearCents}
              dryingCents={cost.dryingCents}
              totalCents={cost.totalCents}
              showDrying={effectiveDrying.enabled}
            />
            {cost.missing.map((key) => (
              <AppText key={key} variant="caption" tone="secondary">
                {MISSING_MESSAGES[key]}
              </AppText>
            ))}
          </Card>
        </>
      ) : null}

      <Button
        label={saving ? 'Guardando...' : 'Guardar impresión'}
        onPress={handleSave}
        disabled={saving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  costCard: { gap: spacing.md },
});
