import { randomUUID } from 'node:crypto';
import { getDb, withTransaction } from '../database/db.js';
export async function userBatches(userId: string): Promise<any[]> {
 const db=await getDb(); return (await db.query(`SELECT DISTINCT b.id,b.allow_all_logins FROM batches b WHERE EXISTS(SELECT 1 FROM batch_members m WHERE m.batch_id=b.id AND m.student_id=$1) OR EXISTS(SELECT 1 FROM batch_professors p WHERE p.batch_id=b.id AND p.professor_id=$1) OR b.professor_id=$1`,[userId])).rows;
}
export async function issueMobileSession(userId:string):Promise<string|null> {
 return withTransaction(async()=>{
 const db=await getDb(); await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
 const batches=await userBatches(userId); let blocked=false;
 for(const batch of batches) {
  if(batch.allow_all_logins) continue;
  const r=await db.query('SELECT status FROM batch_login_requests WHERE batch_id=$1 AND user_id=$2 FOR UPDATE',[batch.id,userId]);
  if(r.rows[0]?.status!=='APPROVED') { blocked=true; await db.query('INSERT INTO batch_login_requests(batch_id,user_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[batch.id,userId]); }
 }
 if(blocked)return null;
 await db.query('DELETE FROM batch_login_requests WHERE user_id=$1',[userId]);
 const id=randomUUID(); await db.query('INSERT INTO mobile_sessions(id,user_id) VALUES($1,$2)',[id,userId]);
 for(const batch of batches)await db.query('INSERT INTO batch_account_events(id,batch_id,user_id,event) VALUES($1,$2,$3,$4)',[randomUUID(),batch.id,userId,'LOGIN']);
 return id;
 });
}
