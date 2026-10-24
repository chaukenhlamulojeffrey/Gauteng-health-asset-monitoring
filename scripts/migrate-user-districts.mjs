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

async function hasColumn(column) {
  const [rows] = await connection.query(
    'SHOW COLUMNS FROM app_users LIKE ?',
    [column]
  );
  return rows.length > 0;
}

try {
  if (!(await hasColumn('surname'))) {
    await connection.query(
      'ALTER TABLE app_users ADD COLUMN surname VARCHAR(100) NULL AFTER display_name'
    );
  }
  if (!(await hasColumn('district'))) {
    await connection.query(
      'ALTER TABLE app_users ADD COLUMN district VARCHAR(32) NULL AFTER persal_number'
    );
  }
  console.log(
    'User surname and district columns are ready. Assign a valid district to each existing non-Super Administrator account in User management.'
  );
} catch (error) {
  console.error(`User district migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
