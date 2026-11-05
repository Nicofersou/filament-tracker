import type { Material, Spool, SpoolStatus } from '../spools/types';

export interface SpoolOption {
  /** Bobina que se usará (la de menor id si hay varias iguales sin abrir). */
  spoolId: number;
  material: Material;
  colorName: string;
  colorHex: string | null;
  status: SpoolStatus;
  remainingWeightG: number;
  initialWeightG: number;
  priceCents: number | null;
  /** Cuántas bobinas sin abrir equivalentes agrupa esta opción (0 en una bobina en uso). */
  sealedCount: number;
}

function compareOptions(a: SpoolOption, b: SpoolOption): number {
  if (a.status !== b.status) return a.status === 'in_use' ? -1 : 1;
  return (
    a.material.localeCompare(b.material) ||
    a.colorName.localeCompare(b.colorName) ||
    a.spoolId - b.spoolId
  );
}

/** Opciones seleccionables al registrar una impresión: bobinas en uso y sin abrir. */
export function buildSpoolOptions(spools: Spool[]): SpoolOption[] {
  const options: SpoolOption[] = [];
  const sealedGroups = new Map<string, SpoolOption>();

  for (const spool of [...spools].sort((a, b) => a.id - b.id)) {
    if (spool.status === 'empty') continue;

    const option: SpoolOption = {
      spoolId: spool.id,
      material: spool.material,
      colorName: spool.colorName,
      colorHex: spool.colorHex,
      status: spool.status,
      remainingWeightG: spool.remainingWeightG,
      initialWeightG: spool.initialWeightG,
      priceCents: spool.priceCents,
      sealedCount: spool.status === 'sealed' ? 1 : 0,
    };

    if (spool.status === 'in_use') {
      options.push(option);
      continue;
    }

    const key = [
      spool.material,
      spool.colorName,
      spool.priceCents ?? '',
      spool.initialWeightG,
    ].join('|');
    const group = sealedGroups.get(key);
    if (group) {
      group.sealedCount += 1;
    } else {
      sealedGroups.set(key, option);
      options.push(option);
    }
  }

  return options.sort(compareOptions);
}
