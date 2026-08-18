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
  BookOpen,
  Bell,
  Award,
  FlaskConical,
  Mail,
  MapPin
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import type { Department, User, Course, Announcement } from '../types/index.js';

export const DepartmentsView: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetDeptId, setTargetDeptId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');

  // Selected Department Profile Hub
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'faculty' | 'classes' | 'facilities' | 'notices'>('overview');
  const [faculty, setFaculty] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
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

  const handleDeleteDepartment = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to remove department ${code}?`)) return;
    try {
      await api.deleteDepartment(id);
      setFeedback({ type: 'success', message: `Department ${code} deleted.` });
      if (selectedDept?.id === id) setSelectedDept(null);
      fetchDepartments();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete department.' });
    }
  };

  const handleSelectDept = async (dept: Department) => {
    setSelectedDept(dept);
    setActiveTab('overview');
    setFeedback(null);
    try {
      const [facRes, crsRes, annRes] = await Promise.all([
        api.getUsers({ role: 'PROFESSOR', departmentId: dept.id }),
        api.getCourses(dept.id),
        api.getAnnouncements('DEPARTMENT', dept.id)
      ]);
      setFaculty(facRes.users || []);
      setCourses(crsRes.courses || []);
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
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Academic Departments & Faculties</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Accredited university faculties governing core curricula, faculty directories, research laboratories, and student majors.
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {departments.map((dept) => (
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span className="badge badge-emerald" style={{ fontSize: '13px', padding: '4px 12px' }}>
                  {dept.code}
                </span>
                <span className="status-pill">
                  <span className="status-dot"></span>
                  Accredited Faculty
                </span>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: 'var(--on-surface)' }}>
                {dept.name}
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--secondary)', marginBottom: '16px' }}>
                Governing faculty body for undergraduate & postgraduate curricula.
              </p>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-around',
                  padding: '12px',
                  backgroundColor: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--outline)',
                  marginBottom: '16px',
                  fontSize: '12px'
                }}
              >
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--secondary)', display: 'block' }}>Faculty</span>
                  <strong style={{ fontSize: '14px' }}>4 Professors</strong>
                </div>
                <div style={{ width: '1px', backgroundColor: 'var(--outline)' }} />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--secondary)', display: 'block' }}>Curriculum</span>
                  <strong style={{ fontSize: '14px', color: 'var(--primary-container)' }}>Active Courses</strong>
                </div>
                <div style={{ width: '1px', backgroundColor: 'var(--outline)' }} />
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--secondary)', display: 'block' }}>Research</span>
                  <strong style={{ fontSize: '14px' }}>3 Labs</strong>
                </div>
              </div>
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
                <span>View Department Profile</span>
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
                  handleDeleteDepartment(dept.id, dept.code);
                }}
                title="Delete Department"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DETAILED DEPARTMENT PROFILE MODAL */}
      {selectedDept && (
        <Modal
          isOpen={Boolean(selectedDept)}
          onClose={() => setSelectedDept(null)}
          title={`Faculty Profile: ${selectedDept.code} — ${selectedDept.name}`}
          maxWidth="840px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Editorial Department Header */}
            <div
              style={{
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--outline)',
                borderRadius: 'var(--radius-sm)',
                padding: '24px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="badge badge-emerald" style={{ fontSize: '14px', padding: '4px 12px' }}>
                    {selectedDept.code}
                  </span>
                  <span className="badge badge-purple">Faculty of Technology</span>
                  <span className="badge badge-blue">NAAC A++ Accredited</span>
                </div>
                <span className="status-pill">
                  <span className="status-dot"></span>
                  Active Department
                </span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
                {selectedDept.name}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                Premier academic and research department under Karpagam Academy of Higher Education, dedicated to excellence in computational theory, software systems engineering, and interdisciplinary research.
              </p>

              <div style={{ display: 'flex', gap: '20px', marginTop: '16px', fontSize: '12.5px', color: 'var(--secondary)' }}>
                <span><MapPin size={13} style={{ display: 'inline', marginRight: '4px' }} /> Academic Block 3, Campus South</span>
                <span><Mail size={13} style={{ display: 'inline', marginRight: '4px' }} /> {selectedDept.code.toLowerCase()}@karpagam.edu.in</span>
              </div>
            </div>

            {/* Profile Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--outline)', paddingBottom: '10px', flexWrap: 'wrap' }}>
              <button
                className={`tab-pill ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Award size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Vision & Leadership
              </button>
              <button
                className={`tab-pill ${activeTab === 'faculty' ? 'active' : ''}`}
                onClick={() => setActiveTab('faculty')}
              >
                <GraduationCap size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Faculty Directory ({faculty.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={() => setActiveTab('classes')}
              >
                <BookOpen size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Curriculum Courses ({courses.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'facilities' ? 'active' : ''}`}
                onClick={() => setActiveTab('facilities')}
              >
                <FlaskConical size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Research Facilities (3)
              </button>
              <button
                className={`tab-pill ${activeTab === 'notices' ? 'active' : ''}`}
                onClick={() => setActiveTab('notices')}
              >
                <Bell size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Department Bulletins ({announcements.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW & LEADERSHIP */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>Head of Department Message</h4>
                  <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
                    "Welcome to the {selectedDept.name}. Our academic programs balance rigorous mathematical principles with modern engineering practices. We hold zero-tolerance for attendance fraud and maintain verifiable cryptographic presence across all lectures."
                  </p>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--primary-container)', fontWeight: 600 }}>
                    — Prof. Alan Turing, HOD {selectedDept.code}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="card" style={{ padding: '18px' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--on-surface)' }}>Vision</h5>
                    <p style={{ fontSize: '12.5px', color: 'var(--secondary)', lineHeight: '1.4' }}>
                      To be a center of excellence in education and research, developing globally competent, socially committed professionals.
                    </p>
                  </div>
                  <div className="card" style={{ padding: '18px' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--on-surface)' }}>Academic Policies</h5>
                    <p style={{ fontSize: '12.5px', color: 'var(--secondary)', lineHeight: '1.4' }}>
                      Students must fulfill a minimum of 75% attendance in both theory and practicals to qualify for end-semester examinations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FACULTY DIRECTORY */}
            {activeTab === 'faculty' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="form-label">TEACHING FACULTY & RESEARCH SCIENTISTS</span>
                {faculty.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                    No faculty assigned to this department yet.
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
                            width: '42px',
                            height: '42px',
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
                          <div style={{ fontSize: '12px', color: 'var(--secondary)' }}>{f.email}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--secondary)', marginTop: '2px' }}>
                            Specialization: Distributed Systems & Cryptographic Verification
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-emerald">Faculty Member</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 3: CLASSES */}
            {activeTab === 'classes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="form-label">OFFICIAL CURRICULUM COURSES</span>
                {courses.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                    No courses registered under this department yet.
                  </div>
                ) : (
                  courses.map((c) => (
                    <div
                      key={c.id}
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
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-emerald">{c.code}</span>
                          <strong style={{ fontSize: '14px' }}>{c.title || (c as any).name}</strong>
                          <span className="badge badge-blue">{(c as any).credits || 4} Credits</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '4px' }}>
                          Instructor: {c.professorName || 'Prof. Alan Turing'} • {c.studentCount || (c as any).student_count || 0} enrolled students
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 4: FACILITIES */}
            {activeTab === 'facilities' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="card" style={{ padding: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
                    Artificial Intelligence & Systems Lab
                  </h5>
                  <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                    Equipped with high-performance computing clusters and edge robotics testing rigs for AI specialization students.
                  </p>
                  <span className="badge badge-emerald" style={{ marginTop: '8px' }}>Room 204 • Turing Block</span>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
                    Network Security & Cryptography Center
                  </h5>
                  <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                    Dedicated infrastructure for zero-trust security audits, cryptographic rotating QR research, and BLE beacon sensor grids.
                  </p>
                  <span className="badge badge-emerald" style={{ marginTop: '8px' }}>Room 301 • Turing Block</span>
                </div>

                <div className="card" style={{ padding: '16px' }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>
                    Advanced Software Engineering Practicum
                  </h5>
                  <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                    Collaborative development workstations with automated testing benches and embedded micro-controllers.
                  </p>
                  <span className="badge badge-emerald" style={{ marginTop: '8px' }}>Room 102 • Lovelace Block</span>
                </div>
              </div>
            )}

            {/* TAB 5: BULLETINS */}
            {activeTab === 'notices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Bulletin Title (e.g. Department Symposium Registration)"
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
                      placeholder="Enter official departmental notice for faculty and enrolled majors..."
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                  {announcements.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--secondary)', textAlign: 'center', padding: '20px' }}>
                      No notices posted to this department.
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
                          <strong style={{ fontSize: '13px' }}>{a.title}</strong>
                          <span className={`badge ${a.priority === 'URGENT' ? 'badge-rose' : 'badge-emerald'}`}>
                            {a.priority}
                          </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '4px' }}>{a.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Department: ${code}` : 'Register New Academic Department'}
      >
        <form onSubmit={handleSaveDepartment}>
          <div className="form-group">
            <label className="form-label">DEPARTMENT CODE (ABBREVIATION)</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. CSE, IT, MECH, ECE, AERO"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">FULL DEPARTMENT NAME</label>
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
