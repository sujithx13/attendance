import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { ENV } from '../src/config/env.js';
import { getDb } from '../src/database/db.js';

export async function testStudentRegistration(): Promise<void> {
  console.log('\n--- Running Temporary Student Registration & Staff Enrollment Tests ---');
  assert.equal(ENV.NODE_ENV, 'test', 'Tests must run against the isolated test database.');

  const db = await getDb();
  const server = http.createServer(createApp());
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as import('node:net').AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const tokenFor = (id: string, role: string) =>
    jwt.sign({ userId: id, role, email: `${id}@university.edu`, fullName: id }, ENV.JWT_SECRET, { expiresIn: '1h' });

  const adminToken = tokenFor('usr_admin', 'ADMIN');
  const profToken = tokenFor('usr_prof_alan', 'PROFESSOR');
  const studentToken = tokenFor('usr_student_john', 'STUDENT');

  const call = (path: string, method = 'GET', body?: unknown, bearer?: string) =>
    fetch(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

  try {
    const deptRow = (await db.query("SELECT id FROM departments ORDER BY code ASC LIMIT 1")).rows[0];
    assert.ok(deptRow, 'Seeded department must exist');

    const ineligibleBatchId = 'batch_test_ineligible';
    const eligibleBatchId = 'batch_test_eligible';
    await db.query(
      `INSERT INTO batches (id, name, code, department_id, professor_id, allow_cross_department, allow_multiple_years, allowed_years)
       VALUES ($1, 'Year 4 Only Batch', 'B-Y4', $2, 'usr_prof_alan', FALSE, FALSE, ARRAY[4]),
              ($3, 'Open Onboarding Batch', 'B-OPEN', $2, 'usr_prof_alan', TRUE, TRUE, ARRAY[1,2,3,4])
       ON CONFLICT (id) DO NOTHING`,
      [ineligibleBatchId, deptRow.id, eligibleBatchId]
    );

    // 1. Public registration page is served with strict security headers
    const pageRes = await fetch(`${baseUrl}/register/`);
    assert.equal(pageRes.status, 200);
    assert.equal(pageRes.headers.get('cache-control'), 'no-store');
    assert.match(pageRes.headers.get('content-security-policy') || '', /script-src 'self'/);

    // 2. Closed by default
    const closedOptionsRes = await call('/auth/student-register/options');
    assert.equal(closedOptionsRes.status, 200);
    const closedOptions: any = await closedOptionsRes.json();
    assert.equal(closedOptions.open, false);
    assert.deepEqual(closedOptions.departments, []);
    assert.deepEqual(closedOptions.batches, []);

    const closedPost = await call('/auth/student-register', 'POST', {
      fullName: 'Closed Student',
      email: 'closed.student@kahedu.edu.in',
      enrollmentId: '24UCS900',
      departmentId: deptRow.id,
      yearOfStudy: 1
    });
    assert.equal(closedPost.status, 403);

    // 3. Only ADMIN can toggle self-registration
    assert.equal((await call('/auth/student-register/settings', 'PUT', { enabled: true }, studentToken)).status, 403);
    assert.equal((await call('/auth/student-register/settings', 'PUT', { enabled: true }, profToken)).status, 403);
    const enableRes = await call('/auth/student-register/settings', 'PUT', { enabled: true }, adminToken);
    assert.equal(enableRes.status, 200);
    assert.equal(((await enableRes.json()) as any).enabled, true);

    // 4. Options load when enabled
    const openOptions: any = await (await call('/auth/student-register/options')).json();
    assert.equal(openOptions.open, true);
    assert.ok(openOptions.departments.length > 0);

    // 5. Validation & atomic rollback on batch eligibility error
    assert.equal(
      (await call('/auth/student-register', 'POST', {
        fullName: 'Bad Email',
        email: 'student@gmail.com',
        enrollmentId: '24UCS901',
        departmentId: deptRow.id,
        yearOfStudy: 1
      })).status,
      400
    );

    const badBatchRes = await call('/auth/student-register', 'POST', {
      fullName: 'Rollback Student',
      email: 'rollback.student@kahedu.edu.in',
      enrollmentId: '24UCS902',
      departmentId: deptRow.id,
      yearOfStudy: 1,
      batchId: ineligibleBatchId
    });
    assert.equal(badBatchRes.status, 400);
    const rolledBackUser = await db.query("SELECT id FROM users WHERE email = 'rollback.student@kahedu.edu.in'");
    assert.equal(rolledBackUser.rows.length, 0, 'User insert must roll back if batch enrollment fails.');

    // 6. Successful self-registration uppercases register number, uses it as password, and forces STUDENT role
    const okRes = await call('/auth/student-register', 'POST', {
      fullName: 'Self Registered Student',
      email: '25becse234@kahedu.edu.in',
      enrollmentId: '25becse234',
      departmentId: deptRow.id,
      yearOfStudy: 2,
      batchId: eligibleBatchId,
      role: 'ADMIN'
    });
    assert.equal(okRes.status, 201);
    const okBody: any = await okRes.json();
    assert.equal(okBody.user.role, 'STUDENT');
    assert.equal(okBody.user.enrollmentId, '25BECSE234');
    const createdRow = (await db.query("SELECT role, enrollment_id FROM users WHERE id = $1", [okBody.user.id])).rows[0];
    assert.equal(createdRow.role, 'STUDENT');
    assert.equal(createdRow.enrollment_id, '25BECSE234');
    const membership = await db.query('SELECT 1 FROM batch_members WHERE batch_id = $1 AND student_id = $2', [eligibleBatchId, okBody.user.id]);
    assert.equal(membership.rows.length, 1);

    // Verify login works with email + uppercase register number as password (and fails with lowercase)
    const badLogin = await call('/auth/login', 'POST', { email: '25becse234@kahedu.edu.in', password: '25becse234' });
    assert.equal(badLogin.status, 401);
    const goodLogin = await call('/auth/login', 'POST', { email: '25becse234@kahedu.edu.in', password: '25BECSE234' });
    assert.equal(goodLogin.status, 200);

    // Duplicate email and duplicate register number (case-insensitive) are rejected
    assert.equal(
      (await call('/auth/student-register', 'POST', {
        fullName: 'Duplicate Email',
        email: '25becse234@kahedu.edu.in',
        enrollmentId: '24UCS999',
        departmentId: deptRow.id,
        yearOfStudy: 2
      })).status,
      409
    );
    assert.equal(
      (await call('/auth/student-register', 'POST', {
        fullName: 'Duplicate Reg',
        email: 'other.student@kahedu.edu.in',
        enrollmentId: '25BECSE234',
        departmentId: deptRow.id,
        yearOfStudy: 2
      })).status,
      409
    );

    // 7. Turning off immediately closes public registration
    const disableRes = await call('/auth/student-register/settings', 'PUT', { enabled: false }, adminToken);
    assert.equal(disableRes.status, 200);
    assert.equal(
      (await call('/auth/student-register', 'POST', {
        fullName: 'After Close',
        email: 'after.close@kahedu.edu.in',
        enrollmentId: '24UCS904',
        departmentId: deptRow.id,
        yearOfStudy: 1
      })).status,
      403
    );

    // 8. Staff (PROFESSOR & ADMIN) can still register students when self-registration is off, using uppercase register number as password
    assert.equal(
      (await call('/auth/staff-register-student', 'POST', {
        fullName: 'Student Attempt',
        email: 'by.student@kahedu.edu.in',
        enrollmentId: '24UCS905',
        departmentId: deptRow.id,
        yearOfStudy: 1
      }, studentToken)).status,
      403
    );

    const byProfRes = await call('/auth/staff-register-student', 'POST', {
      fullName: 'Registered By Faculty',
      email: '25becse999@kahedu.edu.in',
      enrollmentId: '25becse999',
      departmentId: deptRow.id,
      yearOfStudy: 1,
      role: 'ADMIN'
    }, profToken);
    assert.equal(byProfRes.status, 201);
    const byProfBody: any = await byProfRes.json();
    assert.equal(byProfBody.user.role, 'STUDENT');
    assert.equal(byProfBody.user.enrollmentId, '25BECSE999');

    const staffCreatedLogin = await call('/auth/login', 'POST', { email: '25becse999@kahedu.edu.in', password: '25BECSE999' });
    assert.equal(staffCreatedLogin.status, 200);

    assert.equal((await call('/auth/register', 'POST', { role: 'ADMIN' }, profToken)).status, 403);

    console.log('  ✓ Temporary student self-registration link, toggle, rollback, and staff student-creation passed');
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
