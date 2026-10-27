import { z } from 'zod';
import { MATERIALS, SPOOL_STATUSES } from './types';

export const spoolFormSchema = z.object({
  material: z.enum(MATERIALS),
  colorName: z.string().trim().min(1, 'Indica el nombre del color').max(40, 'Máximo 40 caracteres'),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Usa el formato #RRGGBB (ej. #FF0000)')
    .or(z.literal('')),
  brand: z.string().trim().max(40, 'Máximo 40 caracteres'),
  price: z
    .string()
    .trim()
    .regex(/^\d+([.,]\d{1,2})?$/, 'Precio no válido (ej. 12,99)')
    .or(z.literal('')),
  quantity: z.coerce
    .number('Indica una cantidad')
    .int('Debe ser un número entero')
    .min(1, 'Mínimo 1')
    .max(20, 'Máximo 20'),
  status: z.enum(SPOOL_STATUSES),
});

export type SpoolFormData = z.infer<typeof spoolFormSchema>;
