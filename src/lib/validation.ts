import { z } from 'zod';

/** Texto opcional que, si no está vacío, debe cumplir el patrón (con mensaje propio). */
export function optionalPattern(pattern: RegExp, message: string) {
  return z
    .string()
    .trim()
    .refine((value) => value === '' || pattern.test(value), message);
}
