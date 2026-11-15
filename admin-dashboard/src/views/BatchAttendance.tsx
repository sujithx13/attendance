import { useEffect, useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { api } from '../services/api.js';

type Session = { id: string; name: string; startTime: string };
type Student = { id: string; name: string; registerNumber: string; department: string; email: string; phone: string; attendance: Record<string,string> };
type Report = { sessions: Session[]; students: Student[] };
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function BatchAttendance({ batchId }: { batchId: string }) {
  const [date, setDate] = useState(today);
  const [report, setReport] = useState<Report>({ sessions: [], students: [] });
  const [session, setSession] = useState('');
  const [downloadTarget, setDownloadTarget] = useState('all');
  const [present, setPresent] = useState(true);
  const [absent, setAbsent] = useState(true);
  const [sort, setSort] = useState<'name' | 'registerNumber'>('name');
  const [error, setError] = useState('');
  const [alerts, setAlerts] = useState<string[]>([]);
  const previous = useRef<Record<string, string> | null>(null);

  useEffect(() => {
    let active = true;
    previous.current = null;
    setAlerts([]);
    setSession('');
    setDownloadTarget('all');
    setReport({ sessions: [], students: [] });
    const load = async () => {
      try {
        const data = await api.batchAttendance(batchId, date);
        if (active) {
          const next: Record<string, string> = {};
          const updates: string[] = [];
          for (const u of data.students as Student[]) {
            for (const entry of Object.entries(u.attendance)) {
              const key = u.id + ':' + entry[0];
              next[key] = entry[1];
              if (previous.current && previous.current[key] !== entry[1] && ['PRESENT', 'LATE'].includes(entry[1])) {
                updates.push(u.name + ' marked ' + entry[1].toLowerCase() + ' for ' + (data.sessions.find((s: Session) => s.id === entry[0])?.name || 'session'));
              }
            }
          }
          previous.current = next;
          if (updates.length) setAlerts(old => [...updates, ...old].slice(0, 20));
          setReport(data);
          setError('');
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    };
    void load();
    const timer = setInterval(load, 5000);
    return () => { active = false; clearInterval(timer); };
  }, [batchId, date]);

  const label = (s: Session) => `${s.name} ${new Date(s.startTime).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`;

  const rows = report.students
    .filter(u => !session || (['PRESENT', 'LATE'].includes(u.attendance[session]) ? present : u.attendance[session] === 'ABSENT' ? absent : true))
    .sort((a, b) => (a[sort] || '').localeCompare(b[sort] || ''));

  const exportExcel = async (targetSessionId: string = downloadTarget) => {
    try {
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Attendance');

      const isIndividual = targetSessionId !== 'all';
      const targetSession = isIndividual ? report.sessions.find(s => s.id === targetSessionId) : null;
      const selectedSessions = targetSession ? [targetSession] : report.sessions;

      sheet.addRow(['Name', 'Register number', 'Department', 'Email', 'Phone', ...selectedSessions.map(label)]);
      for (const u of report.students) {
        sheet.addRow([
          u.name,
          u.registerNumber,
          u.department,
          u.email,
          u.phone,
          ...selectedSessions.map(s => u.attendance[s.id] || 'ABSENT')
        ]);
      }
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
      sheet.columns.forEach(c => { c.width = 24; });

      const bytes = await workbook.xlsx.writeBuffer();
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a = document.createElement('a');
      a.href = url;

      let filename = `${batchId}-${date}-attendance.xlsx`;
      if (targetSession) {
        const idx = report.sessions.findIndex(s => s.id === targetSession.id);
        const prefix = idx >= 0 ? `Session_${idx + 1}` : 'session';
        const cleanName = (targetSession.name || '').replace(/[^a-zA-Z0-9_-]/g, '_');
        filename = `${batchId}-${date}-${prefix}_${cleanName}-attendance.xlsx`;
      }
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError('Excel export failed: ' + (e as Error).message);
    }
  };

  const handleSessionFilterChange = (selectedSessionId: string) => {
    setSession(selectedSessionId);
    setDownloadTarget(selectedSessionId || 'all');
  };

  return (
    <section className="card">
      <h3>Daily attendance</h3>
      <div className="filter-bar" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '14px' }}>
          <label>
            Date
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} style={{ height: '44px' }} />
          </label>
          <label>
            Session
            <select className="form-select" value={session} onChange={e => handleSessionFilterChange(e.target.value)} style={{ height: '44px', minWidth: '180px' }}>
              <option value="">All sessions</option>
              {report.sessions.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Session {idx + 1}: {label(s)}
                </option>
              ))}
            </select>
          </label>
          {session && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--secondary)' }}>Status filter</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '44px' }}>
                <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--on-surface)' }}>
                  <input type="checkbox" checked={present} onChange={e => setPresent(e.target.checked)} /> Present
                </label>
                <label style={{ display: 'inline-flex', flexDirection: 'row', alignItems: 'center', gap: '6px', margin: 0, cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--on-surface)' }}>
                  <input type="checkbox" checked={absent} onChange={e => setAbsent(e.target.checked)} /> Absent
                </label>
              </div>
            </div>
          )}
          <label>
            Sort by
            <select className="form-select" value={sort} onChange={e => setSort(e.target.value as typeof sort)} style={{ height: '44px' }}>
              <option value="name">Name</option>
              <option value="registerNumber">Register number</option>
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', flexWrap: 'wrap', gap: '10px' }}>
          <label>
            Download attendance
            <select
              className="form-select"
              value={downloadTarget}
              onChange={e => setDownloadTarget(e.target.value)}
              style={{ minWidth: '220px', maxWidth: '300px', height: '44px' }}
            >
              <option value="all">Whole day (All sessions)</option>
              {report.sessions.map((s, idx) => (
                <option key={s.id} value={s.id}>
                  Session {idx + 1}: {label(s)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => exportExcel(downloadTarget)}
            disabled={!!error || !report.students.length || !report.sessions.length}
            style={{
              height: '44px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '0 16px',
              fontWeight: 600,
              fontSize: '13.5px',
              whiteSpace: 'nowrap',
            }}
          >
            <Download size={15} />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <div aria-live="polite">
        {alerts.map((message, i) => (
          <p key={i}>{message}</p>
        ))}
      </div>
      <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--secondary)' }}>
        Updates every 5 seconds. Future sessions and pending records retain their status. Unmarked sessions become absent after the session ends.
      </p>

      <div className="table-container" style={{ marginTop: '16px' }}>
        <table className="data-table">
          <thead>
            <tr>
              {['Name', 'Register number', 'Department', 'Email', 'Phone', ...report.sessions.filter(s => !session || s.id === session).map(label)].map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.registerNumber}</td>
                <td>{u.department}</td>
                <td>{u.email}</td>
                <td>{u.phone}</td>
                {report.sessions.filter(s => !session || s.id === session).map(s => (
                  <td key={s.id}>{u.attendance[s.id]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!report.sessions.length && <p style={{ marginTop: '14px', color: 'var(--secondary)' }}>No session occurrences for this day.</p>}
    </section>
  );
}

