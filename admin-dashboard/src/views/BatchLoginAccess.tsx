import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, LogIn, LogOut, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { api } from '../services/api.js';

type LoginRequest = { userId:string; name:string; email:string; status:string; requestedAt:string };
type AccountEvent = { id:string; name:string; event:string; createdAt:string };
type AccessData = { allowAllLogins:boolean; requests:LoginRequest[]; events:AccountEvent[] };
const time = (value:string) => new Date(value).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export function BatchLoginAccess({batchId}:{batchId:string}) {
  const [data,setData]=useState<AccessData|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const load=async()=>{setData(await api.batchLoginAccess(batchId));setError('');};
  useEffect(()=>{
    let active=true;
    const refresh=async()=>{try{const value=await api.batchLoginAccess(batchId);if(active){setData(value);setError('');}}catch(e){if(active)setError((e as Error).message);}};
    void refresh();const timer=setInterval(refresh,5000);return()=>{active=false;clearInterval(timer);};
  },[batchId]);
  const change=async(action:()=>Promise<unknown>)=>{setBusy(true);try{await action();await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}};
  const pending=data?.requests.filter(r=>r.status==='PENDING').length||0;
  return <div className="batch-access">
    <header className="batch-access-heading"><div><span className="batch-eyebrow">BATCH SECURITY</span><h2>Alerts & login access</h2><p>Review sign-in requests and keep track of account activity.</p></div><span className="badge badge-emerald"><span className="access-live-dot"/> Updates every 5s</span></header>
    {error&&<div className="access-error" role="alert"><AlertCircle size={18}/>{error}</div>}
    {!data&&!error&&<div className="card">Loading batch access…</div>}
    {data&&<>
      <section className="card access-policy"><div className="access-policy-icon"><ShieldCheck size={24}/></div><div className="access-policy-copy"><div className="access-policy-title"><h3>Login policy</h3><span className={`badge ${data.allowAllLogins?'badge-emerald':'badge-amber'}`}>{data.allowAllLogins?'Open access':'Approval required'}</span></div><p>{data.allowAllLogins?'Members can sign in directly. Turn this off after initial account setup.':'New sign-ins need your approval. Existing signed-in sessions remain active.'}</p></div><label className="access-switch"><input type="checkbox" role="switch" checked={data.allowAllLogins} disabled={busy} onChange={e=>void change(()=>api.setBatchLoginAccess(batchId,e.target.checked))}/><span className="access-switch-track" aria-hidden="true"/><span>Allow all logins</span></label></section>
      <div className="access-columns">
        <section className="card access-requests"><div className="access-section-heading"><div><UserCheck size={19}/><h3>Login requests</h3></div><span className={`badge ${pending?'badge-amber':'badge-blue'}`}>{pending} pending</span></div>
          {!data.requests.length?<div className="access-empty"><CheckCircle2 size={30}/><strong>All caught up</strong><p>New login requests from this batch will appear here.</p></div>:<div className="table-container"><table className="data-table"><thead><tr><th>Member</th><th>Requested</th><th>Status</th><th style={{textAlign:'right'}}>Action</th></tr></thead><tbody>{[...data.requests].sort((a,b)=>Number(b.status==='PENDING')-Number(a.status==='PENDING')).map(r=><tr key={r.userId}><td><div className="access-person"><span className="access-avatar">{r.name.charAt(0).toUpperCase()}</span><div><strong>{r.name}</strong><small>{r.email}</small></div></div></td><td className="access-time"><Clock3 size={13}/>{time(r.requestedAt)}</td><td><span className={`badge ${r.status==='PENDING'?'badge-amber':'badge-emerald'}`}>{r.status==='PENDING'?'Pending':'Approved'}</span></td><td style={{textAlign:'right'}}>{r.status==='PENDING'?<button className="btn btn-primary" disabled={busy} onClick={()=>void change(()=>api.approveBatchLogin(batchId,r.userId))}><UserCheck size={14}/>Approve</button>:<span className="access-approved"><CheckCircle2 size={14}/>Ready to sign in</span>}</td></tr>)}</tbody></table></div>}
        </section>
        <section className="card access-activity"><div className="access-section-heading"><div><Users size={19}/><h3>Account activity</h3></div><span className="badge badge-blue">{data.events.length}</span></div>
          {!data.events.length?<div className="access-empty"><ShieldCheck size={30}/><strong>No activity yet</strong><p>Batch sign-ins and testing logouts will appear here.</p></div>:<ol className="access-event-list">{data.events.map(e=><li key={e.id}><span className={`access-event-icon ${e.event==='LOGOUT'?'is-logout':''}`}>{e.event==='LOGOUT'?<LogOut size={16}/>:<LogIn size={16}/>}</span><div><strong>{e.name}</strong><p>{e.event==='LOGOUT'?'Logged out':'Signed in'}</p></div><time dateTime={e.createdAt}>{time(e.createdAt)}</time></li>)}</ol>}
        </section>
      </div>
      <p className="access-footnote"><ShieldCheck size={14}/>Members of several restricted batches need approval from each batch.</p>
    </>}
  </div>;
}
