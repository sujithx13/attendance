import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

interface BatchDepartmentAttendanceProps {
  batchId: string;
}

const getTodayKolkata = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export function parseDepartmentFromRegisterNumber(regNo?: string): string {
  if (!regNo) return 'Other';
  const clean = regNo.trim().toUpperCase();

  // Case 1: Engineering format with BE or BT prefix (e.g., 25BECSE234, 25BTAD040, 25BECY002, 25BEECE030, 25BTCB001)
  const engMatch = clean.match(/^\d{2}(?:BE|BT)([A-Z]+)\d+$/);
  if (engMatch) {
    let dept = engMatch[1];
    if (dept === 'CSE') dept = 'CS';
    if (dept === 'AD') dept = 'AI & DS';
    return dept;
  }

  // Case 2: Arts & Science / PG format with U or P suffix (e.g., 24CSU159, 24ADU001, 24ITU001, 26CAP001)
  const artsMatch = clean.match(/^\d{2}([A-Z]+)[UP]\d+$/);
  if (artsMatch) {
    let dept = artsMatch[1];
    if (dept === 'AD') dept = 'AI & DS';
    return dept;
  }

  // Case 3: Generic fallback: strip 2-digit year prefix and trailing roll digits
  const genericMatch = clean.match(/^\d{2}([A-Z]+)\d+$/);
  if (genericMatch) {
    let dept = genericMatch[1];
    if (dept.startsWith('BE') || dept.startsWith('BT')) dept = dept.substring(2);
    if (dept.endsWith('U') || dept.endsWith('P')) dept = dept.slice(0, -1);
    if (dept === 'CSE') dept = 'CS';
    if (dept === 'AD') dept = 'AI & DS';
    return dept || 'Other';
  }

  return 'Other';
}

export const BatchDepartmentAttendance: React.FC<BatchDepartmentAttendanceProps> = ({ batchId }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKolkata);
  const [loading, setLoading] = useState<boolean>(false);
  const [departmentData, setDepartmentData] = useState<Array<{
    department: string;
    presentCount: number;
    totalStudents: number;
  }>>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let isCancelled = false;

    const loadDepartmentAttendance = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.batchAttendance(batchId, selectedDate);
        if (isCancelled) return;

        const students = data.students || [];
        const deptMap: Record<string, { totalStudents: number; presentCount: number }> = {};

        for (const s of students) {
          const dept = parseDepartmentFromRegisterNumber(s.registerNumber || s.enrollmentId || s.enrollment_id);
          if (!deptMap[dept]) {
            deptMap[dept] = { totalStudents: 0, presentCount: 0 };
          }
          deptMap[dept].totalStudents++;
          const isPresent = Object.values(s.attendance || {}).some(
            (status: any) => status === 'PRESENT' || status === 'LATE'
          );
          if (isPresent) {
            deptMap[dept].presentCount++;
          }
        }

        const rows = Object.entries(deptMap)
          .map(([department, stats]) => ({
            department,
            presentCount: stats.presentCount,
            totalStudents: stats.totalStudents
          }))
          .sort((a, b) => a.department.localeCompare(b.department));

        setDepartmentData(rows);
      } catch (err: any) {
        if (!isCancelled) {
          console.error(`Failed to load department attendance for batch ${batchId}:`, err);
          setError(err.message || 'Failed to load department attendance.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadDepartmentAttendance();

    return () => {
      isCancelled = true;
    };
  }, [batchId, selectedDate]);

  const totalPresentees = departmentData.reduce((sum, d) => sum + d.presentCount, 0);
  const totalBatchStudents = departmentData.reduce((sum, d) => sum + d.totalStudents, 0);

  return (
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
            <span>Department attendance overview</span>
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '4px' }}>
            Department-wise presentee counts for this batch
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="dept-attendance-date" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--secondary)' }}>
            Date
          </label>
          <input
            id="dept-attendance-date"
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

      {error && <div role="alert" className="login-error" style={{ marginBottom: '14px' }}>{error}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Department</th>
              <th>Presentees</th>
              <th>Total Students</th>
            </tr>
          </thead>
          <tbody>
            {loading && !departmentData.length ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--secondary)' }}>
                  Loading department attendance...
                </td>
              </tr>
            ) : departmentData.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--secondary)' }}>
                  No student records found.
                </td>
              </tr>
            ) : (
              departmentData.map((d) => (
                <tr key={d.department}>
                  <td style={{ fontWeight: 600, color: 'var(--on-surface)' }}>{d.department}</td>
                  <td>
                    <span
                      className={d.presentCount > 0 ? 'badge badge-emerald' : 'badge'}
                      style={
                        d.presentCount === 0
                          ? { backgroundColor: 'var(--surface-container-high)', color: 'var(--secondary)' }
                          : undefined
                      }
                    >
                      {d.presentCount}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--on-surface-variant)' }}>
                    {d.totalStudents}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {departmentData.length > 0 && (
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
  );
};
