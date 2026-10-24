import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';

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
  multipleStatements: true,
});

try {
  const [columns] = await connection.query('SHOW COLUMNS FROM health_assets');
  const names = new Set(columns.map((column) => column.Field));
  if (!names.has('useful_life_months')) {
    await connection.query(
      'ALTER TABLE health_assets ADD COLUMN useful_life_months SMALLINT UNSIGNED NULL AFTER acquisition_date'
    );
  }
  if (!names.has('useful_life_end_date')) {
    await connection.query(
      'ALTER TABLE health_assets ADD COLUMN useful_life_end_date DATE NULL AFTER useful_life_months'
    );
  }
  const schema = await readFile(
    new URL('../database/asset-operations.sql', import.meta.url),
    'utf8'
  );
  const [existingTables] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.tables
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN (
        'health_asset_transfers',
        'health_asset_verifications',
        'health_asset_lifespan_extensions'
      )`
  );
  const tableNames = new Set(existingTables.map((table) => table.TABLE_NAME));
  const statements = schema
    .split(/;\s*(?=CREATE TABLE IF NOT EXISTS)/i)
    .map((statement) => statement.trim())
    .filter(Boolean);
  for (const statement of statements) {
    const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
    if (!tableName) {
      throw new Error('Asset operations schema contains an invalid table statement.');
    }
    if (!tableNames.has(tableName)) {
      await connection.query(statement);
    }
  }
  console.log('Asset transfer, verification, and lifespan schemas are ready.');
} catch (error) {
  console.error(`Asset operations migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
