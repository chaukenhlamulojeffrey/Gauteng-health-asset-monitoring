import mysql, { type Pool } from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let pool: Pool | undefined;

export function getDbPool(): Pool {
  if (!pool) {
    const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL_CA } = process.env;
    if (!DB_HOST || !DB_USER || !DB_PASSWORD || !DB_NAME) {
      throw new Error('Database configuration is incomplete.');
    }

    const port = Number(DB_PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('DB_PORT must be a valid TCP port.');
    }

    const databaseCa = DB_SSL_CA ||
      readFileSync(resolve(process.cwd(), 'database/mysql-ca.pem'), 'utf8');

    pool = mysql.createPool({
      host: DB_HOST,
      port,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: process.env.NODE_ENV === 'production'
        ? {
            rejectUnauthorized: true,
            ca: databaseCa,
          }
        : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
      decimalNumbers: true,
    });
  }

  return pool;
}
