import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
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
  multipleStatements: false,
});

try {
  const [columns] = await connection.query(
    "SHOW COLUMNS FROM health_assets LIKE 'custodian_name'"
  );
  if (columns.length === 0) {
    throw new Error('health_assets.custodian_name was not found.');
  }
  const migration = await readFile(
    fileURLToPath(new URL('../database/auth-disposal.sql', import.meta.url)),
    'utf8'
  );
  const statements = migration
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (statement.startsWith('ALTER TABLE health_assets')) {
      if (columns[0].Null === 'YES') continue;
    }
    await connection.query(statement);
  }
  console.log('Authentication and disposal tables are ready.');
} catch (error) {
  console.error(`Database migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
