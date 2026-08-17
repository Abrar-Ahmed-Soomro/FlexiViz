import * as duckdb from 'duckdb';
import { env } from '@/lib/env';

const DUCKDB_PATH = env.DUCKDB_PATH;

declare global {
  var flexivizDb: duckdb.Database | undefined;
}

let db: duckdb.Database | undefined;

export async function getDuckDB(): Promise<duckdb.Database> {
  if (!db) {
    // Ensure data directory exists
    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.dirname(DUCKDB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new duckdb.Database(DUCKDB_PATH);

    // Warm up connection
    await new Promise<void>((resolve, reject) => {
      db!.all('SELECT 1', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
  return db;
}

export async function getDuckDBConnection(): Promise<duckdb.Connection> {
  const database = await getDuckDB();
  return database.connect();
}

export async function queryDuckDB<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const conn = await getDuckDBConnection();
  return new Promise((resolve, reject) => {
    conn.all(sql, (err, rows) => {
      if (err) {
        conn.close();
        reject(err);
      } else {
        conn.close();
        resolve(rows as T[]);
      }
    });
  });
}

export async function executeDuckDB(sql: string): Promise<void> {
  const conn = await getDuckDBConnection();
  return new Promise((resolve, reject) => {
    conn.run(sql, (err) => {
      conn.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

export function sanitizeTableName(name: string): string {
  // Only allow alphanumeric and underscores
  return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

export function generateTableName(userId: string, fileName: string): string {
  const sanitized = sanitizeTableName(fileName.replace(/\.[^/.]+$/, ''));
  return `user_${userId}_${sanitized}`;
}

export function inferDuckDBType(sampleValues: unknown[]): string {
  const nonNullValues = sampleValues.filter(
    v => v !== null && v !== undefined && v !== '' && String(v).trim() !== ''
  );

  if (nonNullValues.length === 0) return 'VARCHAR';

  const checkValues = nonNullValues.slice(0, 100);
  let allNumbers = true;
  let allDates = true;

  for (const v of checkValues) {
    const str = String(v).trim();

    if (str === '' || isNaN(Number(str))) {
      allNumbers = false;
    }

    const looksLikeDate =
      /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str) ||
      /^[A-Z][a-z]{2,8} \d{1,2}, \d{4}/.test(str) ||
      str.includes('T') ||
      /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(str);

    if (!looksLikeDate || isNaN(Date.parse(str))) {
      allDates = false;
    }
  }

  if (allNumbers) {
    const allIntegers = checkValues.every(v => Number.isInteger(Number(String(v).trim())));
    if (allIntegers) return 'BIGINT';
    return 'DOUBLE';
  }

  if (allDates) return 'TIMESTAMP';

  return 'VARCHAR';
}