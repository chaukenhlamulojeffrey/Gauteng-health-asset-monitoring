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
    `SHOW COLUMNS FROM app_users LIKE ?`,
    [column]
  );
  return rows.length > 0;
}

async function hasIndex(indexName) {
  const [rows] = await connection.query(
    `SHOW INDEX FROM app_users WHERE Key_name = ?`,
    [indexName]
  );
  return rows.length > 0;
}

try {
  if (!(await hasColumn('persal_number'))) {
    await connection.query(
      'ALTER TABLE app_users ADD COLUMN persal_number VARCHAR(8) NULL AFTER display_name'
    );
  }

  const [unassigned] = await connection.query(
    'SELECT COUNT(*) AS count FROM app_users WHERE persal_number IS NULL OR persal_number NOT REGEXP "^[0-9]{8}$"'
  );
  if (Number(unassigned[0].count) > 0) {
    throw new Error(
      `${unassigned[0].count} existing user account(s) need a verified 8-digit PERSAL number before migration can finish. Update those records, then rerun this command.`
    );
  }

  const [duplicates] = await connection.query(
    `SELECT persal_number FROM app_users
    GROUP BY persal_number HAVING COUNT(*) > 1 LIMIT 1`
  );
  if (duplicates.length > 0) {
    throw new Error(
      `PERSAL number ${duplicates[0].persal_number} is assigned to more than one account. Resolve the duplicate before migration.`
    );
  }

  const [emailColumns] = await connection.query(
    "SHOW COLUMNS FROM app_users LIKE 'email'"
  );
  if (emailColumns.length > 0 && emailColumns[0].Null !== 'YES') {
    await connection.query(
      'ALTER TABLE app_users MODIFY email VARCHAR(254) NULL'
    );
  }

  const [persalColumns] = await connection.query(
    "SHOW COLUMNS FROM app_users LIKE 'persal_number'"
  );
  if (persalColumns[0].Null !== 'NO') {
    await connection.query(
      'ALTER TABLE app_users MODIFY persal_number VARCHAR(8) NOT NULL'
    );
  }
  if (!(await hasIndex('uq_app_users_persal_number'))) {
    await connection.query(
      'ALTER TABLE app_users ADD UNIQUE KEY uq_app_users_persal_number (persal_number)'
    );
  }
  console.log('Staff PERSAL sign-in is ready.');
} catch (error) {
  console.error(`PERSAL sign-in migration failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await connection.end();
}
