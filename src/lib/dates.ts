/** Formatea una fecha ISO como "27/10/2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES');
}
