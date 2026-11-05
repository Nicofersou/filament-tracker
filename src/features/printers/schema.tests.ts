import { printerFormSchema, toNewPrinter } from './schema';

const valid = {
  brand: 'Anycubic',
  model: 'Kobra 4 Combo',
  powerW: '100',
  dryerPowerW: '200',
  price: '299,00',
  lifetimeHours: '3000',
};
const onlyRequired = { ...valid, powerW: '', dryerPowerW: '', price: '', lifetimeHours: '' };

describe('printerFormSchema', () => {
  it('acepta un formulario completo y otro con solo marca y modelo', () => {
    expect(printerFormSchema.safeParse(valid).success).toBe(true);
    expect(printerFormSchema.safeParse(onlyRequired).success).toBe(true);
  });

  it.each([
    ['sin marca', { brand: '  ' }],
    ['sin modelo', { model: '' }],
    ['consumo decimal', { powerW: '10.5' }],
    ['consumo cero', { powerW: '0' }],
    ['consumo exagerado', { powerW: '99999' }],
    ['consumo de secado exagerado', { dryerPowerW: '99999' }],
    ['consumo de secado decimal', { dryerPowerW: '20,5' }],
    ['precio inválido', { price: '12,999' }],
    ['vida útil cero', { lifetimeHours: '0' }],
  ])('rechaza %s', (_name, override) => {
    expect(printerFormSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });

  it('muestra el mensaje propio del campo', () => {
    const result = printerFormSchema.safeParse({ ...valid, price: 'abc' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Precio no válido (ej. 299,00)');
    }
  });
});

describe('toNewPrinter', () => {
  it('convierte el formulario en datos de la impresora', () => {
    expect(toNewPrinter(printerFormSchema.parse(valid))).toEqual({
      brand: 'Anycubic',
      model: 'Kobra 4 Combo',
      powerW: 100,
      dryerPowerW: 200,
      costCents: 29900,
      lifetimeHours: 3000,
    });
  });

  it('deja a null los campos opcionales vacíos', () => {
    expect(toNewPrinter(printerFormSchema.parse(onlyRequired))).toEqual({
      brand: 'Anycubic',
      model: 'Kobra 4 Combo',
      powerW: null,
      dryerPowerW: null,
      costCents: null,
      lifetimeHours: null,
    });
  });
});
