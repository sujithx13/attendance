import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { ENV } from '../config/env.js';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface DbQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(sql: string, params?: any[]): Promise<DbQueryResult<T>>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
  transaction?<T>(work: (client: DbClient) => Promise<T>): Promise<T>;
}

let dbInstance: DbClient | null = null;
const transactions = new AsyncLocalStorage<{ client: DbClient; committed: Array<() => void> }>();

export async function withTransaction<T>(work: () => Promise<T>): Promise<T> {
  if (transactions.getStore()) return work();
  const db = await getDb();
  const committed: Array<() => void> = [];
  const result = await db.transaction!(client => transactions.run({ client, committed }, work));
  for (const notify of committed) { try { notify(); } catch (error) { console.error('[Notification]', error); } }
  return result;
}

export function afterCommit(notify: () => void): void {
  const context = transactions.getStore();
  if (context) context.committed.push(notify);
  else notify();
}

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

  async transaction<T>(work: (client: DbClient) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const client: DbClient = {
        query: async (sql, params) => { const r = await connection.query(sql, params); return { rows: r.rows, rowCount: r.rowCount ?? 0 }; },
        exec: async sql => { await connection.query(sql); },
        close: async () => {}
      };
      const result = await work(client);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally { connection.release(); }
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
      rowCount: res.affectedRows ?? res.rows?.length ?? 0
    };
  }

  async exec(sql: string): Promise<void> {
    await this.pglite.exec(sql);
  }

  async close(): Promise<void> {
    await this.pglite.close();
  }

  async transaction<T>(work: (client: DbClient) => Promise<T>): Promise<T> {
    return this.pglite.transaction(async tx => work({
      query: async (sql, params) => { const r = await tx.query(sql, params); return { rows: r.rows as any[], rowCount: r.affectedRows ?? r.rows.length }; },
      exec: async sql => { await tx.exec(sql); },
      close: async () => {}
    }));
  }
}

export async function getDb(): Promise<DbClient> {
  const active = transactions.getStore();
  if (active) return active.client;
  if (dbInstance) {
    return dbInstance;
  }

  if (ENV.NODE_ENV !== 'test' && ENV.DATABASE_URL && ENV.DATABASE_URL.trim() !== '') {
    console.log('[Database] Connecting to external PostgreSQL database...');
    dbInstance = new PgPoolClient(ENV.DATABASE_URL);
  } else {
    const dataDir = ENV.NODE_ENV === 'test' ? undefined : path.resolve(process.cwd(), 'data', 'attendance.db');
    console.log(`[Database] Using embedded PostgreSQL 16 (PGlite) at: ${dataDir || 'isolated in-memory test database'}`);
    dbInstance = new PGliteClient(dataDir);
  }

  return dbInstance;
}
