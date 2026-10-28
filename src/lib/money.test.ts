import { formatCents, parseEurosToCents } from './money';

describe('parseEurosToCents', () => {
  it.each([
    ['12,99', 1299],
    ['12.99', 1299],
    ['12', 1200],
    ['0,5', 50],
    ['0.05', 5],
    [' 7,10 ', 710],
  ])('convierte "%s" a %i céntimos', (input, expected) => {
    expect(parseEurosToCents(input)).toBe(expected);
  });

  it.each(['', 'abc', '-3', '1,234', '1.2.3', '12,'])('devuelve null para "%s"', (input) => {
    expect(parseEurosToCents(input)).toBeNull();
  });
});

describe('formatCents', () => {
  it.each([
    [1299, '12,99 €'],
    [5, '0,05 €'],
    [0, '0,00 €'],
  ])('formatea %i céntimos como "%s"', (cents, expected) => {
    expect(formatCents(cents)).toBe(expected);
  });
});
