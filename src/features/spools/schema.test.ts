import { spoolFormSchema } from './schema';

const valid = {
  material: 'PLA',
  colorName: 'Negro',
  colorHex: '',
  brand: '',
  price: '',
  quantity: '1',
  status: 'sealed',
};

describe('spoolFormSchema', () => {
  it('acepta un formulario válido y convierte la cantidad a número', () => {
    const result = spoolFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
    }
  });

  it('recorta los espacios del nombre del color', () => {
    const result = spoolFormSchema.safeParse({ ...valid, colorName: '  Negro  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.colorName).toBe('Negro');
    }
  });

  it.each([
    ['color vacío', { colorName: '   ' }],
    ['hex inválido', { colorHex: 'rojo' }],
    ['precio con tres decimales', { price: '12,999' }],
    ['cantidad 0', { quantity: '0' }],
    ['cantidad por encima del máximo', { quantity: '21' }],
    ['cantidad decimal', { quantity: '1.5' }],
    ['cantidad vacía', { quantity: '' }],
    ['material desconocido', { material: 'Madera' }],
    ['estado desconocido', { status: 'roto' }],
  ])('rechaza %s', (_name, override) => {
    expect(spoolFormSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});
