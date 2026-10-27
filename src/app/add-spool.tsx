import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { parseEurosToCents } from '../lib/money';
import { createSpools } from '../features/spools/repository';
import { spoolFormSchema } from '../features/spools/schema';
import {
  MATERIALS,
  SPOOL_STATUSES,
  type Material,
  type SpoolStatus,
} from '../features/spools/types';

const STATUS_LABELS: Record<SpoolStatus, string> = {
  sealed: 'Sin abrir',
  in_use: 'En uso',
  empty: 'Gastada',
};

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
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Material</Text>
      <View style={styles.chips}>
        {MATERIALS.map((m) => (
          <Chip key={m} label={m} selected={m === material} onPress={() => setMaterial(m)} />
        ))}
      </View>

      <Field label="Color" error={errors.colorName}>
        <TextInput
          style={styles.input}
          value={colorName}
          onChangeText={setColorName}
          placeholder="Negro"
        />
      </Field>

      <Field label="Color en hexadecimal (opcional)" error={errors.colorHex}>
        <TextInput
          style={styles.input}
          value={colorHex}
          onChangeText={setColorHex}
          placeholder="#000000"
          autoCapitalize="none"
        />
      </Field>

      <Field label="Marca (opcional)" error={errors.brand}>
        <TextInput style={styles.input} value={brand} onChangeText={setBrand} />
      </Field>

      <Field label="Precio por bobina en € (opcional)" error={errors.price}>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          placeholder="12,99"
          keyboardType="decimal-pad"
        />
      </Field>

      <Field label="Cantidad de bobinas iguales" error={errors.quantity}>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
        />
      </Field>

      <Text style={styles.label}>Estado</Text>
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

      <Pressable
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 10, fontSize: 16 },
  error: { color: '#c0392b', fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#333' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
