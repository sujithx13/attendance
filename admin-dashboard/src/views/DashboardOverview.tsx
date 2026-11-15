import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  Building2,
  CalendarCheck,
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

const getTodayKolkata = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const genMessage = '';
  const [slotCount, setSlotCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState('');

  // Batch attendance overview state
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKolkata);
  const [batchAttendanceData, setBatchAttendanceData] = useState<Array<{
    id: string;
    name: string;
    code: string;
    presentCount: number;
    totalStudents: number;
  }>>([]);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);

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

  useEffect(() => {
    if (!batches.length) return;
    let isCancelled = false;

    const fetchBatchAttendance = async () => {
      setLoadingAttendance(true);
      try {
        const results = await Promise.all(
          batches.map(async (batch) => {
            try {
              const res = await api.batchAttendance(batch.id, selectedDate);
              const students = res.students || [];
              const presentCount = students.filter((s: any) =>
                Object.values(s.attendance || {}).some(
                  (status: any) => status === 'PRESENT' || status === 'LATE'
                )
              ).length;
              return {
                id: batch.id,
                name: batch.name,
                code: batch.code,
                presentCount,
                totalStudents: batch.memberCount ?? students.length
              };
            } catch (err) {
              console.error(`Failed to load attendance for batch ${batch.id}:`, err);
              return {
                id: batch.id,
                name: batch.name,
                code: batch.code,
                presentCount: 0,
                totalStudents: batch.memberCount ?? 0
              };
            }
          })
        );
        if (!isCancelled) {
          setBatchAttendanceData(results);
        }
      } catch (err) {
        console.error('Failed to load batch attendance summary', err);
      } finally {
        if (!isCancelled) {
          setLoadingAttendance(false);
        }
      }
    };

    fetchBatchAttendance();

    return () => {
      isCancelled = true;
    };
  }, [batches, selectedDate]);

  const studentsCount = users.filter((u) => u.role === 'STUDENT').length;
  const facultyCount = users.filter((u) => u.role === 'PROFESSOR').length;

  const totalPresentees = batchAttendanceData.reduce((sum, b) => sum + b.presentCount, 0);
  const totalBatchStudents = batchAttendanceData.reduce((sum, b) => sum + b.totalStudents, 0);



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
          </div>
          <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--on-surface)' }}>
            Your campus at a glance
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--secondary)', marginTop: '6px', maxWidth: '640px', lineHeight: '1.5' }}>
            Manage people, organize classes and keep track of attendance from one workspace.
          </p>
        </div>
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

      {/* Batch Attendance Summary */}
      <div className="card" style={{ padding: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <h3 className="card-title" style={{ margin: 0 }}>
              <span>Batch attendance summary</span>
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '4px' }}>
              Daily presentee counts across cohorts
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="batch-attendance-date" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>
              Date
            </label>
            <input
              id="batch-attendance-date"
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                width: 'auto',
                padding: '6px 12px',
                fontSize: '13px'
              }}
            />
            {selectedDate !== getTodayKolkata() && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                onClick={() => setSelectedDate(getTodayKolkata())}
              >
                Today
              </button>
            )}
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Batch Name</th>
                <th>Presentees</th>
                <th>Total Students</th>
              </tr>
            </thead>
            <tbody>
              {loadingAttendance && !batchAttendanceData.length ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--secondary)' }}>
                    Loading batch attendance...
                  </td>
                </tr>
              ) : batchAttendanceData.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--secondary)' }}>
                    No batches found.
                  </td>
                </tr>
              ) : (
                batchAttendanceData.map((b) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600, color: 'var(--on-surface)' }}>
                      <div>{b.name}</div>
                      {b.code && (
                        <div style={{ fontSize: '11.5px', color: 'var(--secondary)', fontWeight: 400, marginTop: '2px' }}>
                          {b.code}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={b.presentCount > 0 ? 'badge badge-emerald' : 'badge'}
                        style={
                          b.presentCount === 0
                            ? { backgroundColor: 'var(--surface-container-high)', color: 'var(--secondary)' }
                            : undefined
                        }
                      >
                        {b.presentCount}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>
                      {b.totalStudents}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {batchAttendanceData.length > 0 && (
              <tfoot>
                <tr style={{ backgroundColor: 'var(--surface-container-low)', fontWeight: 700 }}>
                  <td style={{ padding: '12px 18px', color: 'var(--on-surface)' }}>Total</td>
                  <td style={{ padding: '12px 18px' }}>
                    <span
                      className={totalPresentees > 0 ? 'badge badge-emerald' : 'badge'}
                      style={
                        totalPresentees === 0
                          ? { backgroundColor: 'var(--surface-container-high)', color: 'var(--secondary)' }
                          : undefined
                      }
                    >
                      {totalPresentees}
                    </span>
                  </td>
                  <td style={{ padding: '12px 18px', color: 'var(--on-surface)' }}>
                    {totalBatchStudents}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
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
              onClick={() => onNavigate('batches')}
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
