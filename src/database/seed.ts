import bcrypt from 'bcryptjs';
import { getDb } from './db.js';
import { runMigrations } from './migrate.js';
import { refreshMaterializedViews } from './materialized-views.js';
import { BiometricService } from '../services/biometric.service.js';

export async function seedDatabase(): Promise<void> {
  console.log('[Seed] Starting database seeding...');
  await runMigrations();

  const db = await getDb();
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // Generate deterministic mock embeddings for biometric testing
  const johnEmbedding = BiometricService.generateMockEmbedding(128);
  const sarahEmbedding = BiometricService.generateMockEmbedding(128);

  // 1. Departments
  console.log('[Seed] Inserting university departments...');
  const departments = [
    { id: 'dept_cse', code: 'CSE', name: 'Computer Science & Engineering' },
    { id: 'dept_it', code: 'IT', name: 'Information Technology' },
    { id: 'dept_mech', code: 'MECH', name: 'Mechanical Engineering' },
    { id: 'dept_ece', code: 'ECE', name: 'Electronics & Communication Engineering' }
  ];

  for (const d of departments) {
    const existing = await db.query(`SELECT id FROM departments WHERE code = $1`, [d.code]);
    if (existing.rows.length > 0 && existing.rows[0].id !== d.id) {
      await db.query(`UPDATE users SET department_id = NULL WHERE department_id = $1`, [existing.rows[0].id]);
      await db.query(`UPDATE batches SET department_id = NULL WHERE department_id = $1`, [existing.rows[0].id]);
      await db.query(`DELETE FROM departments WHERE id = $1`, [existing.rows[0].id]);
    }
    await db.query(
      `INSERT INTO departments (id, code, name) VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name`,
      [d.id, d.code, d.name]
    );
  }

  // 2. Users (Admin, Professors, Students with Department & Year of Study)
  console.log('[Seed] Inserting users...');
  const users = [
    {
      id: 'usr_admin',
      email: 'admin@university.edu',
      role: 'ADMIN',
      fullName: 'System Administrator',
      enrollmentId: null,
      departmentId: 'dept_cse',
      yearOfStudy: null,
      faceEmbedding: null
    },
    {
      id: 'usr_prof_alan',
      email: 'prof.alan@university.edu',
      role: 'PROFESSOR',
      fullName: 'Prof. Alan Turing',
      enrollmentId: 'FAC001',
      departmentId: 'dept_cse',
      yearOfStudy: null,
      faceEmbedding: null
    },
    {
      id: 'usr_prof_ada',
      email: 'prof.ada@university.edu',
      role: 'PROFESSOR',
      fullName: 'Prof. Ada Lovelace',
      enrollmentId: 'FAC002',
      departmentId: 'dept_it',
      yearOfStudy: null,
      faceEmbedding: null
    },
    {
      id: 'usr_student_john',
      email: 'student.john@university.edu',
      role: 'STUDENT',
      fullName: 'John Doe',
      enrollmentId: 'STU2026001',
      departmentId: 'dept_cse',
      yearOfStudy: 2,
      faceEmbedding: JSON.stringify(johnEmbedding)
    },
    {
      id: 'usr_student_sarah',
      email: 'student.sarah@university.edu',
      role: 'STUDENT',
      fullName: 'Sarah Connor',
      enrollmentId: 'STU2026002',
      departmentId: 'dept_it',
      yearOfStudy: 2,
      faceEmbedding: JSON.stringify(sarahEmbedding)
    },
    {
      id: 'usr_student_david',
      email: 'student.david@university.edu',
      role: 'STUDENT',
      fullName: 'David Bowman',
      enrollmentId: 'STU2026003',
      departmentId: 'dept_mech',
      yearOfStudy: 3,
      faceEmbedding: null
    },
    {
      id: 'usr_student_emily',
      email: 'student.emily@university.edu',
      role: 'STUDENT',
      fullName: 'Emily Blunt',
      enrollmentId: 'STU2026004',
      departmentId: 'dept_cse',
      yearOfStudy: 4,
      faceEmbedding: null
    }
  ];

  for (const u of users) {
    await db.query(`DELETE FROM users WHERE email = $1 AND id != $2`, [u.email, u.id]);
    await db.query(
      `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, department_id, year_of_study, face_embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE
       SET email = EXCLUDED.email, full_name = EXCLUDED.full_name, role = EXCLUDED.role,
           department_id = EXCLUDED.department_id, year_of_study = EXCLUDED.year_of_study,
           face_embedding = EXCLUDED.face_embedding`,
      [u.id, u.email, defaultPasswordHash, u.role, u.fullName, u.enrollmentId, u.departmentId, u.yearOfStudy, u.faceEmbedding]
    );
  }

  // 2. Classrooms
  console.log('[Seed] Inserting classrooms...');
  const classrooms = [
    {
      id: 'clr_turing_hall',
      name: 'Turing Auditorium 101',
      building: 'Alan Turing Building',
      latitude: 12.971598,
      longitude: 77.594562,
      radiusMeters: 25.0,
      wifiBssids: ['00:14:22:01:23:45', '00:14:22:01:23:46'],
      bleBeacons: ['beacon_turing_hall_entrance', 'beacon_turing_hall_podium'],
      subnets: ['10.14.0.0/16', '127.0.0.1']
    },
    {
      id: 'clr_lovelace_lab',
      name: 'Lovelace Lab 204',
      building: 'Ada Lovelace Tech Wing',
      latitude: 12.971850,
      longitude: 77.594820,
      radiusMeters: 30.0,
      wifiBssids: ['00:14:22:02:50:01'],
      bleBeacons: ['beacon_lovelace_lab'],
      subnets: ['10.15.0.0/16', '127.0.0.1']
    },
    {
      id: 'clr_amphitheater',
      name: 'Campus Open Amphitheater',
      building: 'Central Quad',
      latitude: 12.972200,
      longitude: 77.595100,
      radiusMeters: 60.0,
      wifiBssids: null,
      bleBeacons: null,
      subnets: null
    }
  ];

  for (const clr of classrooms) {
    await db.query(
      `INSERT INTO classrooms (id, name, building, latitude, longitude, radius_meters, wifi_bssid_whitelist, ble_beacon_ids, allowed_ip_subnets)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, radius_meters = EXCLUDED.radius_meters`,
      [clr.id, clr.name, clr.building, clr.latitude, clr.longitude, clr.radiusMeters, clr.wifiBssids, clr.bleBeacons, clr.subnets]
    );
  }

  // 3. Courses
  console.log('[Seed] Inserting courses...');
  const courses = [
    {
      id: 'crs_cs101',
      code: 'CS101',
      name: 'Introduction to Computer Science',
      department: 'Computer Science',
      semester: 'Fall',
      academicYear: '2026'
    },
    {
      id: 'crs_cs201',
      code: 'CS201',
      name: 'Data Structures and Algorithms',
      department: 'Computer Science',
      semester: 'Fall',
      academicYear: '2026'
    },
    {
      id: 'crs_cs301',
      code: 'CS301',
      name: 'Distributed Systems and Security',
      department: 'Computer Science',
      semester: 'Fall',
      academicYear: '2026'
    }
  ];

  for (const c of courses) {
    await db.query(
      `INSERT INTO courses (id, code, name, department, semester, academic_year)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE
       SET name = EXCLUDED.name, department = EXCLUDED.department`,
      [c.id, c.code, c.name, c.department, c.semester, c.academicYear]
    );
  }

  // 4. Enrollments
  console.log('[Seed] Inserting enrollments...');
  const enrollments = [
    { courseId: 'crs_cs101', studentId: 'usr_student_john' },
    { courseId: 'crs_cs101', studentId: 'usr_student_sarah' },
    { courseId: 'crs_cs101', studentId: 'usr_student_david' },
    { courseId: 'crs_cs101', studentId: 'usr_student_emily' },
    { courseId: 'crs_cs201', studentId: 'usr_student_john' },
    { courseId: 'crs_cs201', studentId: 'usr_student_sarah' },
    { courseId: 'crs_cs201', studentId: 'usr_student_david' },
    { courseId: 'crs_cs301', studentId: 'usr_student_emily' }
  ];

  for (const e of enrollments) {
    const id = `enr_${e.courseId}_${e.studentId}`;
    await db.query(
      `INSERT INTO enrollments (id, course_id, student_id, status)
       VALUES ($1, $2, $3, 'ACTIVE')
       ON CONFLICT (course_id, student_id) DO NOTHING`,
      [id, e.courseId, e.studentId]
    );
  }

  // 5. Sessions
  console.log('[Seed] Inserting sessions...');
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const yesterdayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayEnd = new Date(yesterdayStart.getTime() + 60 * 60 * 1000);

  const sessions = [
    {
      id: 'sess_cs101_active',
      courseId: 'crs_cs101',
      professorId: 'usr_prof_alan',
      classroomId: 'clr_turing_hall',
      startTime: now,
      endTime: oneHourLater,
      status: 'ACTIVE',
      policyOverride: null
    },
    {
      id: 'sess_cs201_active',
      courseId: 'crs_cs201',
      professorId: 'usr_prof_ada',
      classroomId: 'clr_lovelace_lab',
      startTime: now,
      endTime: oneHourLater,
      status: 'ACTIVE',
      policyOverride: {
        requiresBiometric: true // High-stakes biometric mode enabled
      }
    },
    {
      id: 'sess_cs101_yesterday',
      courseId: 'crs_cs101',
      professorId: 'usr_prof_alan',
      classroomId: 'clr_turing_hall',
      startTime: yesterdayStart,
      endTime: yesterdayEnd,
      status: 'COMPLETED',
      policyOverride: null
    }
  ];

  for (const s of sessions) {
    await db.query(
      `INSERT INTO sessions (id, course_id, professor_id, classroom_id, start_time, end_time, status, verification_policy_override)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE
       SET status = EXCLUDED.status, verification_policy_override = EXCLUDED.verification_policy_override`,
      [s.id, s.courseId, s.professorId, s.classroomId, s.startTime, s.endTime, s.status, s.policyOverride ? JSON.stringify(s.policyOverride) : null]
    );
  }

  // 6. Historical attendance records for yesterday's session
  console.log('[Seed] Inserting historical attendance records...');
  const pastRecords = [
    { studentId: 'usr_student_john', status: 'PRESENT' },
    { studentId: 'usr_student_sarah', status: 'PRESENT' },
    { studentId: 'usr_student_david', status: 'ABSENT' },
    { studentId: 'usr_student_emily', status: 'PRESENT' }
  ];

  for (const r of pastRecords) {
    const id = `rec_hist_${r.studentId}`;
    await db.query(
      `INSERT INTO attendance_records (id, session_id, student_id, status, marked_by, verified_at, notes)
       VALUES ($1, 'sess_cs101_yesterday', $2, $3, 'SYSTEM', $4, 'Historical lecture check-in.')
       ON CONFLICT (session_id, student_id) DO NOTHING`,
      [id, r.studentId, r.status, yesterdayStart]
    );
  }

  // 7. Batches (Department Specific & Cross-Departmental Multi-Year)
  console.log('[Seed] Inserting batches...');
  const batches = [
    {
      id: 'batch_cse_systems',
      name: 'CSE Core Systems Lab Batch',
      code: 'BATCH-CSE-SYS',
      departmentId: 'dept_cse',
      professorId: 'usr_prof_alan',
      allowCrossDepartment: false,
      allowMultipleYears: false,
      allowedYears: [2],
      description: 'Department-restricted cohort for 2nd Year CSE students.'
    },
    {
      id: 'batch_ai_robotics',
      name: 'Cross-Disciplinary AI & Robotics Lab',
      code: 'BATCH-AI-ROBO',
      departmentId: 'dept_cse',
      professorId: 'usr_prof_alan',
      allowCrossDepartment: true,
      allowMultipleYears: true,
      allowedYears: [3, 4],
      description: 'Interdisciplinary elective cohort for 3rd and 4th year CSE and Mechanical students.'
    }
  ];

  for (const b of batches) {
    await db.query(
      `INSERT INTO batches (
        id, name, code, department_id, professor_id,
        allow_cross_department, allow_multiple_years, allowed_years, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE
      SET name = EXCLUDED.name, code = EXCLUDED.code,
          allow_cross_department = EXCLUDED.allow_cross_department,
          allow_multiple_years = EXCLUDED.allow_multiple_years,
          allowed_years = EXCLUDED.allowed_years`,
      [b.id, b.name, b.code, b.departmentId, b.professorId, b.allowCrossDepartment, b.allowMultipleYears, b.allowedYears, b.description]
    );
  }

  // 8. Batch Members
  console.log('[Seed] Inserting batch members...');
  const batchMembers = [
    { batchId: 'batch_cse_systems', studentId: 'usr_student_john' },
    { batchId: 'batch_ai_robotics', studentId: 'usr_student_david' }, // MECH Year 3
    { batchId: 'batch_ai_robotics', studentId: 'usr_student_emily' }   // CSE Year 4
  ];

  for (const bm of batchMembers) {
    const id = `bm_${bm.batchId.slice(6, 16)}_${bm.studentId.slice(12)}`;
    await db.query(
      `INSERT INTO batch_members (id, batch_id, student_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (batch_id, student_id) DO NOTHING`,
      [id, bm.batchId, bm.studentId]
    );
  }

  // 9. Master Timetable Slots (Recurring Weekly & Dynamic Daily)
  console.log('[Seed] Inserting master timetable slots...');
  const timetableSlots = [
    {
      id: 'slot_mon_cs101',
      scheduleType: 'RECURRING_WEEKLY',
      dayOfWeek: 1, // Monday
      specificDate: null,
      startTime: '09:00:00',
      endTime: '10:00:00',
      targetType: 'CLASS',
      courseId: 'crs_cs101',
      batchId: null,
      professorId: 'usr_prof_alan',
      classroomId: 'clr_turing_hall'
    },
    {
      id: 'slot_wed_ai_robo',
      scheduleType: 'RECURRING_WEEKLY',
      dayOfWeek: 3, // Wednesday
      specificDate: null,
      startTime: '14:00:00',
      endTime: '16:00:00',
      targetType: 'BATCH',
      courseId: null,
      batchId: 'batch_ai_robotics',
      professorId: 'usr_prof_alan',
      classroomId: 'clr_lovelace_lab'
    },
    {
      id: 'slot_fri_cs201',
      scheduleType: 'RECURRING_WEEKLY',
      dayOfWeek: 5, // Friday
      specificDate: null,
      startTime: '10:00:00',
      endTime: '11:30:00',
      targetType: 'CLASS',
      courseId: 'crs_cs201',
      batchId: null,
      professorId: 'usr_prof_ada',
      classroomId: 'clr_lovelace_lab'
    }
  ];

  for (const ts of timetableSlots) {
    await db.query(
      `INSERT INTO timetable_slots (
        id, schedule_type, day_of_week, specific_date, start_time, end_time,
        target_type, course_id, batch_id, professor_id, classroom_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO NOTHING`,
      [
        ts.id, ts.scheduleType, ts.dayOfWeek, ts.specificDate,
        ts.startTime, ts.endTime, ts.targetType, ts.courseId,
        ts.batchId, ts.professorId, ts.classroomId
      ]
    );
  }

  // 10. Sample Timetable Templates & Cohort Notices
  console.log('[Seed] Inserting timetable templates & announcements...');
  await db.query(
    `INSERT INTO timetable_templates (id, name, description, target_type, target_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`,
    [
      'tmpl_cse_yr2_morning',
      'CSE Year 2 — Standard Morning Theory + Lab Schedule',
      'Standard weekly morning schedule for 2nd Year Computer Science students.',
      'CLASS',
      'crs_cs101'
    ]
  );

  const templateSlots = [
    { id: 'tslot_1', templateId: 'tmpl_cse_yr2_morning', dayOfWeek: 1, startTime: '09:00', endTime: '10:30', subject: 'CS101 Distributed Systems', room: 'clr_turing_hall', prof: 'usr_prof_alan' },
    { id: 'tslot_2', templateId: 'tmpl_cse_yr2_morning', dayOfWeek: 3, startTime: '11:00', endTime: '12:30', subject: 'CS201 Data Structures Lab', room: 'clr_lovelace_lab', prof: 'usr_prof_ada' },
    { id: 'tslot_3', templateId: 'tmpl_cse_yr2_morning', dayOfWeek: 5, startTime: '14:00', endTime: '16:00', subject: 'CS301 Network Security & Cryptography', room: 'clr_turing_hall', prof: 'usr_prof_alan' }
  ];

  for (const s of templateSlots) {
    await db.query(
      `INSERT INTO timetable_template_slots (id, template_id, day_of_week, start_time, end_time, subject_name, classroom_id, professor_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO NOTHING`,
      [s.id, s.templateId, s.dayOfWeek, s.startTime, s.endTime, s.subject, s.room, s.prof]
    );
  }

  const sampleAnnouncements = [
    {
      id: 'ann_campus_welcome',
      title: 'Commencement of Odd Semester 2026-27 Classes',
      content: 'All undergraduate and postgraduate classes commence on Monday. Students are instructed to verify their registered department and academic year.',
      priority: 'GENERAL',
      scopeType: 'CAMPUS',
      scopeId: null,
      author: 'Office of Academic Affairs'
    },
    {
      id: 'ann_cse_capstone',
      title: 'Final Year Capstone Project Proposal Deadline',
      content: 'Department of CSE: Synopses for final year capstone projects must be submitted to the department head by Friday.',
      priority: 'ACADEMIC',
      scopeType: 'DEPARTMENT',
      scopeId: 'dept_cse',
      author: 'Prof. Alan Turing (HOD CSE)'
    },
    {
      id: 'ann_batch_ai_symposium',
      title: 'Special Guest Lecture: Multi-Agent Deep Reinforcement Learning',
      content: 'All students enrolled in the AI & Robotics Specialization Batch are required to attend the guest lecture in Seminar Hall 2 at 2:00 PM.',
      priority: 'URGENT',
      scopeType: 'BATCH',
      scopeId: 'batch_ai_robotics',
      author: 'Prof. Alan Turing'
    }
  ];

  for (const a of sampleAnnouncements) {
    await db.query(
      `INSERT INTO announcements (id, title, content, priority, scope_type, scope_id, author_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [a.id, a.title, a.content, a.priority, a.scopeType, a.scopeId, a.author]
    );
  }

  // 11. Refresh Materialized Views
  console.log('[Seed] Refreshing materialized views for instant analytics...');
  await refreshMaterializedViews(false);

  console.log('====================================================');
  console.log('[Seed] Database seeding completed successfully!');
  console.log('Credentials:');
  console.log('  Admin:     admin@university.edu / password123');
  console.log('  Professor: prof.alan@university.edu / password123');
  console.log('  Student:   student.john@university.edu / password123');
  console.log('====================================================');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
