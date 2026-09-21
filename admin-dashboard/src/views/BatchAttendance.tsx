import { useEffect, useState, useRef } from 'react';
import { api } from '../services/api.js';

type Session = { id: string; name: string; startTime: string };
type Student = { id: string; name: string; registerNumber: string; department: string; email: string; phone: string; attendance: Record<string,string> };
type Report = { sessions: Session[]; students: Student[] };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function BatchAttendance({ batchId }: { batchId: string }) {
  const [date,setDate] = useState(today);
  const [report,setReport] = useState<Report>({ sessions: [], students: [] });
  const [session,setSession] = useState('');
  const [present,setPresent] = useState(true);
  const [absent,setAbsent] = useState(true);
  const [sort,setSort] = useState<'name'|'registerNumber'>('name');
  const [error,setError] = useState('');
  const [alerts,setAlerts] = useState<string[]>([]);
  const previous = useRef<Record<string,string>|null>(null);
  useEffect(() => {
    let active = true; previous.current=null; setAlerts([]); setSession(''); setReport({ sessions: [], students: [] });
    const load = async () => { try { const data = await api.batchAttendance(batchId,date); if(active) {
      const next:Record<string,string>={}; const updates:string[]=[];
      for(const u of data.students as Student[]) for(const entry of Object.entries(u.attendance)) {
        const key=u.id+':'+entry[0];next[key]=entry[1];
        if(previous.current && previous.current[key]!==entry[1] && ['PRESENT','LATE'].includes(entry[1])) updates.push(u.name+' marked '+entry[1].toLowerCase()+' for '+(data.sessions.find((s:Session)=>s.id===entry[0])?.name||'session'));
      }
      previous.current=next;if(updates.length)setAlerts(old=>[...updates,...old].slice(0,20));setReport(data); setError('');
    } } catch(e) { if(active) setError((e as Error).message); } };
    void load(); const timer = setInterval(load,5000); return () => { active=false; clearInterval(timer); };
  },[batchId,date]);
  const label = (s:Session) => `${s.name} ${new Date(s.startTime).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'})}`;
  const rows = report.students.filter(u => !session || (['PRESENT','LATE'].includes(u.attendance[session]) ? present : u.attendance[session] === 'ABSENT' ? absent : true)).sort((a,b)=>(a[sort] || '').localeCompare(b[sort] || ''));
  const exportExcel = async () => {
    try {
      const ExcelJS=await import('exceljs');
      const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Attendance');
      sheet.addRow(['Name','Register number','Department','Email','Phone',...report.sessions.map(label)]);
      for(const u of report.students) sheet.addRow([u.name,u.registerNumber,u.department,u.email,u.phone,...report.sessions.map(s=>u.attendance[s.id])]);
      sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];sheet.columns.forEach(c=>{c.width=24;});
      const bytes=await workbook.xlsx.writeBuffer();
      const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=`${batchId}-${date}-attendance.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e) {setError('Excel export failed: '+(e as Error).message);}
  };
  return <section className="card"><h3>Daily attendance</h3><div className="filter-bar">
    <label>Date <input type="date" className="form-input" value={date} onChange={e=>setDate(e.target.value)} /></label>
    <label>Session <select className="form-select" value={session} onChange={e=>setSession(e.target.value)}><option value="">All sessions</option>{report.sessions.map(s=><option key={s.id} value={s.id}>{label(s)}</option>)}</select></label>
    {session && <><label><input type="checkbox" checked={present} onChange={e=>setPresent(e.target.checked)} /> Present</label><label><input type="checkbox" checked={absent} onChange={e=>setAbsent(e.target.checked)} /> Absent</label></>}
    <label>Sort <select className="form-select" value={sort} onChange={e=>setSort(e.target.value as typeof sort)}><option value="name">Name</option><option value="registerNumber">Register number</option></select></label>
    <button className="btn btn-secondary" onClick={exportExcel} disabled={!!error || !report.students.length}>Export day to Excel</button></div>
    {error && <p role="alert">{error}</p>}<div aria-live="polite">{alerts.map((message,i)=><p key={i}>{message}</p>)}</div>
    <p>Updates every 5 seconds. Future sessions and pending records retain their status. Unmarked sessions become absent after the session ends.</p>
    <div className="table-container"><table className="data-table"><thead><tr>{['Name','Register number','Department','Email','Phone',...report.sessions.filter(s=>!session||s.id===session).map(label)].map((h,i)=><th key={i}>{h}</th>)}</tr></thead><tbody>{rows.map(u=><tr key={u.id}><td>{u.name}</td><td>{u.registerNumber}</td><td>{u.department}</td><td>{u.email}</td><td>{u.phone}</td>{report.sessions.filter(s=>!session||s.id===session).map(s=><td key={s.id}>{u.attendance[s.id]}</td>)}</tr>)}</tbody></table></div>
    {!report.sessions.length && <p>No session occurrences for this day.</p>}
  </section>;
}
