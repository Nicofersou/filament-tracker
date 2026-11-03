import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Chip, FieldLabel, Screen, TextField } from '../components/ui';
import { createSpools } from '../features/spools/repository';
import { spoolFormSchema } from '../features/spools/schema';
import {
  MATERIALS,
  SPOOL_STATUSES,
  STATUS_LABELS,
  type Material,
  type SpoolStatus,
} from '../features/spools/types';
import { parseEurosToCents } from '../lib/money';
import { spacing } from '../theme';

export default function AddSpoolScreen() {
  const db = useSQLiteContext();
  const router = useRouter();

  const [material, setMaterial] = useState<Material>('PLA');
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('');
  const [brand, setBrand] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [status, setStatus] = useState<SpoolStatus>('sealed');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const result = spoolFormSchema.safeParse({
      material,
      colorName,
      colorHex,
      brand,
      price,
      quantity,
      status,
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
    const data = result.data;
    setSaving(true);
    try {
      await createSpools(
        db,
        {
          material: data.material,
          colorName: data.colorName,
          colorHex: data.colorHex || null,
          brand: data.brand || null,
          priceCents: parseEurosToCents(data.price),
          status: data.status,
        },
        data.quantity,
      );
      router.back();
    } catch {
      Alert.alert('Error', 'No se pudieron guardar las bobinas. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.group}>
        <FieldLabel>Material</FieldLabel>
        <View style={styles.chips}>
          {MATERIALS.map((m) => (
            <Chip key={m} label={m} selected={m === material} onPress={() => setMaterial(m)} />
          ))}
        </View>
      </View>

      <TextField
        label="Color"
        value={colorName}
        onChangeText={setColorName}
        placeholder="Negro"
        error={errors.colorName}
      />
      <TextField
        label="Color en hexadecimal (opcional)"
        value={colorHex}
        onChangeText={setColorHex}
        placeholder="#000000"
        autoCapitalize="none"
        error={errors.colorHex}
      />
      <TextField
        label="Marca (opcional)"
        value={brand}
        onChangeText={setBrand}
        error={errors.brand}
      />
      <TextField
        label="Precio por bobina en € (opcional)"
        value={price}
        onChangeText={setPrice}
        placeholder="12,99"
        keyboardType="decimal-pad"
        error={errors.price}
      />
      <TextField
        label="Cantidad de bobinas iguales"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="number-pad"
        error={errors.quantity}
      />

      <View style={styles.group}>
        <FieldLabel>Estado</FieldLabel>
        <View style={styles.chips}>
          {SPOOL_STATUSES.map((s) => (
            <Chip
              key={s}
              label={STATUS_LABELS[s]}
              selected={s === status}
              onPress={() => setStatus(s)}
            />
          ))}
        </View>
      </View>

      <Button label={saving ? 'Guardando...' : 'Guardar'} onPress={handleSave} disabled={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
