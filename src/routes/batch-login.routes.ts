import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole } from '../config/constants.js';
import { getDb } from '../database/db.js';
const router=Router({mergeParams:true});
router.use(authenticateToken,requireRole(UserRole.ADMIN));
router.get('/',async(req,res)=>{
 const db=await getDb(), id=String((req.params as Record<string,string>).id);
 const b=await db.query('SELECT allow_all_logins AS "allowAllLogins" FROM batches WHERE id=$1',[id]);
 if(!b.rows.length){res.status(404).json({message:'Batch not found.'});return;}
 const requests=await db.query(`SELECT r.user_id AS "userId",u.full_name AS name,u.email,r.status,r.requested_at AS "requestedAt" FROM batch_login_requests r JOIN users u ON u.id=r.user_id WHERE r.batch_id=$1 ORDER BY r.requested_at`,[id]);
 const events=await db.query(`SELECT e.id,e.event,e.created_at AS "createdAt",u.full_name AS name FROM batch_account_events e JOIN users u ON u.id=e.user_id WHERE e.batch_id=$1 ORDER BY e.created_at DESC LIMIT 100`,[id]);
 res.json({...b.rows[0],requests:requests.rows,events:events.rows});
});
router.patch('/',async(req,res)=>{
 if(typeof req.body.allowAllLogins!=='boolean'){res.status(400).json({message:'allowAllLogins must be a boolean.'});return;}
 const db=await getDb();const result=await db.query('UPDATE batches SET allow_all_logins=$1 WHERE id=$2 RETURNING id',[req.body.allowAllLogins,String((req.params as Record<string,string>).id)]);
 if(!result.rows.length){res.status(404).json({message:'Batch not found.'});return;}res.json({success:true});
});
router.post('/:userId/approve',async(req,res)=>{
 const db=await getDb();const result=await db.query("UPDATE batch_login_requests SET status='APPROVED' WHERE batch_id=$1 AND user_id=$2 AND status='PENDING' RETURNING user_id",[String((req.params as Record<string,string>).id),String(req.params.userId)]);
 if(!result.rows.length){res.status(404).json({message:'Pending login request not found.'});return;}res.json({success:true});
});
export default router;
