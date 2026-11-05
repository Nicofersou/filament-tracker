import { formatDateInput } from '../../lib/dates';
import { parseGrams, parsePreview, validatePrintForm, type PrintFormValues } from './schema';

const base: PrintFormValues = {
  name: 'Soporte de auriculares',
  date: formatDateInput(new Date()),
  hours: '2',
  minutes: '30',
  notes: '',
  result: 'success',
  printerId: 1,
  grams: { 5: '45,5' },
  drying: { enabled: false, mode: 'same', manualMinutes: '' },
};

describe('parseGrams', () => {
  it.each([
    ['12', 12],
    ['12,5', 12.5],
    ['0.25', 0.25],
    [' 100 ', 100],
  ])('convierte "%s" en %s', (input, expected) => {
    expect(parseGrams(input)).toBe(expected);
  });

  it.each(['', '0', '-5', 'abc', '1,234', '50001'])('rechaza "%s"', (input) => {
    expect(parseGrams(input)).toBeNull();
  });
});

describe('validatePrintForm', () => {
  it('acepta un formulario válido y lo convierte', () => {
    const result = validatePrintForm(base);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toMatchObject({
        name: 'Soporte de auriculares',
        durationMin: 150,
        dryingMin: 0,
        result: 'success',
        printerId: 1,
        notes: null,
        spools: [{ spoolId: 5, grams: 45.5 }],
      });
      expect(new Date(result.data.printedAt).getDate()).toBe(new Date().getDate());
    }
  });

  it('el secado "igual que la impresión" usa la duración de la impresión', () => {
    const result = validatePrintForm({
      ...base,
      drying: { enabled: true, mode: 'same', manualMinutes: '' },
    });
    expect(result.ok && result.data.dryingMin).toBe(150);
  });

  it('el secado manual usa los minutos indicados', () => {
    const result = validatePrintForm({
      ...base,
      drying: { enabled: true, mode: 'manual', manualMinutes: '90' },
    });
    expect(result.ok && result.data.dryingMin).toBe(90);
  });

  it('guarda las notas recortadas y admite varias bobinas', () => {
    const result = validatePrintForm({
      ...base,
      notes: '  Primera capa lenta  ',
      grams: { 5: '10', 7: '20,25' },
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notes).toBe('Primera capa lenta');
      expect(result.data.spools).toEqual([
        { spoolId: 5, grams: 10 },
        { spoolId: 7, grams: 20.25 },
      ]);
    }
  });

  const dayAfterTomorrow = formatDateInput(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));

  const invalidCases: [string, Partial<PrintFormValues>, string][] = [
    ['nombre vacío', { name: '   ' }, 'name'],
    ['fecha inexistente', { date: '31/02/2026' }, 'date'],
    ['fecha futura', { date: dayAfterTomorrow }, 'date'],
    ['horas no numéricas', { hours: 'x' }, 'hours'],
    ['minutos por encima de 59', { minutes: '75' }, 'minutes'],
    ['duración vacía', { hours: '', minutes: '' }, 'duration'],
    ['duración exagerada', { hours: '999' }, 'duration'],
    ['sin impresora', { printerId: null }, 'printer'],
    ['sin bobinas', { grams: {} }, 'spools'],
    ['gramos vacíos', { grams: { 5: '' } }, 'grams-5'],
    ['gramos a cero', { grams: { 5: '0' } }, 'grams-5'],
    [
      'secado manual sin minutos',
      { drying: { enabled: true, mode: 'manual', manualMinutes: '' } },
      'drying',
    ],
    [
      'secado manual a cero',
      { drying: { enabled: true, mode: 'manual', manualMinutes: '0' } },
      'drying',
    ],
    ['notas demasiado largas', { notes: 'a'.repeat(501) }, 'notes'],
  ];

  it.each(invalidCases)('rechaza %s', (_name, override, errorKey) => {
    const result = validatePrintForm({ ...base, ...override });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors)).toContain(errorKey);
    }
  });
});

describe('parsePreview', () => {
  it('calcula la duración y el secado, y lo que no entiende cuenta como 0', () => {
    expect(
      parsePreview({
        hours: '1',
        minutes: '30',
        drying: { enabled: true, mode: 'same', manualMinutes: '' },
      }),
    ).toEqual({ durationMin: 90, dryingMin: 90 });

    expect(
      parsePreview({
        hours: 'x',
        minutes: '',
        drying: { enabled: true, mode: 'manual', manualMinutes: '45' },
      }),
    ).toEqual({ durationMin: 0, dryingMin: 45 });

    expect(
      parsePreview({
        hours: '2',
        minutes: '0',
        drying: { enabled: false, mode: 'same', manualMinutes: '' },
      }),
    ).toEqual({ durationMin: 120, dryingMin: 0 });
  });
});
