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

try {
  const [columns] = await connection.query(
    "SHOW COLUMNS FROM app_users LIKE 'contact_number'"
  );
  if (columns.length === 0) {
    await connection.query(
      'ALTER TABLE app_users ADD COLUMN contact_number VARCHAR(30) NULL AFTER email'
    );
  }
  console.log(
    'User contact details are ready. Work email uses the existing email column.'
  );
} catch (error) {
  console.error(`User contact-details migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
