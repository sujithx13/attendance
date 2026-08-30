import bcrypt from 'bcryptjs';
import { getDb } from './db.js';
import { runMigrations } from './migrate.js';
import { refreshMaterializedViews } from './materialized-views.js';

export async function wipeFakeData(): Promise<void> {
  console.log('====================================================');
  console.log('[Clean Data] Starting complete removal of fake data...');
  console.log('====================================================');

  await runMigrations();
  const db = await getDb();

  // 1. Clear Attendance & Telemetry Audit Tables
  console.log('[Clean Data] Removing attendance records & security audit logs...');
  await db.query('DELETE FROM attendance_records;');
  await db.query('DELETE FROM security_violations;');
  await db.query('DELETE FROM sessions;');

  // 2. Clear Timetable Slots & Templates
  console.log('[Clean Data] Removing timetable slots & templates...');
  await db.query('DELETE FROM timetable_template_slots;');
  await db.query('DELETE FROM timetable_templates;');
  await db.query('DELETE FROM timetable_slots;');

  // 3. Clear Batches & Cohort Members
  console.log('[Clean Data] Removing batches & cohort enrollments...');
  await db.query('DELETE FROM batch_members;');
  await db.query('DELETE FROM batch_professors;');
  await db.query('DELETE FROM batches;');

  // 4. Clear Announcements & Courses
  console.log('[Clean Data] Removing courses, enrollments & announcements...');
  await db.query('DELETE FROM enrollments;');
  await db.query('DELETE FROM courses;');
  await db.query('DELETE FROM announcements;');

  // 5. Clear Fake Users (Keep only the clean Master Administrator)
  console.log('[Clean Data] Removing fake student & professor accounts...');
  // First unlink any foreign key references
  await db.query('UPDATE users SET department_id = NULL;');
  await db.query("DELETE FROM users WHERE role != 'ADMIN' OR email != 'admin@university.edu';");

  // Ensure clean admin account exists
  const adminPasswordHash = await bcrypt.hash('password123', 10);
  await db.query(
    `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, department_id, year_of_study)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         role = 'ADMIN',
         full_name = 'System Administrator',
         department_id = NULL,
         year_of_study = NULL`,
    ['usr_admin', 'admin@university.edu', adminPasswordHash, 'ADMIN', 'System Administrator', null, null, null]
  );

  // 6. Clear Departments
  console.log('[Clean Data] Removing fake departments...');
  await db.query('DELETE FROM departments;');

  // 7. Refresh Materialized Views
  console.log('[Clean Data] Refreshing analytical materialized views...');
  await refreshMaterializedViews(true);

  console.log('====================================================');
  console.log('[Clean Data] All fake data, departments, batches, and demo accounts successfully wiped!');
  console.log('Master Administrator account ready:');
  console.log('  Email:    admin@university.edu');
  console.log('  Password: password123');
  console.log('====================================================');
}

// Allow direct execution
if (process.argv[1]?.includes('wipe-fake-data')) {
  wipeFakeData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Clean Data Error]', err);
      process.exit(1);
    });
}
