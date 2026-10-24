import assert from 'node:assert/strict';
import test from 'node:test';
import { createAssetSearchFilter } from '../lib/asset-search.mjs';

test('asset tags use exact indexed identifier lookup', () => {
  assert.deepEqual(createAssetSearchFilter(' TDHS-00000 '), {
    sql: '(asset_tag = ? OR serial_imei_number = ? OR persal_number = ?)',
    values: ['TDHS-00000', 'TDHS-00000', 'TDHS-00000'],
  });
});

test('numeric device identifiers use exact indexed lookup', () => {
  assert.deepEqual(createAssetSearchFilter('490154203237518'), {
    sql: '(asset_tag = ? OR serial_imei_number = ? OR persal_number = ?)',
    values: ['490154203237518', '490154203237518', '490154203237518'],
  });
});

test('ordinary words use indexed full-text prefix matching', () => {
  assert.deepEqual(createAssetSearchFilter('patient monitor'), {
    sql: `MATCH (asset_tag, asset_name, facility_name, location,
        room_number, custodian_name, persal_number, serial_imei_number,
        district, sub_district) AGAINST (? IN BOOLEAN MODE)`,
    values: ['+patient* +monitor*'],
  });
});

test('short search terms retain substring matching', () => {
  assert.deepEqual(createAssetSearchFilter('ICU'), {
    sql: `CONCAT_WS(' ', asset_tag, asset_name, facility_name, location,
      room_number, custodian_name, persal_number, serial_imei_number,
      district, sub_district) LIKE ? ESCAPE '!'`,
    values: ['%ICU%'],
  });
});

test('LIKE wildcards in ordinary search are escaped', () => {
  const filter = createAssetSearchFilter('room_10%');
  assert.equal(filter.values[0], '%room!_10!%%');
});
