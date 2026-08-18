import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  Send,
  BookOpen,
  GraduationCap,
  Users,
  Calendar,
  Bell,
  MapPin,
  Award,
  CheckSquare,
  FileText
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import type { Course, Department, User, TimetableSlot, Announcement } from '../types/index.js';

export const ClassesView: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);

  // Create/Edit Class Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetCourseId, setTargetCourseId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [credits, setCredits] = useState(4);
  const [description, setDescription] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [learningOutcomes, setLearningOutcomes] = useState('');

  // Selected Cohort Detail Drawer
  const [selectedCohort, setSelectedCohort] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'syllabus' | 'staff' | 'roster' | 'timetable' | 'notices'>('syllabus');
  const [roster, setRoster] = useState<User[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [studentToEnroll, setStudentToEnroll] = useState('');
  const [allStudents, setAllStudents] = useState<User[]>([]);

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'GENERAL' | 'ACADEMIC' | 'URGENT'>('ACADEMIC');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchClassesAndMeta = async () => {
    try {
      const [courseRes, deptRes, userRes, studentRes] = await Promise.all([
        api.getCourses(),
        api.getDepartments(),
        api.getUsers({ role: 'PROFESSOR' }),
        api.getUsers({ role: 'STUDENT' })
      ]);
      setCourses(courseRes.courses || []);
      setDepartments(deptRes.departments || []);
      setProfessors(userRes.users || []);
      setAllStudents(studentRes.users || []);
      if (studentRes.users?.length > 0 && !studentToEnroll) {
        setStudentToEnroll(studentRes.users[0].id);
      }
      if (deptRes.departments?.length > 0 && !departmentId) {
        setDepartmentId(deptRes.departments[0].id);
      }
      if (userRes.users?.length > 0 && !professorId) {
        setProfessorId(userRes.users[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load courses.' });
    }
  };

  useEffect(() => {
    fetchClassesAndMeta();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setTargetCourseId(null);
    setCode('');
    setTitle('');
    setCredits(4);
    setDescription('Comprehensive university course covering theoretical foundations, empirical laboratory work, and modern industry applications.');
    setPrerequisites('Basic Computing & High School Mathematics');
    setSyllabus('Unit I: Theoretical Foundations\nUnit II: Applied System Design\nUnit III: Optimization & Complexity\nUnit IV: Laboratory Practicum');
    setLearningOutcomes('Students will achieve rigorous analytical competence, practical implementation experience, and verification capabilities.');
    if (departments.length > 0) setDepartmentId(departments[0].id);
    if (professors.length > 0) setProfessorId(professors[0].id);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Course) => {
    setIsEditing(true);
    setTargetCourseId(c.id);
    setCode(c.code);
    setTitle(c.title || (c as any).name || '');
    setCredits((c as any).credits || 4);
    setDescription((c as any).description || '');
    setPrerequisites((c as any).prerequisites || '');
    setSyllabus((c as any).syllabus || '');
    setLearningOutcomes((c as any).learning_outcomes || '');
    setDepartmentId(c.departmentId || (c as any).department_id || (departments[0]?.id ?? ''));
    setProfessorId(c.professorId || (c as any).professor_id || (professors[0]?.id ?? ''));
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (isEditing && targetCourseId) {
        await api.updateCourse(targetCourseId, {
          code,
          title,
          departmentId,
          professorId,
          credits,
          description,
          prerequisites,
          syllabus,
          learningOutcomes
        } as any);
        setFeedback({ type: 'success', message: `Class ${code} updated successfully!` });
      } else {
        await api.createCourse({
          code,
          title,
          departmentId,
          professorId,
          credits,
          description,
          prerequisites,
          syllabus,
          learningOutcomes
        } as any);
        setFeedback({ type: 'success', message: `Class ${code} created successfully!` });
      }
      setIsModalOpen(false);
      fetchClassesAndMeta();
      if (selectedCohort && targetCourseId === selectedCohort.id) {
        handleSelectCohort({ ...selectedCohort, code, title, credits, description } as any);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Operation failed.' });
    }
  };

  const handleDeleteClass = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete class ${code}? All its timetable slots and enrollments will be purged.`)) return;
    try {
      await api.deleteCourse(id);
      setFeedback({ type: 'success', message: `Class ${code} removed.` });
      if (selectedCohort?.id === id) setSelectedCohort(null);
      fetchClassesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete class.' });
    }
  };

  // Open Detailed Cohort Profile Hub
  const handleSelectCohort = async (c: Course) => {
    setSelectedCohort(c);
    setActiveTab('syllabus');
    setFeedback(null);
    try {
      const [studentsRes, slotsRes, annRes] = await Promise.all([
        api.getCourseStudents(c.id),
        api.getTimetableSlots({ courseId: c.id }),
        api.getAnnouncements('CLASS', c.id)
      ]);
      setRoster(studentsRes.students || []);
      setTimetable(slotsRes.slots || []);
      setAnnouncements(annRes.announcements || []);
    } catch (err: any) {
      console.error('Failed to load cohort details', err);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort || !studentToEnroll) return;
    try {
      await api.enrollStudentInCourse(selectedCohort.id, studentToEnroll);
      setFeedback({ type: 'success', message: 'Student enrolled successfully into class!' });
      const studentsRes = await api.getCourseStudents(selectedCohort.id);
      setRoster(studentsRes.students || []);
      fetchClassesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to enroll student.' });
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!selectedCohort) return;
    if (!confirm(`Remove ${studentName} from this class?`)) return;
    try {
      await api.removeStudentFromCourse(selectedCohort.id, studentId);
      setFeedback({ type: 'success', message: `Removed ${studentName} from class.` });
      const studentsRes = await api.getCourseStudents(selectedCohort.id);
      setRoster(studentsRes.students || []);
      fetchClassesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove student.' });
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCohort || !annTitle || !annContent) return;
    try {
      await api.createAnnouncement({
        title: annTitle,
        content: annContent,
        priority: annPriority,
        scopeType: 'CLASS',
        scopeId: selectedCohort.id
      });
      setFeedback({ type: 'success', message: 'Announcement published to class notice board!' });
      setAnnTitle('');
      setAnnContent('');
      const annRes = await api.getAnnouncements('CLASS', selectedCohort.id);
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
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Departmental Classes & Curriculum</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Official university courses bound to host departments. Click any course to view its comprehensive academic profile, syllabus, roster, and schedule.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Create New Class</span>
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

      {/* Classes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {courses.map((c) => {
          const deptCode = c.departmentCode || (c as any).department_code || 'CSE';
          const profName = c.professorName || (c as any).professor_name || 'Prof. Alan Turing';
          const stuCount = c.studentCount || (c as any).student_count || 0;
          const creditsCount = (c as any).credits || 4;

          return (
            <div
              key={c.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderColor: selectedCohort?.id === c.id ? 'var(--primary-container)' : 'var(--outline)'
              }}
              onClick={() => handleSelectCohort(c)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="badge badge-emerald">{c.code}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span className="badge badge-purple">{deptCode}</span>
                    <span className="badge badge-blue">{creditsCount} Credits</span>
                  </div>
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px', color: 'var(--on-surface)' }}>
                  {c.title || (c as any).name}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--secondary)', marginBottom: '16px', lineHeight: '1.4' }}>
                  {(c as any).description?.slice(0, 95) || 'Comprehensive academic coursework.'}…
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '12px 14px',
                    backgroundColor: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    fontSize: '12.5px',
                    border: '1px solid var(--outline)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--secondary)' }}>Course Instructor:</span>
                    <strong>{profName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--secondary)' }}>Enrolled Students:</span>
                    <strong style={{ color: 'var(--primary-container)' }}>{stuCount} Registered</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--outline)' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12.5px', padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCohort(c);
                  }}
                >
                  <BookOpen size={14} />
                  <span>View Academic Profile</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(c);
                  }}
                  title="Edit Class"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(c.id, c.code);
                  }}
                  title="Delete Class"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED CLASS PROFILE MODAL */}
      {selectedCohort && (
        <Modal
          isOpen={Boolean(selectedCohort)}
          onClose={() => setSelectedCohort(null)}
          title={`Course Academic Profile: ${selectedCohort.code} — ${selectedCohort.title || (selectedCohort as any).name}`}
          maxWidth="840px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Editorial Course Banner */}
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
                  <span className="badge badge-emerald" style={{ fontSize: '13px', padding: '4px 10px' }}>
                    {selectedCohort.code}
                  </span>
                  <span className="badge badge-purple">
                    {selectedCohort.departmentCode || (selectedCohort as any).department_code || 'Computer Science'}
                  </span>
                  <span className="badge badge-blue">
                    {(selectedCohort as any).credits || 4} Credit Units
                  </span>
                </div>
                <span className="status-pill">
                  <span className="status-dot"></span>
                  Active Curriculum
                </span>
              </div>

              <h3 style={{ fontSize: '20px', fontWeight: 800, marginTop: '8px', color: 'var(--on-surface)' }}>
                {selectedCohort.title || (selectedCohort as any).name}
              </h3>
              <p style={{ fontSize: '13.5px', color: 'var(--secondary)', marginTop: '6px', lineHeight: '1.5' }}>
                {(selectedCohort as any).description || 'Comprehensive university curriculum course covering fundamental principles and advanced implementations.'}
              </p>
            </div>

            {/* Profile Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--outline)', paddingBottom: '10px', flexWrap: 'wrap' }}>
              <button
                className={`tab-pill ${activeTab === 'syllabus' ? 'active' : ''}`}
                onClick={() => setActiveTab('syllabus')}
              >
                <FileText size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Syllabus & Prerequisites
              </button>
              <button
                className={`tab-pill ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff')}
              >
                <GraduationCap size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Faculty Leadership
              </button>
              <button
                className={`tab-pill ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => setActiveTab('roster')}
              >
                <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Student Roster ({roster.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'timetable' ? 'active' : ''}`}
                onClick={() => setActiveTab('timetable')}
              >
                <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Class Schedule ({timetable.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'notices' ? 'active' : ''}`}
                onClick={() => setActiveTab('notices')}
              >
                <Bell size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Announcements ({announcements.length})
              </button>
            </div>

            {/* TAB 1: SYLLABUS & PREREQUISITES */}
            {activeTab === 'syllabus' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="card" style={{ padding: '18px 20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckSquare size={16} color="var(--primary-container)" />
                    <span>Prerequisites & Eligibility</span>
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                    {(selectedCohort as any).prerequisites || 'Basic Mathematics & Principles of Computer Programming.'}
                  </p>
                </div>

                <div className="card" style={{ padding: '18px 20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--primary-container)" />
                    <span>Curriculum Syllabus Outline</span>
                  </h4>
                  <div style={{ whiteSpace: 'pre-line', fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.6' }}>
                    {(selectedCohort as any).syllabus || 'Unit I: Core Constructs & Architecture\nUnit II: Advanced Data Structures & Dynamic Allocation\nUnit III: Optimization & Complexity Analysis\nUnit IV: Applied Laboratory Practicums'}
                  </div>
                </div>

                <div className="card" style={{ padding: '18px 20px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={16} color="var(--primary-container)" />
                    <span>Course Learning Outcomes (CLOs)</span>
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.5' }}>
                    {(selectedCohort as any).learning_outcomes || 'Mastery of algorithmic complexity, rigorous design patterns, and hands-on system verification with minimum 75% attendance compliance.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: FACULTY LEADERSHIP */}
            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    padding: '24px',
                    backgroundColor: 'var(--surface-container-low)',
                    border: '1px solid var(--outline)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-soft)',
                      color: 'var(--primary-container)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 800,
                      border: '2px solid rgba(46, 125, 50, 0.2)'
                    }}
                  >
                    {(selectedCohort.professorName || 'P').charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '18px', fontWeight: 800 }}>{selectedCohort.professorName || 'Prof. Alan Turing'}</h4>
                    <div style={{ fontSize: '13px', color: 'var(--secondary)' }}>
                      Lead Professor • Department of Computer Science & Engineering
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '4px' }}>
                      Email: <strong>{selectedCohort.professor_email || 'prof.alan@university.edu'}</strong> • Cabin: Turing Block, Room 304
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <span className="badge badge-emerald">Primary Course Instructor</span>
                      <span className="badge badge-blue">Office Hours: Mon/Wed 2:00 - 4:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ROSTER */}
            {activeTab === 'roster' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handleEnrollStudent} style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className="form-label">ENROLL STUDENT INTO THIS CLASS</label>
                    <select
                      className="form-select"
                      value={studentToEnroll}
                      onChange={(e) => setStudentToEnroll(e.target.value)}
                    >
                      {allStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.departmentCode || 'Dept'} • Year {s.yearOfStudy || 1} • {s.enrollmentId || s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary">
                    <UserPlus size={14} />
                    <span>Enroll Student</span>
                  </button>
                </form>

                <div className="table-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Email & Enrollment ID</th>
                        <th>Department</th>
                        <th>Year</th>
                        <th>Attendance Standing</th>
                        <th style={{ textAlign: 'right' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--secondary)', padding: '24px' }}>
                            No students enrolled in this course yet.
                          </td>
                        </tr>
                      ) : (
                        roster.map((s, idx) => (
                          <tr key={s.id || idx}>
                            <td>
                              <strong>{s.fullName}</strong>
                            </td>
                            <td>
                              <div>{s.email}</div>
                              <code style={{ fontSize: '11px', color: 'var(--secondary)' }}>{s.enrollmentId || 'STU202600' + (idx + 1)}</code>
                            </td>
                            <td>
                              <span className="badge badge-purple">{s.departmentCode || 'CSE'}</span>
                            </td>
                            <td>
                              <span className="badge badge-emerald">Year {s.yearOfStudy || 2}</span>
                            </td>
                            <td>
                              <span className="badge badge-emerald">100% (Good Standing)</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="btn btn-danger"
                                style={{ padding: '5px 10px', fontSize: '11.5px' }}
                                onClick={() => handleRemoveStudent(s.id, s.fullName || 'this student')}
                                title="Remove student from class"
                              >
                                <Trash2 size={12} />
                                <span>Remove</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: TIMETABLE */}
            {activeTab === 'timetable' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span className="form-label">ASSIGNED SCHEDULE SLOTS & CLASSROOM LOCATIONS</span>
                {timetable.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--outline)' }}>
                    No timetable slots directly assigned yet. You can assign a saved template from the Timetable Templates tab.
                  </div>
                ) : (
                  timetable.map((slot) => (
                    <div
                      key={slot.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 18px',
                        backgroundColor: 'var(--surface-container-low)',
                        borderRadius: 'var(--radius-sm)',
                        borderLeft: '4px solid var(--primary-container)',
                        border: '1px solid var(--outline)'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][slot.dayOfWeek || 0]}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {slot.startTime} – {slot.endTime} • <MapPin size={12} style={{ display: 'inline', marginRight: '4px', marginLeft: '6px' }} /> {slot.classroomName || 'Turing Hall (Building A)'}
                        </div>
                      </div>
                      <span className="badge badge-emerald">Geofenced Classroom</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 5: ANNOUNCEMENTS */}
            {activeTab === 'notices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <form onSubmit={handlePostAnnouncement} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Notice Title (e.g. Midterm Examination Schedule)"
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
                      placeholder="Write announcement message for enrolled class members..."
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" style={{ alignSelf: 'stretch' }}>
                      <Send size={14} />
                      <span>Publish</span>
                    </button>
                  </div>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '220px', overflowY: 'auto' }}>
                  {announcements.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--secondary)', textAlign: 'center', padding: '20px' }}>
                      No announcements posted to this class.
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

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Course: ${code}` : 'Create New Curriculum Course'}
      >
        <form onSubmit={handleSaveClass}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">COURSE CODE</label>
              <input
                type="text"
                className="form-input"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS201"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">CREDIT UNITS</label>
              <input
                type="number"
                className="form-input"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                min={1}
                max={6}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">COURSE TITLE</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures and Algorithms"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">HOST DEPARTMENT</label>
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

          <div className="form-group">
            <label className="form-label">COURSE INSTRUCTOR / PROFESSOR</label>
            <select
              className="form-select"
              value={professorId}
              onChange={(e) => setProfessorId(e.target.value)}
            >
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">PREREQUISITES</label>
            <input
              type="text"
              className="form-input"
              value={prerequisites}
              onChange={(e) => setPrerequisites(e.target.value)}
              placeholder="e.g. CS101 Intro to Computer Science"
            />
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of the course..."
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
              {isEditing ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
