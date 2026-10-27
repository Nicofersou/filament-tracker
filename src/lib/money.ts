/** Convierte "12,99" o "12.99" a céntimos (1299). Devuelve null si está vacío o no es válido. */
export function parseEurosToCents(input: string): number | null {
  const value = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
