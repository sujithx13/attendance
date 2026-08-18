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
  Bell,
  Clock,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { api } from '../services/api.js';
import type { NavView } from '../components/layout/Sidebar.js';
import type { User, Department, Batch, Course, Announcement } from '../types/index.js';

interface DashboardOverviewProps {
  onNavigate: (view: NavView) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState('');

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [usersRes, deptRes, batchRes, courseRes, annRes] = await Promise.all([
          api.getUsers(),
          api.getDepartments(),
          api.getBatches(),
          api.getCourses(),
          api.getAnnouncements()
        ]);
        setUsers(usersRes.users || []);
        setDepartments(deptRes.departments || []);
        setBatches(batchRes.batches || []);
        setCourses(courseRes.courses || []);
        setAnnouncements(annRes.announcements || []);
      } catch (err) {
        console.error('Failed to load dashboard overview data', err);
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
            <span className="badge badge-emerald">CAMPUS CENTRAL HUB</span>
            <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Odd Semester 2026-27</span>
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--on-surface)' }}>
            Welcome to Karpagam Executive Portal
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary)', marginTop: '6px', maxWidth: '640px', lineHeight: '1.5' }}>
            Central administration console for student and teacher rosters, departmental curricula, cross-departmental cohorts, timetable templates, and live attendance telemetry.
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ padding: '12px 24px', fontSize: '14px' }}
          onClick={handleGenerateToday}
          disabled={generating}
        >
          <Zap size={16} />
          <span>{generating ? 'Spawning Sessions…' : 'Generate Daily Sessions from Timetable'}</span>
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
            {studentsCount || 4}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary-container)', marginTop: '4px' }}>
            Across 4 Academic Years
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">TEACHING FACULTY</span>
            <GraduationCap size={20} color="var(--info)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {facultyCount || 2}
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
            {departments.length || 4}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--accent-purple)', marginTop: '4px' }}>
            CSE, IT, MECH, ECE & more
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">FLEXIBLE BATCHES</span>
            <Layers size={20} color="var(--warning)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {batches.length || 2}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>
            Cross-Dept & Multi-Year
          </div>
        </div>

        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="form-label">CURRICULUM CLASSES</span>
            <CalendarCheck size={20} color="var(--primary-container)" />
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
            {courses.length || 3}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--primary-container)', marginTop: '4px' }}>
            Registered University Courses
          </div>
        </div>
      </div>

      {/* Quick Launch & Announcements Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Quick Management Shortcuts */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 className="card-title" style={{ marginBottom: '18px' }}>
            <span>Quick Cohort & Roster Operations</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '12px 16px' }}
              onClick={() => onNavigate('directory')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <UserPlus size={16} color="var(--primary-container)" />
                <span style={{ fontWeight: 600 }}>Manage Student & Faculty Directory</span>
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
                <span style={{ fontWeight: 600 }}>Configure New Cross-Dept Batch</span>
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
                <span style={{ fontWeight: 600 }}>Assign Timetable Template to Cohort</span>
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
                <span style={{ fontWeight: 600 }}>Review Security Audit & Anti-Spoofing Feed</span>
              </div>
              <ArrowRight size={14} color="var(--secondary)" />
            </button>
          </div>
        </div>

        {/* Campus Announcements Board */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <h3 className="card-title">
              <Bell size={18} color="var(--primary-container)" />
              <span>Campus & Cohort Notices</span>
            </h3>
            <span className="badge badge-emerald">
              {announcements.length} active notices
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
            {announcements.length === 0 ? (
              <div style={{ fontSize: '13px', color: 'var(--secondary)', textAlign: 'center', padding: '36px' }}>
                No active announcements published.
              </div>
            ) : (
              announcements.map((a) => {
                const isUrgent = a.priority === 'URGENT';
                const isAcademic = a.priority === 'ACADEMIC';
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--surface-container-low)',
                      borderLeft: `4px solid ${isUrgent ? 'var(--error)' : isAcademic ? 'var(--info)' : 'var(--primary-container)'}`,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--outline)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)' }}>{a.title}</span>
                      <span className={`badge ${isUrgent ? 'badge-rose' : isAcademic ? 'badge-blue' : 'badge-emerald'}`}>
                        {a.priority}
                      </span>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--secondary)', lineHeight: '1.4' }}>{a.content}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--secondary)', marginTop: '8px' }}>
                      <Clock size={11} />
                      <span>{a.author_name || a.authorName || 'Campus Administration'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
