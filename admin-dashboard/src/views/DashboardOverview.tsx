import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  CalendarCheck,
  Zap,
  ArrowRight,
  UserPlus,
  Plus,
  ShieldAlert,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { api } from '../services/api.js';
import type { NavView } from '../components/layout/Sidebar.js';
import type { User, Department, Batch } from '../types/index.js';

interface DashboardOverviewProps {
  onNavigate: (view: NavView) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');
  const [slotCount, setSlotCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [usersRes, deptRes, batchRes, timetableRes] = await Promise.all([
          api.getUsers(),
          api.getDepartments(),
          api.getBatches(),
          api.getTimetableSlots()
        ]);
        setUsers(usersRes.users || []);
        setDepartments(deptRes.departments || []);
        setBatches(batchRes.batches || []);
        setSlotCount(timetableRes.slots.length);
      } catch (err) {
        console.error('Failed to load dashboard overview data', err);
        setLoadError('Some overview data could not load. Refresh the page to try again.');
      }
    };
    loadOverviewData();
  }, []);

  const studentsCount = users.filter((u) => u.role === 'STUDENT').length;
  const facultyCount = users.filter((u) => u.role === 'PROFESSOR').length;

  const handleGenerateToday = async () => {
    setGenerating(true);
    setGenMessage('');
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.generateSessionsForDate(today);
      setGenMessage(`Spawned ${res.sessionsGenerated} live class/batch attendance sessions for today!`);
    } catch (err: any) {
      setGenMessage(err.message || 'Failed to spawn sessions.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {loadError && <div role="alert" className="login-error">{loadError}</div>}
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.08) 0%, #ffffff 70%)',
          border: '1px solid var(--outline)',
          borderRadius: 'var(--radius-lg)',
          padding: '28px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          boxShadow: 'var(--shadow-ambient)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="badge badge-emerald">CAMPUS OVERVIEW</span>
            <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Odd Semester 2026-27</span>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--on-surface)' }}>
            Your campus at a glance
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary)', marginTop: '6px', maxWidth: '640px', lineHeight: '1.5' }}>
            Manage people, organize classes and keep track of attendance from one workspace.
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '14px' }}
          onClick={handleGenerateToday}
          disabled={generating}
        >
          <Zap size={16} />
          <span>{generating ? 'Spawning Sessions…' : "Prepare today's sessions"}</span>
        </button>
      </div>

      {genMessage && (
        <div
          style={{
            backgroundColor: 'var(--primary-soft)',
            border: '1px solid rgba(46, 125, 50, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--primary-container)'
          }}
        >
          <CheckCircle2 size={18} />
          <span>{genMessage}</span>
        </div>
      )}

      {/* KPI Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">REGISTERED STUDENTS</span>
            <Users size={20} color="var(--primary-container)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {studentsCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary-container)', marginTop: '4px' }}>
            Registered Students
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">TEACHING FACULTY</span>
            <GraduationCap size={20} color="var(--info)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {facultyCount}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--info)', marginTop: '4px' }}>
            Professors & Instructors
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">ACADEMIC DEPARTMENTS</span>
            <Building2 size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {departments.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-purple)', marginTop: '4px' }}>
            University Departments
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">FLEXIBLE BATCHES</span>
            <Layers size={20} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {batches.length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>
            Active Cohorts
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">TIMETABLE SLOTS</span>
            <CalendarCheck size={20} color="var(--primary-container)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {slotCount ?? '—'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary-container)', marginTop: '4px' }}>
            Scheduled timetable slots
          </div>
        </div>
      </div>

      {/* Quick management actions */}
      <div className="overview-actions">
        {/* Quick Management Shortcuts */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '18px' }}>
            <span>Quick actions</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
              onClick={() => onNavigate('directory')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserPlus size={16} color="var(--primary-container)" />
                <span style={{ fontWeight: 600 }}>Manage students & faculty</span>
              </div>
              <ArrowRight size={14} color="var(--secondary)" />
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
              onClick={() => onNavigate('batches')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Plus size={16} color="var(--accent-purple)" />
                <span style={{ fontWeight: 600 }}>Create a batch</span>
              </div>
              <ArrowRight size={14} color="var(--secondary)" />
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
              onClick={() => onNavigate('templates')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CalendarCheck size={16} color="var(--warning)" />
                <span style={{ fontWeight: 600 }}>Manage timetables</span>
              </div>
              <ArrowRight size={14} color="var(--secondary)" />
            </button>

            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
              onClick={() => onNavigate('monitor')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={16} color="var(--error)" />
                <span style={{ fontWeight: 600 }}>View attendance alerts</span>
              </div>
              <ArrowRight size={14} color="var(--secondary)" />
            </button>
          </div>
        </div>


      </div>
    </div>
  );
};
