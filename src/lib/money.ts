/** Convierte "12,99" o "12.99" a céntimos (1299). Devuelve null si está vacío o no es válido. */
export function parseEurosToCents(input: string): number | null {
  const value = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Formatea céntimos como "12,99 €". */
export function formatCents(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

/** Convierte céntimos a texto de formulario: 29900 -> "299,00". */
export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

/** Formatea céntimos con signo explícito: "+3,50 €", "-1,20 €" o "0,00 €". */
export function formatSignedCents(cents: number): string {
  if (cents > 0) return `+${formatCents(cents)}`;
  if (cents < 0) return `-${formatCents(-cents)}`;
  return formatCents(0);
}
