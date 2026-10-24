import mysql from 'mysql2/promise';

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing database settings: ${missing.join(', ')}`);
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function ensureColumn(table, column, definition) {
  const [columns] = await connection.query(
    `SHOW COLUMNS FROM \`${table}\` LIKE ?`,
    [column]
  );
  if (columns.length === 0) {
    await connection.query(
      `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`
    );
  }
}

async function ensureIndex(table, indexName, column) {
  const [indexes] = await connection.query(
    `SHOW INDEX FROM \`${table}\` WHERE Key_name = ?`,
    [indexName]
  );
  if (indexes.length === 0) {
    await connection.query(
      `CREATE INDEX \`${indexName}\` ON \`${table}\` (\`${column}\`)`
    );
  }
}

async function ensureSearchIndex() {
  const [indexes] = await connection.query(
    'SHOW INDEX FROM health_assets WHERE Key_name = ?',
    ['ft_health_assets_search']
  );
  if (indexes.length === 0) {
    await connection.query(
      `CREATE FULLTEXT INDEX ft_health_assets_search ON health_assets (
        asset_tag, asset_name, facility_name, location, room_number,
        custodian_name, persal_number, serial_imei_number, district, sub_district
      )`
    );
  }
}

async function enforcePersalLength(table, column) {
  const [invalidRows] = await connection.query(
    `SELECT COUNT(*) AS count FROM \`${table}\`
    WHERE \`${column}\` IS NOT NULL AND \`${column}\` NOT REGEXP '^[0-9]{8}$'`
  );
  if (Number(invalidRows[0].count) > 0) {
    throw new Error(
      `${table}.${column} contains values that are not exactly 8 digits; correct them before migrating.`
    );
  }
  await connection.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` VARCHAR(8) NULL`
  );
}

try {
  await ensureColumn('health_assets', 'persal_number', 'VARCHAR(8) NULL AFTER custodian_name');
  await ensureColumn('health_assets', 'serial_imei_number', 'VARCHAR(191) NULL AFTER persal_number');
  await ensureColumn(
    'health_asset_disposals',
    'former_custodian_persal_number',
    'VARCHAR(8) NULL AFTER former_custodian_name'
  );
  await enforcePersalLength('health_assets', 'persal_number');
  await enforcePersalLength(
    'health_asset_disposals',
    'former_custodian_persal_number'
  );
  await ensureIndex('health_assets', 'idx_health_assets_serial_imei_number', 'serial_imei_number');
  await ensureIndex('health_assets', 'idx_health_assets_persal_number', 'persal_number');
  await ensureSearchIndex();
  console.log('Asset identifier columns are ready.');
} catch (error) {
  console.error(`Asset identifier migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
