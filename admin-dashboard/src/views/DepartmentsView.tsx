import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Send,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Users
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import type { Department, User, Announcement } from '../types/index.js';

export const DepartmentsView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // Confirm Delete Dialog State
  const [confirmDeleteDept, setConfirmDeleteDept] = useState<Department | null>(null);

  // Selected Department Profile Hub
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState<'faculty' | 'students' | 'notices'>('faculty');
  const [faculty, setFaculty] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'GENERAL' | 'ACADEMIC' | 'URGENT'>('ACADEMIC');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDepartments = async () => {
    try {
      const res = await api.getDepartments();
      setDepartments(res.departments || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load departments.' });
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setTargetDeptId(null);
    setCode('');
    setName('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setIsEditing(true);
    setTargetDeptId(dept.id);
    setCode(dept.code);
    setName(dept.name);
    setIsModalOpen(true);
  };

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (isEditing && targetDeptId) {
        await api.updateDepartment(targetDeptId, code.trim().toUpperCase(), name.trim());
        setFeedback({ type: 'success', message: `Department ${code} updated successfully!` });
      } else {
        await api.createDepartment(code.trim().toUpperCase(), name.trim());
        setFeedback({ type: 'success', message: `Department ${code} registered successfully!` });
      }
      setIsModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed.' });
    }
  };

  const executeDeleteDepartment = async () => {
    if (!confirmDeleteDept) return;
    try {
      await api.deleteDepartment(confirmDeleteDept.id);
      setFeedback({ type: 'success', message: `Department ${confirmDeleteDept.code} deleted successfully.` });
      if (selectedDept?.id === confirmDeleteDept.id) setSelectedDept(null);
      setConfirmDeleteDept(null);
      fetchDepartments();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete department.' });
      setConfirmDeleteDept(null);
    }
  };

  const handleSelectDept = async (dept: Department) => {
    setSelectedDept(dept);
    setActiveTab('faculty');
    setFeedback(null);
    try {
      const [facRes, stuRes, annRes] = await Promise.all([
        api.getUsers({ role: 'PROFESSOR', departmentId: dept.id }),
        api.getUsers({ role: 'STUDENT', departmentId: dept.id }),
        api.getAnnouncements('DEPARTMENT', dept.id)
      ]);
      setFaculty(facRes.users || []);
      setStudents(stuRes.users || []);
      setAnnouncements(annRes.announcements || []);
    } catch (err: any) {
      console.error('Failed to load department details', err);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDept || !annTitle || !annContent) return;
    try {
      await api.createAnnouncement({
        title: annTitle,
        content: annContent,
        priority: annPriority,
        scopeType: 'DEPARTMENT',
        scopeId: selectedDept.id
      });
      setFeedback({ type: 'success', message: 'Department notice published!' });
      setAnnTitle('');
      setAnnContent('');
      const annRes = await api.getAnnouncements('DEPARTMENT', selectedDept.id);
      setAnnouncements(annRes.announcements || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to publish announcement.' });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Academic Departments</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Official university faculty departments, teaching staff directories, and enrolled student rosters.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Add Academic Department</span>
        </button>
      </div>

      {feedback && (
        <div
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--primary-soft)' : 'var(--error-container)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(46, 125, 50, 0.3)' : 'rgba(186, 26, 26, 0.3)'}`,
            borderRadius: 'var(--radius-sm)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13.5px',
            color: feedback.type === 'success' ? 'var(--primary-container)' : 'var(--error)'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Departments Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {departments.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline)' }}>
            <Building2 size={36} color="var(--secondary)" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--on-surface)' }}>No Academic Departments Registered</h4>
            <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '4px' }}>
              Click <strong>"Add Academic Department"</strong> above to register a department (e.g. CSE, IT, MECH, ECE).
            </p>
          </div>
        ) : (
          departments.map((dept) => (
            <div
              key={dept.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderColor: selectedDept?.id === dept.id ? 'var(--primary-container)' : 'var(--outline)'
              }}
              onClick={() => handleSelectDept(dept)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '13px', padding: '4px 10px' }}>
                    {dept.code}
                  </span>
                  <span className="status-pill">
                    <span className="status-dot"></span>
                    Active
                  </span>
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)', marginBottom: '8px' }}>
                  {dept.name}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '14px', borderTop: '1px solid var(--outline)' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12.5px', padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectDept(dept);
                  }}
                >
                  <Building2 size={14} />
                  <span>View Details</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(dept);
                  }}
                  title="Edit Department"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteDept(dept);
                  }}
                  title="Delete Department"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* DEPARTMENT PROFILE MODAL */}
      {selectedDept && (
        <Modal
          isOpen={Boolean(selectedDept)}
          onClose={() => setSelectedDept(null)}
          title={`Department Profile: ${selectedDept.code} — ${selectedDept.name}`}
          maxWidth="840px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Department Header */}
            <div
              style={{
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--outline)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px 24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {selectedDept.code}
                  </span>
                  <span className="badge badge-purple">Academic Department</span>
                </div>
                <span className="status-pill">
                  <span className="status-dot"></span>
                  Active
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
                {selectedDept.name}
              </h3>
            </div>

            {/* Profile Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--outline)', paddingBottom: '10px' }}>
              <button
                className={`tab-pill ${activeTab === 'faculty' ? 'active' : ''}`}
                onClick={() => setActiveTab('faculty')}
              >
                <GraduationCap size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Teaching Faculty ({faculty.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Enrolled Students ({students.length})
              </button>
            </div>

            {/* TAB 1: FACULTY DIRECTORY */}
            {activeTab === 'faculty' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="form-label">DEPARTMENT TEACHING STAFF ({faculty.length})</span>
                {faculty.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                    No faculty assigned to this department yet. Add teachers via the Student & Faculty Roster.
                  </div>
                ) : (
                  faculty.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        backgroundColor: 'var(--surface-container-low)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--outline)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-soft)',
                            color: 'var(--primary-container)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '14px'
                          }}
                        >
                          {(f.fullName || 'P').charAt(0)}
                        </div>
                        <div>
                          <strong style={{ fontSize: '14px' }}>{f.fullName}</strong>
                          <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px' }}>{f.email}</div>
                        </div>
                      </div>
                      <span className="badge badge-emerald">Faculty Member</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: ENROLLED STUDENTS */}
            {activeTab === 'students' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="form-label">ENROLLED DEPARTMENT STUDENTS ({students.length})</span>
                {students.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                    No students enrolled in this department yet.
                  </div>
                ) : (
                  students.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 18px',
                        backgroundColor: 'var(--surface-container-low)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--outline)'
                      }}
                    >
                      <div>
                        <strong>{s.fullName}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px' }}>
                          {s.email} • <code style={{ fontSize: '11px' }}>{s.enrollmentId || 'No ID'}</code>
                        </div>
                      </div>
                      <span className="badge badge-blue">Year {s.yearOfStudy || 1}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: BULLETINS */}
            {activeTab === 'notices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Bulletin Title"
                      value={annTitle}
                      onChange={(e) => setAnnTitle(e.target.value)}
                      required
                    />
                    <select
                      className="form-select"
                      value={annPriority}
                      onChange={(e) => setAnnPriority(e.target.value as any)}
                    >
                      <option value="GENERAL">General</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="Enter official departmental notice..."
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'stretch' }}>
                      <Send size={14} />
                      <span>Post</span>
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
                  {announcements.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--secondary)', textAlign: 'center', padding: '20px' }}>
                      No announcements posted to this department.
                    </div>
                  ) : (
                    announcements.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '12px 16px',
                          backgroundColor: 'var(--surface-container-low)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--outline)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13.5px' }}>{a.title}</strong>
                          <span className={`badge ${a.priority === 'URGENT' ? 'badge-rose' : 'badge-purple'}`}>
                            {a.priority}
                          </span>
                        </div>
                        <p style={{ fontSize: '12.5px', color: 'var(--secondary)', marginTop: '4px' }}>{a.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* CONFIRM DELETE DEPARTMENT DIALOG */}
      {confirmDeleteDept && (
        <ConfirmDialog
          isOpen={Boolean(confirmDeleteDept)}
          title={`Delete Department ${confirmDeleteDept.code}?`}
          message={`Are you sure you want to remove the department "${confirmDeleteDept.name}"? Faculty and students assigned to this department will remain in the directory with department set to None.`}
          confirmText="Yes, Delete Department"
          cancelText="Cancel"
          isDestructive={true}
          onConfirm={executeDeleteDepartment}
          onCancel={() => setConfirmDeleteDept(null)}
        />
      )}

      {/* CREATE / EDIT DEPARTMENT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Department: ${code}` : 'Register Academic Department'}
      >
        <form onSubmit={handleSaveDepartment}>
          <div className="form-group">
            <label className="form-label">DEPARTMENT CODE</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. CSE, IT, MECH, ECE"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">DEPARTMENT NAME</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Computer Science & Engineering"
              required
            />
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Save Changes' : 'Register Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
