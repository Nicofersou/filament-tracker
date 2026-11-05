import { formatDateInput, formatDuration, parseDateInput } from './dates';

describe('parseDateInput', () => {
  it('interpreta una fecha válida (también con día o mes de una cifra)', () => {
    const date = parseDateInput('05/11/2026');
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(10);
    expect(date?.getDate()).toBe(5);

    expect(parseDateInput('5/1/2026')?.getDate()).toBe(5);
    expect(parseDateInput(' 29/02/2028 ')?.getDate()).toBe(29);
  });

  it.each([
    '',
    'abc',
    '31/02/2026',
    '32/01/2026',
    '29/02/2027',
    '5-11-2026',
    '1/1/26',
    '00/10/2026',
  ])('devuelve null para "%s"', (input) => {
    expect(parseDateInput(input)).toBeNull();
  });
});

describe('formatDateInput', () => {
  it('rellena con ceros y es el inverso de parseDateInput', () => {
    expect(formatDateInput(new Date(2026, 10, 5))).toBe('05/11/2026');
    const date = parseDateInput('09/03/2026');
    expect(date && formatDateInput(date)).toBe('09/03/2026');
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0 min'],
    [45, '45 min'],
    [60, '1 h'],
    [150, '2 h 30 min'],
  ])('formatea %i minutos como "%s"', (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});
