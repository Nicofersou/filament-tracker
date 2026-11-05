/** Formatea una fecha ISO como "27/10/2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES');
}

/** Formatea una fecha para el campo de texto del formulario: "05/11/2026". */
export function formatDateInput(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

/**
 * Interpreta "dd/mm/aaaa" y devuelve esa fecha a las 12:00 locales (el mediodía evita
 * que un cambio de zona horaria mueva el día). Devuelve null si no es una fecha real.
 */
export function parseDateInput(text: string): Date | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Formatea minutos como "45 min", "2 h" o "2 h 30 min". */
export function formatDuration(totalMin: number): string {
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}
