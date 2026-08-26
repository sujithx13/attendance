import { getDb } from '../src/database/db.js';
import { DepartmentService } from '../src/services/department.service.js';
import { BatchService } from '../src/services/batch.service.js';
import { TimetableService } from '../src/services/timetable.service.js';
import { PolicyService } from '../src/services/policy.service.js';
import { QrService } from '../src/services/qr.service.js';
import { ScheduleType, TargetType } from '../src/types/timetable.types.js';

export async function runBatchesAndTimetableTests(): Promise<void> {
  console.log('\n--- Running Test Suite: Academic Hierarchy, Batches & Timetables ---');
  const db = await getDb();

  // 1. Department Management
  const depts = await DepartmentService.listDepartments();
  if (depts.length < 4) {
    throw new Error(`Expected at least 4 seeded departments, found: ${depts.length}`);
  }
  console.log(`  ✓ University departments listed successfully (${depts.length} departments found)`);

  const testCode = `AERO_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const newDept = await DepartmentService.createDepartment(testCode, 'Aerospace Engineering');
  if (newDept.code !== testCode) {
    throw new Error('Failed to create department.');
  }
  console.log(`  ✓ Admin created new department (${testCode} - Aerospace Engineering)`);

  // 2. Batch Creation & Strict Rule Verification
  // Rule A: Single department, Year 2 only
  const cseBatch = await BatchService.createBatch({
    name: 'Test CSE Systems Only',
    code: `TEST-CSE-${Date.now()}`,
    departmentId: 'dept_cse',
    professorId: 'usr_prof_alan',
    allowCrossDepartment: false,
    allowMultipleYears: false,
    allowedYears: [2],
    description: 'CSE Year 2 restricted'
  });

  // Adding John (CSE, Year 2) -> Should PASS
  await BatchService.addStudentToBatch(cseBatch.id, 'usr_student_john');
  console.log('  ✓ Enrolled eligible student (CSE, Year 2) into department-restricted batch');

  // Adding Sarah (IT, Year 2) -> Should FAIL (Department mismatch)
  let deptMismatchCaught = false;
  try {
    await BatchService.addStudentToBatch(cseBatch.id, 'usr_student_sarah');
  } catch (err: any) {
    if (err.message.includes('Department mismatch')) {
      deptMismatchCaught = true;
    }
  }
  if (!deptMismatchCaught) {
    throw new Error('Expected Department mismatch error for cross-department student in restricted batch.');
  }
  console.log('  ✓ Successfully blocked cross-department student from department-restricted batch');

  // Adding Emily (CSE, Year 4) -> Should FAIL (Year mismatch)
  let yearMismatchCaught = false;
  try {
    await BatchService.addStudentToBatch(cseBatch.id, 'usr_student_emily');
  } catch (err: any) {
    if (err.message.includes('Academic Year mismatch')) {
      yearMismatchCaught = true;
    }
  }
  if (!yearMismatchCaught) {
    throw new Error('Expected Academic Year mismatch error for Year 4 student in Year 2 batch.');
  }
  console.log('  ✓ Successfully blocked Year 4 student from Year 2 restricted batch');

  // Rule B: Cross-Departmental, Multi-Year Batch (CSE + MECH, Years 3 & 4)
  const crossBatch = await BatchService.createBatch({
    name: 'Test Robotics Elective',
    code: `TEST-ROBO-${Date.now()}`,
    departmentId: 'dept_cse',
    professorId: 'usr_prof_alan',
    allowCrossDepartment: true,
    allowMultipleYears: true,
    allowedYears: [3, 4],
    description: 'Interdisciplinary elective'
  });

  await BatchService.addStudentToBatch(crossBatch.id, 'usr_student_david'); // MECH, Year 3
  await BatchService.addStudentToBatch(crossBatch.id, 'usr_student_emily'); // CSE, Year 4
  const crossMembers = await BatchService.getBatchMembers(crossBatch.id);
  if (crossMembers.length !== 2) {
    throw new Error(`Expected 2 cross-department members, found: ${crossMembers.length}`);
  }
  console.log('  ✓ Multi-department, multi-year batch accepted students across faculties (MECH Y3 & CSE Y4)');

  // 3. Timetable & Master Scheduling Engine
  // Create a recurring weekly slot for Tuesday (dayOfWeek: 2) 11:00 - 12:00
  const slot = await TimetableService.createSlot({
    scheduleType: ScheduleType.RECURRING_WEEKLY,
    dayOfWeek: 2, // Tuesday
    startTime: '11:00:00',
    endTime: '12:00:00',
    targetType: TargetType.BATCH,
    batchId: crossBatch.id,
    professorId: 'usr_prof_alan',
    classroomId: 'clr_lovelace_lab'
  });

  if (!slot.id) {
    throw new Error('Failed to create timetable slot.');
  }
  console.log('  ✓ Admin created recurring weekly timetable slot for Tuesday 11:00-12:00');

  // Session Generator: Find the next Tuesday date and generate sessions
  const testTuesday = new Date('2026-09-01T00:00:00Z'); // 2026-09-01 is a Tuesday
  const genResult = await TimetableService.generateSessionsForDate(testTuesday);
  if (genResult.createdCount < 1) {
    throw new Error('Expected at least 1 session generated for Tuesday from recurring timetable.');
  }
  console.log(`  ✓ Scheduling engine auto-generated ${genResult.createdCount} live session(s) from weekly master timetable`);

  // 4. Batch Session Attendance Verification
  // Create an active session specifically for crossBatch
  const batchSessionId = `sess_test_batch_${Date.now()}`;
  await db.query(
    `INSERT INTO sessions (
      id, batch_id, professor_id, classroom_id, start_time, end_time, status
    ) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')`,
    [
      batchSessionId,
      crossBatch.id,
      'usr_prof_alan',
      'clr_lovelace_lab',
      new Date(),
      new Date(Date.now() + 3600000)
    ]
  );

  const { payload: batchQrPayload } = QrService.generateSessionBroadcastPayload(batchSessionId, 20);

  // Enrolled member (David) submits attempt -> Must ACCEPT
  const davidAttempt = await PolicyService.evaluateAttempt(
    'usr_student_david',
    {
      sessionId: batchSessionId,
      clientTimestamp: new Date().toISOString(),
      qrPayload: batchQrPayload,
      coordinates: {
        latitude: 12.971850,
        longitude: 77.594820,
        accuracy: 8.0
      },
      telemetry: {
        isFromMockProvider: false
      }
    },
    '127.0.0.1'
  );

  if (davidAttempt.decision !== 'ACCEPT') {
    throw new Error(`Expected batch member attempt to be ACCEPTED, got: ${davidAttempt.decision} (${davidAttempt.decisionReason})`);
  }
  console.log('  ✓ Enrolled batch student attendance evaluated and ACCEPTED');

  // Non-member (Sarah) submits attempt -> Must REJECT with STUDENT_NOT_IN_BATCH
  const { payload: freshBatchQrPayload } = QrService.generateSessionBroadcastPayload(batchSessionId, 20);
  const sarahAttempt = await PolicyService.evaluateAttempt(
    'usr_student_sarah',
    {
      sessionId: batchSessionId,
      clientTimestamp: new Date().toISOString(),
      qrPayload: freshBatchQrPayload,
      coordinates: {
        latitude: 12.971850,
        longitude: 77.594820,
        accuracy: 8.0
      },
      telemetry: {
        isFromMockProvider: false
      }
    },
    '127.0.0.1'
  );

  if (sarahAttempt.decision !== 'REJECT' || sarahAttempt.decisionReason !== 'STUDENT_NOT_IN_BATCH') {
    throw new Error(`Expected non-batch student attempt to be REJECTED with STUDENT_NOT_IN_BATCH, got: ${sarahAttempt.decision} (${sarahAttempt.decisionReason})`);
  }
  console.log('  ✓ Non-batch student attempt correctly REJECTED (STUDENT_NOT_IN_BATCH)');
}

if (process.argv[1]?.endsWith('batches-and-timetables.test.ts') || process.argv[1]?.endsWith('batches-and-timetables.test.js')) {
  runBatchesAndTimetableTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
