/** @jest-environment node */
import { migrateDbIfNeeded } from '../../db/migrations';
import { createTestDb } from '../../test-utils/sqlite';
import { getSettings, setEnergyPrice } from './repository';

describe('settings repository', () => {
  it('empieza sin precio de la luz y permite fijarlo y borrarlo', async () => {
    const db = createTestDb();
    await migrateDbIfNeeded(db);

    expect(await getSettings(db)).toEqual({ energyPricePerKwh: null });

    await setEnergyPrice(db, 0.1534);
    expect(await getSettings(db)).toEqual({ energyPricePerKwh: 0.1534 });

    await setEnergyPrice(db, null);
    expect(await getSettings(db)).toEqual({ energyPricePerKwh: null });
  });
});
