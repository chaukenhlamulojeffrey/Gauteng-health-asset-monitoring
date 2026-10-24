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
    "SHOW COLUMNS FROM app_users LIKE 'last_login_at'"
  );
  if (columns.length === 0) {
    await connection.query(
      'ALTER TABLE app_users ADD COLUMN last_login_at DATETIME NULL AFTER locked_until'
    );
  }
  await connection.query(
    `UPDATE app_users u
    LEFT JOIN (
      SELECT user_id, MAX(created_at) AS last_login_at
      FROM app_sessions
      GROUP BY user_id
    ) s ON s.user_id = u.id
    SET u.last_login_at = s.last_login_at
    WHERE u.last_login_at IS NULL`
  );
  console.log('Seven-day inactivity password reset schema is ready.');
} catch (error) {
  console.error(`Inactivity password reset migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
