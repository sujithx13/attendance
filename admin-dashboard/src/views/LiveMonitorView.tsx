import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  Radio,
  Clock,
  RefreshCw,
  Users,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api.js';
import type { SecurityViolation } from '../types/index.js';
import { useAuth } from '../context/AuthContext.js';

export const LiveMonitorView: React.FC = () => {
  const { token } = useAuth();
  const [summary, setSummary] = useState<{ activeSessions: number; checkInsToday: number } | null>(null);
  const [error, setError] = useState('');
  const [violations, setViolations] = useState<SecurityViolation[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState<{ id: string; text: string; time: string }[]>([]);

  const fetchAuditData = async () => {
    try {
      const [res, counts] = await Promise.all([api.getSecurityViolations(), api.getLiveSummary()]);
      setViolations(res.violations || []);
      setSummary(counts);
      setError('');
    } catch {
      setError('Live data could not be refreshed. Previously loaded data may be out of date.');
    }
  };

  useEffect(() => {
    fetchAuditData();
    const poll = window.setInterval(fetchAuditData, 15000);
    let retry: number | undefined;
    let disposed = false;

    // Connect to live WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket | null = null;
    const connect = () => { try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => ws?.send(JSON.stringify({ type: 'SUBSCRIBE', sessionId: 'CAMPUS', token }));
      ws.onclose = () => { setWsConnected(false); if (!disposed) retry = window.setTimeout(connect, 5000); };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'SUBSCRIBED') { setWsConnected(true); return; }
          if (data.type === 'ERROR') { setError(data.message); return; }
          fetchAuditData();
          setRecentEvents((prev) => [
            {
              id: Math.random().toString(),
              text: data.data ? `${data.data.studentName || 'Student'}: ${data.data.status} — ${data.data.decisionReason || ''}` : (data.message || data.type),
              time: new Date().toLocaleTimeString()
            },
            ...prev.slice(0, 15)
          ]);
        } catch {
          // ignore parsing error
        }
      };
    } catch {
      setWsConnected(false);
    } };
    connect();

    return () => {
      disposed = true;
      window.clearInterval(poll);
      window.clearTimeout(retry);
      if (ws) ws.close();
    };
  }, [token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {error && <div role="alert" style={{ color: 'var(--error)' }}>{error}</div>}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Live attendance & alerts</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Live attendance events and recorded verification alerts across campus sessions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: wsConnected ? 'var(--primary-soft)' : 'var(--warning-container)',
              color: wsConnected ? 'var(--primary-container)' : 'var(--warning)',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Radio size={14} className={wsConnected ? 'status-dot' : ''} />
            <span>{wsConnected ? 'WebSocket Live Stream Connected' : 'Polling Stream Active'}</span>
          </div>

          <button className="btn btn-secondary" onClick={fetchAuditData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">ACTIVE SESSIONS</span>
            <Activity size={18} color="var(--primary-container)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {summary?.activeSessions ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary-container)', marginTop: '4px' }}>
            Current active attendance sessions
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">CHECK-INS TODAY</span>
            <Users size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {summary?.checkInsToday ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--info)', marginTop: '4px' }}>
            Recorded present or late today
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">SECURITY VIOLATIONS</span>
            <ShieldAlert size={18} color="var(--error)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '8px', color: 'var(--error)' }}>
            {violations.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--error)', marginTop: '4px' }}>
            Latest recorded verification alerts
          </div>
        </div>
      </div>

      {/* Disciplinary Security Violations Table */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 className="card-title">
            <ShieldAlert size={18} color="var(--error)" />
            <span>Verification alerts</span>
          </h3>
          <span className="badge badge-emerald">
            Attendance verification
          </span>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Student Information</th>
                <th>Violation Type</th>
                <th>Severity</th>
                <th>Security Action</th>
              </tr>
            </thead>
            <tbody>
              {violations.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--secondary)', padding: '36px' }}>
                    {error ? 'Audit data is unavailable. Retry using Refresh.' : 'No recorded violations in the latest 100 audit entries.'}
                  </td>
                </tr>
              ) : (
                violations.map((v) => {
                  const rawType = v.violationType || (v as any).violation_type || 'SECURITY_ALERT';
                  const typeLabel = String(rawType).replace(/_/g, ' ');
                  const rawDate = v.createdAt || (v as any).created_at;
                  const dateLabel = rawDate ? new Date(rawDate).toLocaleString() : 'Recent';
                  const stuName = v.studentName || (v as any).student_name || v.studentId || (v as any).student_id || 'Student';
                  const isCritical = (v.severity || (v as any).severity) === 'CRITICAL';

                  return (
                    <tr key={v.id}>
                      <td style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '5px' }} />
                        {dateLabel}
                      </td>
                      <td>
                        <strong>{stuName}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--secondary)' }}>
                          {(v as any).enrollment_id || (v as any).enrollmentId || ''}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isCritical ? 'badge-rose' : 'badge-amber'}`}>
                          <AlertTriangle size={11} />
                          <span>{typeLabel}</span>
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '12px', color: isCritical ? 'var(--error)' : 'var(--warning)' }}>
                          {v.severity || 'HIGH'}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: 'var(--secondary)' }}>
                          Attendance Rejected & Flagged
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Event Stream */}
      <div className="card" style={{ padding: '24px' }}>
        <h3 className="card-title" style={{ marginBottom: '16px' }}>
          <Activity size={17} color="var(--primary-container)" />
          <span>Recent activity</span>
        </h3>

        {recentEvents.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'var(--secondary)', padding: '16px 0' }}>
            Listening for student check-ins, rotating QR handshakes, and session broadcasts…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentEvents.map((evt) => (
              <div
                key={evt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  border: '1px solid var(--outline)'
                }}
              >
                <span>{evt.text}</span>
                <span style={{ color: 'var(--secondary)', fontSize: '11.5px' }}>{evt.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
