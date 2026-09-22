import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import type { User, Department } from '../types/index.js';

export const DirectoryView: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Filters State
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'PROFESSOR'>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [yearFilter, setYearFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dept' | 'year'>('name');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'PROFESSOR'>('STUDENT');
  const [departmentId, setDepartmentId] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState<number>(1);
  const [enrollmentId, setEnrollmentId] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsersAndDepts = async () => {
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.getUsers(),
        api.getDepartments()
      ]);
      setUsers(usersRes.users || []);
      setDepartments(deptsRes.departments || []);
      if (deptsRes.departments?.length > 0 && !departmentId) {
        setDepartmentId(deptsRes.departments[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load directory.' });
    }
  };

  useEffect(() => {
    fetchUsersAndDepts();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setTargetUserId(null);
    setFullName('');
    setEmail('');
    setPhoneNumber('');
    setPassword('');
    setRole('STUDENT');
    setYearOfStudy(1);
    setEnrollmentId(`STU${new Date().getFullYear()}${Math.floor(100 + Math.random() * 900)}`);
    if (departments.length > 0) setDepartmentId(departments[0].id);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setIsEditing(true);
    setTargetUserId(user.id);
    setFullName(user.fullName || (user as any).full_name || '');
    setEmail((user.email || '').split('@')[0]);
    setPhoneNumber(user.phoneNumber || '');
    setRole(user.role === 'PROFESSOR' ? 'PROFESSOR' : 'STUDENT');
    setDepartmentId(user.departmentId || (user as any).department_id || (departments[0]?.id ?? ''));
    setYearOfStudy(user.yearOfStudy || (user as any).year_of_study || 1);
    setEnrollmentId(user.enrollmentId || (user as any).enrollment_id || '');
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (isEditing && targetUserId) {
        await api.updateUser(targetUserId, {
          fullName,
          phoneNumber,
          email: `${email.split("@")[0]}@kahedu.edu.in`,
          role,
          departmentId,
          yearOfStudy: role === 'STUDENT' ? yearOfStudy : undefined,
          enrollmentId
        });
        setFeedback({ type: 'success', message: `Profile for ${fullName} updated successfully!` });
      } else {
        await api.createUser({
          fullName,
          phoneNumber,
          email: `${email.split("@")[0]}@kahedu.edu.in`,
          password,
          role,
          departmentId,
          yearOfStudy: role === 'STUDENT' ? yearOfStudy : undefined,
          enrollmentId
        });
        setFeedback({ type: 'success', message: `${role === 'STUDENT' ? 'Student' : 'Faculty'} ${fullName} registered successfully!` });
      }
      setIsModalOpen(false);
      fetchUsersAndDepts();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed.' });
    }
  };

  // Confirm Delete User State
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<{ id: string; name: string } | null>(null);

  const executeDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    setFeedback(null);
    try {
      await api.deleteUser(confirmDeleteUser.id);
      setFeedback({ type: 'success', message: `User ${confirmDeleteUser.name} removed from directory.` });
      setConfirmDeleteUser(null);
      fetchUsersAndDepts();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove user.' });
      setConfirmDeleteUser(null);
    }
  };

  // Client-Side Filter & Sort Pipeline
  const filteredUsers = useMemo(() => {
    return users
      .filter((u) => {
        if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
        if (deptFilter !== 'ALL' && (u.departmentId || (u as any).department_id) !== deptFilter) return false;
        if (yearFilter !== 'ALL' && (u.yearOfStudy || (u as any).year_of_study)?.toString() !== yearFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = (u.fullName || (u as any).full_name || '').toLowerCase().includes(q);
          const emailMatch = u.email.toLowerCase().includes(q);
          const enrMatch = (u.enrollmentId || (u as any).enrollment_id || '').toLowerCase().includes(q);
          if (!nameMatch && !emailMatch && !enrMatch) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const nameA = a.fullName || (a as any).full_name || '';
        const nameB = b.fullName || (b as any).full_name || '';
        if (sortBy === 'name') return nameA.localeCompare(nameB);
        if (sortBy === 'dept') {
          const deptA = a.departmentCode || (a as any).department_code || '';
          const deptB = b.departmentCode || (b as any).department_code || '';
          return deptA.localeCompare(deptB);
        }
        if (sortBy === 'year') {
          const yrA = a.yearOfStudy || (a as any).year_of_study || 0;
          const yrB = b.yearOfStudy || (b as any).year_of_study || 0;
          return yrA - yrB;
        }
        return 0;
      });
  }, [users, roleFilter, deptFilter, yearFilter, searchQuery, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Students & faculty</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Find and manage people by role, department or year.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Add a member</span>
        </button>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--kahe-green-soft)' : 'var(--accent-rose-soft)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--border-green)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: feedback.type === 'success' ? 'var(--kahe-green-light)' : '#FB7185'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Comprehensive Filter Bar */}
      <div className="filter-bar">
        {/* Role Switcher */}
        <div className="filter-group">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            ROLE:
          </span>
          <button
            className={`tab-pill ${roleFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setRoleFilter('ALL')}
          >
            All Members ({users.length})
          </button>
          <button
            className={`tab-pill ${roleFilter === 'STUDENT' ? 'active' : ''}`}
            onClick={() => setRoleFilter('STUDENT')}
          >
            Students ({users.filter((u) => u.role === 'STUDENT').length})
          </button>
          <button
            className={`tab-pill ${roleFilter === 'PROFESSOR' ? 'active' : ''}`}
            onClick={() => setRoleFilter('PROFESSOR')}
          >
            Faculty ({users.filter((u) => u.role === 'PROFESSOR').length})
          </button>
        </div>

        {/* Department & Year Dropdowns */}
        <div className="filter-group">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>DEPT:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '6px' }}>
            YEAR:
          </span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
          >
            <option value="ALL">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '6px' }}>
            SORT:
          </span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name">Name (A-Z)</option>
            <option value="dept">Department</option>
            <option value="year">Year</option>
          </select>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '220px' }}>
          <Search size={14} color="var(--text-dim)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '32px', paddingTop: '6px', paddingBottom: '6px', fontSize: '12px', marginBottom: 0 }}
            placeholder="Search by name, ID, email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Directory Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Member Information</th>
                <th>Role</th>
                <th>Department</th>
                <th>Year</th>
                <th>Register number</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                    No students or faculty match your active filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isProf = u.role === 'PROFESSOR';
                  const yr = u.yearOfStudy || (u as any).year_of_study;
                  const deptCode = u.departmentCode || (u as any).department_code || 'General';
                  const enrId = u.enrollmentId || (u as any).enrollment_id || '—';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: isProf ? 'var(--accent-blue-soft)' : 'var(--kahe-green-soft)',
                              color: isProf ? '#60A5FA' : 'var(--kahe-green-light)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '12px'
                            }}
                          >
                            {(u.fullName || (u as any).full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>
                              {u.fullName || (u as any).full_name}
                            </strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${isProf ? 'badge-blue' : 'badge-emerald'}`}>
                          {isProf ? <Briefcase size={11} /> : <GraduationCap size={11} />}
                          <span>{u.role}</span>
                        </span>
                      </td>

                      <td>
                        <span className="badge badge-purple">{deptCode}</span>
                      </td>

                      <td>
                        {isProf ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Faculty Member</span>
                        ) : yr ? (
                          <span className="badge badge-amber">Year {yr}</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Not Assigned</span>
                        )}
                      </td>

                      <td>
                        <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{enrId}</code>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '11px' }}
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            className="btn btn-danger"
                            style={{ padding: '5px 10px', fontSize: '11px' }}
                            onClick={() => setConfirmDeleteUser({ id: u.id, name: u.fullName || (u as any).full_name || 'User' })}
                            title="Delete User"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit User Profile: ${fullName}` : 'Register New Student or Faculty'}
      >
        <form onSubmit={handleSaveUser}>
          <div className="form-group">
            <label className="form-label">FULL NAME</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alan Turing"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">UNIVERSITY EMAIL (@kahedu.edu.in)</label>
            <input
              type="text"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alan.turing"
              pattern="[A-Za-z0-9._%+-]+"
              required
            />
          </div>

          <div className="form-group"><label className="form-label">PHONE NUMBER</label><input type="tel" className="form-input" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} maxLength={32} /></div>
          {!isEditing && (
            <div className="form-group">
              <label className="form-label">INITIAL PASSWORD</label>
              <input
                type="password"
                autoComplete="new-password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Set an initial password"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">INSTITUTIONAL ROLE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${role === 'STUDENT' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setRole('STUDENT')}
              >
                Student
              </button>
              <button
                type="button"
                className={`btn ${role === 'PROFESSOR' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setRole('PROFESSOR')}
              >
                Faculty / Professor
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">REGISTERED DEPARTMENT</label>
            <select
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          {role === 'STUDENT' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">YEAR OF STUDY</label>
                <select
                  className="form-select"
                  value={yearOfStudy}
                  onChange={(e) => setYearOfStudy(Number(e.target.value))}
                >
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">REGISTER NUMBER</label>
                <input
                  type="text"
                  className="form-input"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  placeholder="e.g. STU2026042"
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Changes' : 'Register Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE USER DIALOG */}
      {confirmDeleteUser && (
        <ConfirmDialog
          isOpen={Boolean(confirmDeleteUser)}
          title={`Remove ${confirmDeleteUser.name}?`}
          message={`Are you sure you want to remove "${confirmDeleteUser.name}" from the university directory? Their account credentials, timetable memberships, and historical logs will be removed.`}
          confirmText="Yes, Remove Member"
          cancelText="Cancel"
          isDestructive={true}
          onConfirm={executeDeleteUser}
          onCancel={() => setConfirmDeleteUser(null)}
        />
      )}
    </div>
  );
};
