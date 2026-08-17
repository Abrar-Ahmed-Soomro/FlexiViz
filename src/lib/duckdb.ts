import type * as DuckDB from 'duckdb';
import { env } from '@/lib/env';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Load the `duckdb` package at runtime via Node's require. A static or dynamic
// import makes Turbopack statically trace into duckdb's node-pre-gyp
// configuration, which currently panics the bundler during `next build`.
// `serverExternalPackages` keeps it external so it is resolved at runtime.
const duckdb = require('duckdb') as typeof DuckDB;

const DUCKDB_PATH = env.DUCKDB_PATH;

declare global {
  var flexivizDuckDB: DuckDB.Database | undefined;
}

export async function getDuckDB(): Promise<DuckDB.Database> {
  if (!globalThis.flexivizDuckDB) {
    // Ensure data directory exists
    const fs = await import('fs');
    const path = await import('path');
    const dataDir = path.dirname(DUCKDB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    globalThis.flexivizDuckDB = new duckdb.Database(DUCKDB_PATH);

    // Warm up connection
    const conn = globalThis.flexivizDuckDB.connect();
    await new Promise<void>((resolve, reject) => {
      conn.all('SELECT 1', (err) => {
        conn.close();
        if (err) reject(err);
        else resolve();
      });
    });
  }
  return globalThis.flexivizDuckDB;
}

// Persist in-memory writes to disk so they survive a new Database instance
// (duckdb keeps uncommitted state in a per-instance WAL).
export async function checkpointDuckDB(): Promise<void> {
  const conn = await getDuckDBConnection();
  return new Promise((resolve, reject) => {
    conn.run('CHECKPOINT', (err) => {
      conn.close();
      if (err) reject(err);
      else resolve();
    });
  });
}

export async function getDuckDBConnection(): Promise<DuckDB.Connection> {
  const database = await getDuckDB();
  return database.connect();
}

// DuckDB returns BIGINT as JS BigInt, which neither JSON nor Mongoose handle.
// Convert BigInt values to Number for safe serialization/storage.
export function normalizeRows<T = Record<string, unknown>>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      const value = row[key];
      out[key] = typeof value === 'bigint' ? Number(value) : value;
    }
    return out as T;
  });
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
        resolve(normalizeRows<T>(rows as Record<string, unknown>[]));
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