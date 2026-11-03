import { optionalPattern } from '../../lib/validation';

/** Precio de la luz en €/kWh. Vacío significa "sin definir" (null). */
export const energyPriceSchema = optionalPattern(
  /^\d+([.,]\d{1,4})?$/,
  'Precio no válido (ej. 0,15)',
)
  .transform((value) => (value === '' ? null : Number(value.replace(',', '.'))))
  .refine((value) => value === null || value <= 5, 'Parece demasiado alto (máx. 5 €/kWh)');
