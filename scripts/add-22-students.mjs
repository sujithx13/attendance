import pg from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://attendance_app:db6769@127.0.0.1:5432/attendance',
});

const NEW_STUDENTS = [
  {
    "roll": "24BECSE245",
    "name": "VISHNUPRABAKARAN K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_1"
  },
  {
    "roll": "24BECSE078",
    "name": "JENIFAR M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_2"
  },
  {
    "roll": "24BECSE065",
    "name": "HAYAGRIV E K",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE083",
    "name": "KAMESHWARAN J",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE091",
    "name": "KARUNYA A",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE116",
    "name": "MONISH S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE122",
    "name": "NITHISH G",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE123",
    "name": "NITHISH L",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE173",
    "name": "SANJAY RAJA MM",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "25LBECSE005",
    "name": "BOOMINATHAN E",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "25LBECSE007",
    "name": "SANTHOSH P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "25LBECSE016",
    "name": "Jeyavarshan c",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  },
  {
    "roll": "24BECSE014",
    "name": "ANANDHA RAJ V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE019",
    "name": "ARUNVI C",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE085",
    "name": "KANNA GOUDA P",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE094",
    "name": "KEERTHIVASAN S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE241",
    "name": "VINOTH M",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "25LBECSE006",
    "name": "CHANDRASEKAR T",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "25LBECSE018",
    "name": "KEJAPATHI S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "25LBECSE022",
    "name": "CHANDRU S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "25LBECSE023",
    "name": "SARAVANA KUMAR S",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_4"
  },
  {
    "roll": "24BECSE026",
    "name": "DAMODHARAN V",
    "deptId": "dept_be_cse",
    "batchId": "batch_foe_2024_3"
  }
];

async function main() {
  console.log(`Starting addition of ${NEW_STUDENTS.length} new students...`);
  const client = await pool.connect();
  try {
    console.log('Pre-computing bcrypt password hashes...');
    const hashed = [];
    for (const s of NEW_STUDENTS) {
      const plainPassword = s.roll.toLowerCase();
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      hashed.push({
        ...s,
        userId: `usr_student_${s.roll.toLowerCase()}`,
        email: `${s.roll.toLowerCase()}@kahedu.edu.in`,
        passwordHash,
      });
    }
    console.log(`Computed ${hashed.length} bcrypt hashes.`);

    console.log('Beginning atomic database transaction...');
    await client.query('BEGIN');

    // 1. Insert Users
    console.log(`Inserting ${hashed.length} new student accounts...`);
    for (const s of hashed) {
      await client.query(
        `INSERT INTO users (id, email, password_hash, role, full_name, enrollment_id, department_id, year_of_study)
         VALUES ($1, $2, $3, 'STUDENT', $4, $5, $6, 3)
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           enrollment_id = EXCLUDED.enrollment_id,
           department_id = EXCLUDED.department_id,
           year_of_study = 3`,
        [s.userId, s.email, s.passwordHash, s.name, s.roll, s.deptId]
      );
      console.log(`  + User: [${s.roll}] ${s.name} (${s.email})`);
    }

    // 2. Insert Batch Members
    console.log('Enrolling students into batch_members...');
    for (const s of hashed) {
      const memberId = `bm_${s.batchId}_${s.userId}`;
      await client.query(
        `INSERT INTO batch_members (id, batch_id, student_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (batch_id, student_id) DO NOTHING`,
        [memberId, s.batchId, s.userId]
      );
      console.log(`  + Enrolled ${s.roll} in ${s.batchId}`);
    }

    // 3. Verification queries inside transaction
    const countRes = await client.query(
      `SELECT b.code, COUNT(bm.id) as student_count
       FROM batches b
       LEFT JOIN batch_members bm ON b.id = bm.batch_id
       WHERE b.code LIKE 'FOE_2024_BATCH_%'
       GROUP BY b.code
       ORDER BY b.code`
    );

    console.log('\n--- Verification Inside Transaction ---');
    let totalEnrolled = 0;
    for (const row of countRes.rows) {
      console.log(`  - ${row.code}: ${row.student_count} students`);
      totalEnrolled += parseInt(row.student_count, 10);
    }
    console.log(`Total Enrolled in FOE Batches: ${totalEnrolled} (expected: 302)`);

    if (totalEnrolled !== 302) {
      throw new Error(`Enrollment count mismatch! Expected 302, got ${totalEnrolled}. Rolling back!`);
    }

    await client.query('COMMIT');
    console.log('\n>>> Transaction COMMITTED successfully! All 22 students safely added. <<<\n');
  } catch (err) {
    console.error('Error during addition, executing ROLLBACK:', err);
    await client.query('ROLLBACK');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
