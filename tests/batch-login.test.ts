import assert from 'node:assert/strict';
import { TemplateController } from '../src/controllers/template.controller.js';
import { getDb } from '../src/database/db.js';
import { issueMobileSession } from '../src/services/mobile-auth.service.js';
import { AuthController } from '../src/controllers/auth.controller.js';
import { BatchAttendanceController } from '../src/controllers/batch-attendance.controller.js';
export async function testBatchLogin() {
 const db=await getDb(),user='usr_student_john',batch='batch_cse_systems';
 const response=()=>({code:200,body:null as any,status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}});
 try {
  await db.query('UPDATE batches SET allow_all_logins=FALSE WHERE id=$1',[batch]);
  await db.query('DELETE FROM batch_login_requests WHERE user_id=$1',[user]);
  const bad=response();await AuthController.login({body:{email:'student.john@university.edu',password:'incorrect'}} as any,bad as any);assert.equal(bad.code,401);assert.equal((await db.query('SELECT * FROM batch_login_requests WHERE user_id=$1',[user])).rows.length,0);
  assert.equal(await issueMobileSession(user),null);
  assert.equal((await db.query('SELECT status FROM batch_login_requests WHERE user_id=$1 AND batch_id=$2',[user,batch])).rows[0].status,'PENDING');
  await db.query("UPDATE batch_login_requests SET status='APPROVED' WHERE user_id=$1 AND batch_id=$2",[user,batch]);
  const sid=await issueMobileSession(user);assert.ok(sid);
  assert.equal(await issueMobileSession(user),null,'Approval must be consumed once');
  const profile=response();await AuthController.updateProfile({user:{userId:user},body:{fullName:'Unauthorized edit'}} as any,profile as any);assert.equal(profile.code,403);
  const logout=response();await AuthController.logout({user:{userId:user,sessionId:sid}} as any,logout as any);assert.equal(logout.code,200);
  assert.ok((await db.query('SELECT revoked_at FROM mobile_sessions WHERE id=$1',[sid])).rows[0].revoked_at);
  assert.ok((await db.query("SELECT id FROM batch_account_events WHERE batch_id=$1 AND user_id=$2 AND event='LOGOUT'",[batch,user])).rows.length);
  await db.query('UPDATE batches SET allow_all_logins=TRUE WHERE id=$1',[batch]);assert.ok(await issueMobileSession(user));
  const report=response();await BatchAttendanceController.list({params:{id:batch},query:{date:'2099-01-01'}} as any,report as any);assert.equal(report.code,200);assert.ok(report.body.students.some((u:any)=>u.id===user));assert.equal(report.body.sessions.length,0);
  const slot=(await db.query('SELECT professor_id,classroom_id FROM timetable_slots LIMIT 1')).rows[0];
  const created=response();await TemplateController.create({body:{name:'Day regression',slots:[{dayOfWeek:1,startTime:'00:01',endTime:'00:02',subjectName:'Day lesson',professorId:slot.professor_id,classroomId:slot.classroom_id}]}} as any,created as any);assert.equal(created.code,201);
  const applied=response();const applyReq={params:{id:created.body.templateId},body:{targetType:'BATCH',targetId:batch,sourceDay:1,dates:['2099-01-02','2099-01-03']}};
  await TemplateController.applyToCohort(applyReq as any,applied as any);assert.equal(applied.body.appliedCount,2);
  const before=(await db.query('SELECT COUNT(*)::int AS n FROM timetable_slots')).rows[0].n;
  await assert.rejects(()=>TemplateController.applyToCohort({...applyReq,body:{...applyReq.body,dates:['2099-01-04','2099-01-02']}} as any,response() as any));
  assert.equal((await db.query('SELECT COUNT(*)::int AS n FROM timetable_slots')).rows[0].n,before,'Template application must roll back all dates on conflict');
  await db.query("DELETE FROM timetable_slots WHERE specific_date IN ('2099-01-02','2099-01-03') AND batch_id=$1",[batch]);
  await TemplateController.delete({params:{id:created.body.templateId}} as any,response() as any);
  console.log('  ✓ Batch gate, single-use approval, allow-all, logout revocation/events, read-only profile and daily roster passed');
 }finally{await db.query('UPDATE batches SET allow_all_logins=TRUE WHERE id=$1',[batch]);await db.query('DELETE FROM batch_login_requests WHERE user_id=$1',[user]);}
}
