import { z } from 'zod';
import { parseDateInput } from '../../lib/dates';
import { optionalPattern } from '../../lib/validation';
import type { PrintResult } from './types';

const MAX_DURATION_MIN = 7 * 24 * 60;
const MAX_GRAMS = 50000;

export interface DryingValues {
  enabled: boolean;
  /** 'same': misma duración que la impresión. 'manual': los minutos que se indiquen. */
  mode: 'same' | 'manual';
  manualMinutes: string;
}

export interface PrintFormValues {
  name: string;
  date: string; // dd/mm/aaaa
  hours: string;
  minutes: string;
  notes: string;
  result: PrintResult;
  printerId: number | null;
  /** Gramos escritos para cada bobina seleccionada (clave: id de la bobina). */
  grams: Record<number, string>;
  drying: DryingValues;
}

export interface ParsedPrintForm {
  name: string;
  printedAt: string; // fecha ISO
  durationMin: number;
  dryingMin: number;
  result: PrintResult;
  printerId: number;
  notes: string | null;
  spools: { spoolId: number; grams: number }[];
}

export type PrintFormValidation =
  { ok: true; data: ParsedPrintForm } | { ok: false; errors: Record<string, string> };

/** "12,5" -> 12.5. Devuelve null si no es un número positivo razonable (máx. 2 decimales). */
export function parseGrams(text: string): number | null {
  const value = text.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const grams = Number(value);
  return grams > 0 && grams <= MAX_GRAMS ? grams : null;
}

function endOfToday(): Date {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
}

const textSchema = z.object({
  name: z.string().trim().min(1, 'Indica el nombre de la pieza').max(80, 'Máximo 80 caracteres'),
  date: z
    .string()
    .trim()
    .refine((value) => parseDateInput(value) !== null, 'Fecha no válida (dd/mm/aaaa)')
    .refine((value) => {
      const date = parseDateInput(value);
      return date === null || date <= endOfToday();
    }, 'La fecha no puede ser futura'),
  hours: optionalPattern(/^\d+$/, 'Horas: usa un número entero'),
  minutes: optionalPattern(/^\d+$/, 'Minutos: usa un número entero'),
  notes: z.string().trim().max(500, 'Máximo 500 caracteres'),
});

/**
 * Versión tolerante para el coste en vivo: lo que no se entiende cuenta como 0
 * en lugar de dar error.
 */
export function parsePreview(values: Pick<PrintFormValues, 'hours' | 'minutes' | 'drying'>): {
  durationMin: number;
  dryingMin: number;
} {
  const asInt = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text) : 0);
  const durationMin = asInt(values.hours) * 60 + asInt(values.minutes);

  let dryingMin = 0;
  if (values.drying.enabled) {
    dryingMin = values.drying.mode === 'same' ? durationMin : asInt(values.drying.manualMinutes);
  }
  return { durationMin, dryingMin };
}

export function validatePrintForm(values: PrintFormValues): PrintFormValidation {
  const errors: Record<string, string> = {};

  const parsedText = textSchema.safeParse(values);
  if (!parsedText.success) {
    for (const issue of parsedText.error.issues) {
      const key = String(issue.path[0]);
      if (!(key in errors)) {
        errors[key] = issue.message;
      }
    }
  }

  let durationMin = 0;
  if (!errors.hours && !errors.minutes) {
    const hours = values.hours.trim() === '' ? 0 : Number(values.hours);
    const minutes = values.minutes.trim() === '' ? 0 : Number(values.minutes);
    if (minutes > 59) {
      errors.minutes = 'Minutos: entre 0 y 59';
    } else {
      durationMin = hours * 60 + minutes;
      if (durationMin <= 0) {
        errors.duration = 'Indica la duración de la impresión';
      } else if (durationMin > MAX_DURATION_MIN) {
        errors.duration = 'La duración máxima es de 7 días';
      }
    }
  }

  if (values.printerId === null) {
    errors.printer = 'Elige una impresora';
  }

  const spools: { spoolId: number; grams: number }[] = [];
  const selectedIds = Object.keys(values.grams).map(Number);
  if (selectedIds.length === 0) {
    errors.spools = 'Elige al menos una bobina';
  }
  for (const spoolId of selectedIds) {
    const grams = parseGrams(values.grams[spoolId] ?? '');
    if (grams === null) {
      errors[`grams-${spoolId}`] = 'Gramos no válidos (ej. 12,5)';
    } else {
      spools.push({ spoolId, grams });
    }
  }

  let dryingMin = 0;
  if (values.drying.enabled) {
    if (values.drying.mode === 'same') {
      dryingMin = durationMin;
    } else {
      const text = values.drying.manualMinutes.trim();
      const minutes = /^\d+$/.test(text) ? Number(text) : 0;
      if (minutes <= 0 || minutes > MAX_DURATION_MIN) {
        errors.drying = 'Indica los minutos de secado (entre 1 y 10080)';
      } else {
        dryingMin = minutes;
      }
    }
  }

  const printerId = values.printerId;
  const date = parseDateInput(values.date);
  if (Object.keys(errors).length > 0 || printerId === null || date === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name: values.name.trim(),
      printedAt: date.toISOString(),
      durationMin,
      dryingMin,
      result: values.result,
      printerId,
      notes: values.notes.trim() === '' ? null : values.notes.trim(),
      spools,
    },
  };
}
