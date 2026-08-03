import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { ENV } from '../config/env.js';

export interface DbQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

let dbInstance: DbClient | null = null;

class PgPoolClient implements DbClient {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>> {
    const res = await this.pool.query(sql, params);
    return {
      rows: res.rows as T[],
      rowCount: res.rowCount ?? res.rows.length
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

class PGliteClient implements DbClient {
  private pglite: PGlite;

  constructor(dataDir?: string) {
    if (dataDir && !fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.pglite = new PGlite(dataDir);
  }

  async query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>> {
    const res = await this.pglite.query(sql, params);
    return {
      rows: (res.rows || []) as T[],
      rowCount: res.rows ? res.rows.length : 0
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }
}

export async function getDb(): Promise<DbClient> {
  if (dbInstance) {
    return dbInstance;
  }

  if (ENV.DATABASE_URL && ENV.DATABASE_URL.trim() !== '') {
    console.log('[Database] Connecting to external PostgreSQL database...');
    dbInstance = new PgPoolClient(ENV.DATABASE_URL);
  } else {
    const dataDir = path.resolve(process.cwd(), 'data', 'attendance.db');
    console.log(`[Database] Using embedded PostgreSQL 16 (PGlite) at: ${dataDir}`);
    dbInstance = new PGliteClient(dataDir);
  }

  return dbInstance;
}
