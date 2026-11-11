import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { AppText, Button, Card, EmptyState, Screen, TextField } from '../components/ui';
import { calcProfitCents } from '../features/prints/profit';
import { ProfitSummary } from '../features/prints/ProfitSummary';
import { getPrintDetail, updatePrintSale } from '../features/prints/repository';
import { validateSale } from '../features/prints/schema';
import type { PrintDetail } from '../features/prints/types';
import { centsToInput, formatCents, parseEurosToCents } from '../lib/money';

function describeSaleError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';

  switch (code) {
    case 'PRINT_FAILED':
      return 'Una impresión fallida no se puede marcar como vendida.';
    case 'PRINT_NOT_FOUND':
      return 'La impresión ya no existe.';
    default:
      return 'No se pudo guardar la venta. Inténtalo de nuevo.';
  }
}

export default function SaleScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  // El id de la ruta se valida al renderizar: es un dato derivado, no hace falta estado.
  const printId = id !== undefined && /^\d+$/.test(id) ? Number(id) : null;

  // undefined = cargando, null = no existe
  const [detail, setDetail] = useState<PrintDetail | null | undefined>(undefined);
  const [price, setPrice] = useState('');
  const [fees, setFees] = useState('');
  const [errors, setErrors] = useState<{ salePrice?: string; saleFees?: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (printId === null) return;
    void getPrintDetail(db, printId).then((print) => {
      setDetail(print);
      if (print && print.salePriceCents !== null) {
        setPrice(centsToInput(print.salePriceCents));
        setFees(print.saleFeesCents > 0 ? centsToInput(print.saleFeesCents) : '');
      }
    });
  }, [db, printId]);

  if (printId === null || detail === null) {
    return (
      <Screen>
        <EmptyState title="Impresión no encontrada" message="Puede que ya se haya eliminado." />
      </Screen>
    );
  }

  if (detail === undefined) {
    return <Screen />;
  }

  if (detail.result === 'failed') {
    return (
      <Screen>
        <EmptyState
          title="Impresión fallida"
          message="Una impresión fallida no se puede marcar como vendida."
        />
      </Screen>
    );
  }

  const hasSale = detail.salePriceCents !== null;
  const livePriceCents = parseEurosToCents(price);
  const liveFeesCents = parseEurosToCents(fees) ?? 0;
  const liveProfitCents =
    livePriceCents !== null && livePriceCents > 0
      ? calcProfitCents(livePriceCents, liveFeesCents, detail.totalCostCents)
      : null;

  const handleSave = async () => {
    const result = validateSale(price, fees);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    if (result.sale === null) {
      setErrors({ salePrice: 'Indica el precio de venta' });
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await updatePrintSale(db, detail.id, result.sale);
      router.back();
    } catch (error) {
      Alert.alert('No se pudo guardar', describeSaleError(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = () =>
    Alert.alert('Quitar venta', 'La impresión volverá a figurar como no vendida.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => {
          updatePrintSale(db, detail.id, null)
            .then(() => router.back())
            .catch((error: unknown) => Alert.alert('Error', describeSaleError(error)));
        },
      },
    ]);

  return (
    <>
      <Stack.Screen options={{ title: hasSale ? 'Editar venta' : 'Registrar venta' }} />
      <Screen>
        <Card>
          <AppText variant="heading">{detail.name}</AppText>
          <AppText variant="caption" tone="secondary">
            Coste de la impresión: {formatCents(detail.totalCostCents)}
          </AppText>
        </Card>

        <TextField
          label="Precio de venta total (€)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="15,00"
          hint="Si vendiste varias unidades de esta tanda, la suma de todas."
          error={errors.salePrice}
        />
        <TextField
          label="Comisiones y envío (€, opcional)"
          value={fees}
          onChangeText={setFees}
          keyboardType="decimal-pad"
          placeholder="1,50"
          hint="Lo que se lleva la plataforma de venta, el envío o el embalaje."
          error={errors.saleFees}
        />

        {liveProfitCents !== null && livePriceCents !== null ? (
          <Card>
            <ProfitSummary
              salePriceCents={livePriceCents}
              saleFeesCents={liveFeesCents}
              totalCostCents={detail.totalCostCents}
              profitCents={liveProfitCents}
            />
          </Card>
        ) : null}

        <Button
          label={saving ? 'Guardando...' : 'Guardar venta'}
          onPress={handleSave}
          disabled={saving}
        />
        {hasSale ? <Button label="Quitar venta" variant="danger" onPress={confirmRemove} /> : null}
      </Screen>
    </>
  );
}
