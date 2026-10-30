# Filament Tracker


App móvil para llevar el inventario de filamentos de una impresora 3D y, próximamente, el
registro de impresiones y su rentabilidad. Funciona 100 % en local en el móvil, sin cuentas ni servidor.

## Funcionalidades

- Inventario de bobinas por material y color.
- Estados de cada bobina: sin abrir, en uso y gastada.
- Resumen por color con las bobinas que quedan por empezar y las gastadas.
- Alta de varias bobinas iguales de golpe, con validación del formulario.

## Hoja de ruta

- [x] Fase 1: inventario de bobinas
- [ ] Fase 2: registro de impresiones y coste (material, electricidad, desgaste)
- [ ] Fase 3: ventas, margen y estadísticas de rentabilidad

## Stack

Expo (React Native) · TypeScript · Expo Router · SQLite (`expo-sqlite`) · Zod · Jest ·
ESLint + Prettier · GitHub Actions

## Cómo ejecutarlo

Requisitos: Node 24 y la app Expo Go en el móvil.

```bash
npm install
npx expo start
```

Escanea el QR con Expo Go (móvil y PC en la misma red).

Scripts útiles: `npm test`, `npm run lint`, `npm run format`.

## Decisiones de diseño

- **Local-first:** los datos viven en SQLite en el dispositivo; no hay backend.
- **Migraciones versionadas** con `PRAGMA user_version`; una migración ya aplicada no se edita.
- **Dinero en céntimos** (enteros) para evitar errores de redondeo.
- **Validación con Zod** en los formularios, más restricciones `CHECK` en la propia base de datos.
- **Consultas parametrizadas**: el texto del usuario nunca se concatena en el SQL.
- **Estructura por funcionalidades** (`src/features/...`), con pantallas finas y lógica separada.

## Capturas

<!-- Añade aquí capturas de pantalla desde docs/screenshots/ -->
