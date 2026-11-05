import { z } from 'zod';
import { parseEurosToCents } from '../../lib/money';
import { optionalPattern } from '../../lib/validation';
import type { NewPrinter } from './types';

function optionalPositiveInt(max: number, label: string) {
  return optionalPattern(/^\d+$/, `${label}: usa un número entero`).refine(
    (value) => value === '' || (Number(value) > 0 && Number(value) <= max),
    `${label}: entre 1 y ${max}`,
  );
}

export const printerFormSchema = z.object({
  brand: z.string().trim().min(1, 'Indica la marca').max(40, 'Máximo 40 caracteres'),
  model: z.string().trim().min(1, 'Indica el modelo').max(40, 'Máximo 40 caracteres'),
  powerW: optionalPositiveInt(5000, 'Consumo'),
  dryerPowerW: optionalPositiveInt(3000, 'Consumo del secado'),
  price: optionalPattern(/^\d+([.,]\d{1,2})?$/, 'Precio no válido (ej. 299,00)'),
  lifetimeHours: optionalPositiveInt(100000, 'Vida útil'),
});

export type PrinterFormData = z.infer<typeof printerFormSchema>;

export function toNewPrinter(data: PrinterFormData): NewPrinter {
  return {
    brand: data.brand,
    model: data.model,
    powerW: data.powerW === '' ? null : Number(data.powerW),
    dryerPowerW: data.dryerPowerW === '' ? null : Number(data.dryerPowerW),
    costCents: parseEurosToCents(data.price),
    lifetimeHours: data.lifetimeHours === '' ? null : Number(data.lifetimeHours),
  };
}
