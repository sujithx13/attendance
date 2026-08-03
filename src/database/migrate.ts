import fs from 'fs';
import path from 'path';
import { getDb } from './db.js';

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  console.log('[Migration] Starting database migrations...');

  const sqlDir = path.resolve(process.cwd(), 'sql');
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_attendance_and_audit.sql',
    '003_materialized_views.sql',
    '004_departments_batches_timetables.sql',
    '005_templates_announcements_crud.sql',
    '006_fix_courses_and_add_details.sql',
    '007_batch_professors.sql'
  ];

  for (const file of migrationFiles) {
    const filePath = path.join(sqlDir, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Migration] Warning: ${file} not found, skipping.`);
      continue;
    }

    console.log(`[Migration] Executing: ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    try {
      await db.exec(sql);
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
