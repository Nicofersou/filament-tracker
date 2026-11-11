import { calcProfitCents, summarizeSales } from './profit';

describe('calcProfitCents', () => {
  it('resta comisiones y coste al precio de venta', () => {
    expect(calcProfitCents(1500, 100, 235)).toBe(1165);
  });

  it('puede salir negativo si se vende por debajo del coste', () => {
    expect(calcProfitCents(500, 0, 1000)).toBe(-500);
  });

  it('devuelve null si no hay venta', () => {
    expect(calcProfitCents(null, 0, 235)).toBeNull();
  });
});

describe('summarizeSales', () => {
  it('suma solo las impresiones vendidas', () => {
    expect(
      summarizeSales([
        { salePriceCents: 1500, profitCents: 1165 },
        { salePriceCents: null, profitCents: null },
        { salePriceCents: 800, profitCents: -50 },
      ]),
    ).toEqual({ soldCount: 2, revenueCents: 2300, profitCents: 1115 });
  });

  it('con una lista vacía todo es cero', () => {
    expect(summarizeSales([])).toEqual({ soldCount: 0, revenueCents: 0, profitCents: 0 });
  });
});
