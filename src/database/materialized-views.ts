import { getDb } from './db.js';

export async function refreshMaterializedViews(concurrent = true): Promise<void> {
  const db = await getDb();
  const refreshClause = concurrent ? 'REFRESH MATERIALIZED VIEW CONCURRENTLY' : 'REFRESH MATERIALIZED VIEW';

  try {
    // Refresh student summary view
    await db.exec(`${refreshClause} mv_student_course_attendance;`);
    // Refresh session statistics view
    await db.exec(`${refreshClause} mv_session_attendance_stats;`);
    console.log(`[Analytics] Materialized views refreshed successfully (${concurrent ? 'concurrent' : 'standard'}).`);
  } catch (err: any) {
    // Fallback to non-concurrent if concurrent is not supported or if initial population requires it
    if (concurrent && (err.message?.includes('not populated') || err.message?.includes('CONCURRENTLY'))) {
      console.warn('[Analytics] Concurrent refresh failed, attempting standard refresh fallback...');
      await db.exec('REFRESH MATERIALIZED VIEW mv_student_course_attendance;');
      await db.exec('REFRESH MATERIALIZED VIEW mv_session_attendance_stats;');
      console.log('[Analytics] Standard materialized view refresh complete.');
    } else {
      console.error('[Analytics] Error refreshing materialized views:', err.message);
      throw err;
    }
  }
}
