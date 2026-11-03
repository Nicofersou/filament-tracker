import { energyPriceSchema } from './schema';

describe('energyPriceSchema', () => {
  it.each([
    ['0,15', 0.15],
    ['0.1534', 0.1534],
    ['1', 1],
    [' 0,2 ', 0.2],
    ['', null],
  ])('convierte "%s" en %s', (input, expected) => {
    expect(energyPriceSchema.parse(input)).toBe(expected);
  });

  it.each(['abc', '-1', '0,12345', '6', '1,2,3'])('rechaza "%s"', (input) => {
    expect(energyPriceSchema.safeParse(input).success).toBe(false);
  });
});
