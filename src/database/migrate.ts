import fs from 'fs';
import path from 'path';
import { getDb, withTransaction } from './db.js';

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  console.log('[Migration] Starting database migrations...');

  const sqlDir = path.resolve(process.cwd(), 'sql');
  const migrationFiles = fs.readdirSync(sqlDir).filter(file => /^\d+_.+\.sql$/.test(file)).sort();
  // Adopt installations that predate the ledger without replaying data backfills or dropping views.
  const legacy = await db.query(`SELECT to_regclass('schema_migrations') AS ledger, to_regclass('batch_professors') AS latest`);
  await db.exec('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)');
  if (!legacy.rows[0].ledger && legacy.rows[0].latest) {
    for (const file of migrationFiles.filter(name => name < '008')) {
      await db.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
    }
  }

  for (const file of migrationFiles) {
    const applied = await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (applied.rows.length) continue;
    const filePath = path.join(sqlDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Migration] Warning: ${file} not found, skipping.`);
      continue;
    }

    console.log(`[Migration] Executing: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      await withTransaction(async () => {
        const connection = await getDb();
        await connection.exec(sql);
        await connection.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      });
      console.log(`[Migration] Successfully applied: ${file}`);
    } catch (err: any) {
      console.error(`[Migration] Error applying ${file}:`, err.message);
      throw err;
    }
  }

  console.log('[Migration] All migrations completed successfully!');
}

// Allow direct execution: npx tsx src/database/migrate.ts
if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migration] Failed:', err);
      process.exit(1);
    });
}
