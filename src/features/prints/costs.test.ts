import {
  calcDryingCostCents,
  calcEnergyCostCents,
  calcMaterialCostCents,
  calcPrintCost,
  calcWearCostCents,
} from './costs';

describe('calcMaterialCostCents', () => {
  it('calcula el coste proporcional a los gramos', () => {
    expect(calcMaterialCostCents({ grams: 100, priceCents: 2000, initialWeightG: 1000 })).toBe(200);
  });

  it('redondea a céntimos', () => {
    // 33 g * 1999 / 1000 = 65,967
    expect(calcMaterialCostCents({ grams: 33, priceCents: 1999, initialWeightG: 1000 })).toBe(66);
  });

  it('devuelve 0 si la bobina no tiene precio o los gramos son 0', () => {
    expect(calcMaterialCostCents({ grams: 100, priceCents: null, initialWeightG: 1000 })).toBe(0);
    expect(calcMaterialCostCents({ grams: 0, priceCents: 2000, initialWeightG: 1000 })).toBe(0);
  });
});

describe('calcEnergyCostCents', () => {
  it('calcula la electricidad y redondea 4,5 céntimos hacia arriba', () => {
    expect(calcEnergyCostCents(180, 100, 0.15)).toBe(5);
  });

  it('devuelve 0 si falta la potencia o el precio de la luz', () => {
    expect(calcEnergyCostCents(180, null, 0.15)).toBe(0);
    expect(calcEnergyCostCents(180, 100, null)).toBe(0);
  });

  it('devuelve 0 si la impresión no dura nada', () => {
    expect(calcEnergyCostCents(0, 100, 0.15)).toBe(0);
  });
});

describe('calcDryingCostCents', () => {
  it('calcula el coste eléctrico del secado', () => {
    // 200 W durante 3 h = 0,6 kWh * 0,15 €/kWh = 0,09 €
    expect(calcDryingCostCents(180, 200, 0.15)).toBe(9);
  });

  it('devuelve 0 si falta el consumo del secado o el precio de la luz', () => {
    expect(calcDryingCostCents(180, null, 0.15)).toBe(0);
    expect(calcDryingCostCents(180, 200, null)).toBe(0);
  });

  it('devuelve 0 si no hay tiempo de secado', () => {
    expect(calcDryingCostCents(0, 200, 0.15)).toBe(0);
  });
});

describe('calcWearCostCents', () => {
  it('amortiza la impresora según las horas de uso', () => {
    expect(calcWearCostCents(180, 30000, 3000)).toBe(30);
  });

  it('devuelve 0 si faltan datos o la vida útil no es válida', () => {
    expect(calcWearCostCents(180, null, 3000)).toBe(0);
    expect(calcWearCostCents(180, 30000, null)).toBe(0);
    expect(calcWearCostCents(180, 30000, 0)).toBe(0);
  });
});

describe('calcPrintCost', () => {
  const printer = { powerW: 100, costCents: 30000, lifetimeHours: 3000 };
  const spool = { grams: 100, priceCents: 2000, initialWeightG: 1000 };

  it('suma material, electricidad y desgaste', () => {
    expect(
      calcPrintCost({ durationMin: 180, spools: [spool], printer, energyPricePerKwh: 0.15 }),
    ).toEqual({
      materialCents: 200,
      energyCents: 5,
      wearCents: 30,
      dryingCents: 0,
      totalCents: 235,
      missing: [],
    });
  });

  it('incluye el secado en el total', () => {
    expect(
      calcPrintCost({
        durationMin: 180,
        dryingMin: 180,
        spools: [spool],
        printer: { ...printer, dryerPowerW: 200 },
        energyPricePerKwh: 0.15,
      }),
    ).toEqual({
      materialCents: 200,
      energyCents: 5,
      wearCents: 30,
      dryingCents: 9,
      totalCents: 244,
      missing: [],
    });
  });

  it('avisa si hay secado pero no se conoce el consumo del módulo', () => {
    const result = calcPrintCost({
      durationMin: 180,
      dryingMin: 60,
      spools: [spool],
      printer,
      energyPricePerKwh: 0.15,
    });
    expect(result.dryingCents).toBe(0);
    expect(result.missing).toEqual(['dryerPower']);
  });

  it('suma el material de varias bobinas redondeando cada una', () => {
    const result = calcPrintCost({
      durationMin: 60,
      spools: [
        { grams: 33, priceCents: 1999, initialWeightG: 1000 },
        { grams: 33, priceCents: 1999, initialWeightG: 1000 },
      ],
      printer,
      energyPricePerKwh: 0.15,
    });
    expect(result.materialCents).toBe(132);
  });

  it('avisa de los parámetros que faltan y cuenta ese concepto como 0', () => {
    const result = calcPrintCost({
      durationMin: 180,
      spools: [{ ...spool, priceCents: null }],
      printer: { powerW: null, costCents: null, lifetimeHours: null },
      energyPricePerKwh: null,
    });
    expect(result.totalCents).toBe(0);
    expect(result.missing).toEqual(['spoolPrice', 'energyPrice', 'printerPower', 'printerCost']);
  });
});
