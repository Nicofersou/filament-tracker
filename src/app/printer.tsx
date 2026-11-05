import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { Button, Screen, TextField } from '../components/ui';
import {
  createPrinter,
  deletePrinter,
  getPrinter,
  updatePrinter,
} from '../features/printers/repository';
import { printerFormSchema, toNewPrinter } from '../features/printers/schema';
import { centsToInput } from '../lib/money';

export default function PrinterScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const parsedId = id ? Number(id) : NaN;
  const printerId = Number.isInteger(parsedId) ? parsedId : null;

  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [powerW, setPowerW] = useState('');
  const [dryerPowerW, setDryerPowerW] = useState('');
  const [price, setPrice] = useState('');
  const [lifetimeHours, setLifetimeHours] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (printerId === null) return;
    void getPrinter(db, printerId).then((printer) => {
      if (!printer) return;
      setBrand(printer.brand);
      setModel(printer.model);
      setPowerW(printer.powerW === null ? '' : String(printer.powerW));
      setDryerPowerW(printer.dryerPowerW === null ? '' : String(printer.dryerPowerW));
      setPrice(printer.costCents === null ? '' : centsToInput(printer.costCents));
      setLifetimeHours(printer.lifetimeHours === null ? '' : String(printer.lifetimeHours));
    });
  }, [db, printerId]);

  const handleSave = async () => {
    const result = printerFormSchema.safeParse({
      brand,
      model,
      powerW,
      dryerPowerW,
      price,
      lifetimeHours,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        if (!(field in fieldErrors)) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const data = toNewPrinter(result.data);
      if (printerId === null) {
        await createPrinter(db, data);
      } else {
        await updatePrinter(db, printerId, data);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudo guardar la impresora. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (printerId === null) return;
    Alert.alert(
      'Eliminar impresora',
      'Se borrará definitivamente. Si solo has dejado de usarla, es mejor archivarla desde Ajustes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            deletePrinter(db, printerId)
              .then(() => router.back())
              .catch(() =>
                Alert.alert(
                  'No se puede eliminar',
                  'Esta impresora tiene impresiones registradas. Puedes archivarla desde Ajustes.',
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <>
      <Stack.Screen
        options={{ title: printerId === null ? 'Nueva impresora' : 'Editar impresora' }}
      />
      <Screen>
        <TextField
          label="Marca"
          value={brand}
          onChangeText={setBrand}
          placeholder="Anycubic"
          error={errors.brand}
        />
        <TextField
          label="Modelo"
          value={model}
          onChangeText={setModel}
          placeholder="Kobra 4 Combo"
          error={errors.model}
        />
        <TextField
          label="Consumo medio al imprimir en W (opcional)"
          value={powerW}
          onChangeText={setPowerW}
          keyboardType="number-pad"
          hint="Mira las especificaciones del fabricante o mídelo con un enchufe medidor."
          error={errors.powerW}
        />
        <TextField
          label="Consumo medio del módulo de secado en W (opcional)"
          value={dryerPowerW}
          onChangeText={setDryerPowerW}
          keyboardType="number-pad"
          hint="Mídelo con un enchufe medidor en un secado típico (kWh consumidos ÷ horas). La potencia máxima de la ficha no es el promedio."
          error={errors.dryerPowerW}
        />
        <TextField
          label="Precio de la impresora en € (opcional)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          hint="Se usa para repartir su desgaste entre las impresiones."
          error={errors.price}
        />
        <TextField
          label="Vida útil estimada en horas (opcional)"
          value={lifetimeHours}
          onChangeText={setLifetimeHours}
          keyboardType="number-pad"
          hint="Horas de uso tras las que la darías por amortizada."
          error={errors.lifetimeHours}
        />

        <Button
          label={saving ? 'Guardando...' : 'Guardar'}
          onPress={handleSave}
          disabled={saving}
        />
        {printerId !== null ? (
          <Button label="Eliminar impresora" variant="danger" onPress={confirmDelete} />
        ) : null}
      </Screen>
    </>
  );
}
