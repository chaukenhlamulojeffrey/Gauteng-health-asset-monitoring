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
  const [tables] = await connection.query('SHOW TABLES LIKE ?', [
    'health_asset_workflow_evidence',
  ]);
  if (tables.length > 0) {
    console.log('Asset workflow evidence schema is already ready.');
  } else {
    const schema = await readFile(
      new URL('../database/asset-workflow-evidence.sql', import.meta.url),
      'utf8'
    );
    await connection.query(schema);
    console.log('Asset workflow evidence schema is ready.');
  }
} catch (error) {
  console.error(`Asset workflow evidence migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
