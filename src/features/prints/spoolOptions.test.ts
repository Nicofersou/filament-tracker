import type { Spool } from '../spools/types';
import { buildSpoolOptions } from './spoolOptions';

function makeSpool(overrides: Partial<Spool> & { id: number }): Spool {
  return {
    material: 'PLA',
    colorName: 'Negro',
    colorHex: null,
    brand: null,
    initialWeightG: 1000,
    remainingWeightG: 1000,
    priceCents: 2000,
    status: 'sealed',
    openedAt: null,
    finishedAt: null,
    notes: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('buildSpoolOptions', () => {
  it('excluye las bobinas gastadas', () => {
    const options = buildSpoolOptions([
      makeSpool({ id: 1, status: 'empty' }),
      makeSpool({ id: 2 }),
    ]);
    expect(options.map((o) => o.spoolId)).toEqual([2]);
  });

  it('agrupa las bobinas sin abrir equivalentes usando la de menor id', () => {
    const options = buildSpoolOptions([
      makeSpool({ id: 3 }),
      makeSpool({ id: 1 }),
      makeSpool({ id: 2 }),
    ]);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({ spoolId: 1, sealedCount: 3, status: 'sealed' });
  });

  it('no agrupa bobinas sin abrir con distinto precio', () => {
    const options = buildSpoolOptions([
      makeSpool({ id: 1, priceCents: 2000 }),
      makeSpool({ id: 2, priceCents: 1500 }),
    ]);
    expect(options).toHaveLength(2);
  });

  it('muestra cada bobina en uso por separado y antes que las sin abrir', () => {
    const options = buildSpoolOptions([
      makeSpool({ id: 1 }),
      makeSpool({ id: 2, status: 'in_use', remainingWeightG: 640 }),
      makeSpool({ id: 3, status: 'in_use', remainingWeightG: 300 }),
    ]);
    expect(options.map((o) => [o.spoolId, o.status])).toEqual([
      [2, 'in_use'],
      [3, 'in_use'],
      [1, 'sealed'],
    ]);
    expect(options[0]).toMatchObject({ remainingWeightG: 640, sealedCount: 0 });
  });

  it('conserva el precio y el peso inicial para calcular el coste', () => {
    const [option] = buildSpoolOptions([makeSpool({ id: 1 })]);
    expect(option).toMatchObject({ priceCents: 2000, initialWeightG: 1000 });
  });
});
