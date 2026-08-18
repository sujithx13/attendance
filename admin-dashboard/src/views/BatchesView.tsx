import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Send,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Search,
  BookOpen,
  GraduationCap,
  Calendar,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import type { Batch, BatchMember, Department, User, TimetableSlot, Announcement } from '../types/index.js';

export const BatchesView: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [policyFilter, setPolicyFilter] = useState<'ALL' | 'CROSS_DEPT' | 'SINGLE_DEPT'>('ALL');

  // Create / Edit Batch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [professorId, setProfessorId] = useState('');
  const [allowCrossDept, setAllowCrossDept] = useState(false);
  const [allowMultiYears, setAllowMultiYears] = useState(false);
  const [selectedYears, setSelectedYears] = useState<number[]>([2]);
  const [description, setDescription] = useState('');

  // Selected Cohort Hub State
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'roster' | 'timetable' | 'notices'>('overview');
  const [members, setMembers] = useState<BatchMember[]>([]);
  const [batchFaculty, setBatchFaculty] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Add Faculty Form State
  const [facultyToAdd, setFacultyToAdd] = useState('');
  const [facultyRole, setFacultyRole] = useState('CO_INSTRUCTOR');

  // Add Student Form State
  const [studentIdToEnroll, setStudentIdToEnroll] = useState('');

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'GENERAL' | 'ACADEMIC' | 'URGENT'>('ACADEMIC');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBatchesAndMeta = async () => {
    try {
      const [batchRes, deptRes, profRes, studentRes] = await Promise.all([
        api.getBatches(),
        api.getDepartments(),
        api.getUsers({ role: 'PROFESSOR' }),
        api.getUsers({ role: 'STUDENT' })
      ]);
      setBatches(batchRes.batches || []);
      setDepartments(deptRes.departments || []);
      setProfessors(profRes.users || []);
      setAllStudents(studentRes.users || []);

      if (deptRes.departments?.length > 0 && !departmentId) {
        setDepartmentId(deptRes.departments[0].id);
      }
      if (profRes.users?.length > 0 && !professorId) {
        setProfessorId(profRes.users[0].id);
      }
      if (profRes.users?.length > 0 && !facultyToAdd) {
        setFacultyToAdd(profRes.users[0].id);
      }
      if (studentRes.users?.length > 0 && !studentIdToEnroll) {
        setStudentIdToEnroll(studentRes.users[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load batches.' });
    }
  };

  useEffect(() => {
    fetchBatchesAndMeta();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setTargetBatchId(null);
    setName('');
    setCode('');
    setAllowCrossDept(true);
    setAllowMultiYears(true);
    setSelectedYears([2, 3]);
    setDescription('Specialized multi-disciplinary cohort focused on applied engineering research, cross-department collaborative projects, and industry laboratory practicums.');
    if (departments.length > 0) setDepartmentId(departments[0].id);
    if (professors.length > 0) setProfessorId(professors[0].id);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Batch) => {
    setIsEditing(true);
    setTargetBatchId(b.id);
    setName(b.name);
    setCode(b.code);
    setDepartmentId(b.departmentId || (b as any).department_id || (departments[0]?.id ?? ''));
    setProfessorId(b.professorId || (b as any).professor_id || (professors[0]?.id ?? ''));
    setAllowCrossDept(Boolean(b.allowCrossDepartment ?? (b as any).allow_cross_department));
    setAllowMultiYears(Boolean(b.allowMultipleYears ?? (b as any).allow_multiple_years));
    const yrs = b.allowedYears || (b as any).allowed_years;
    setSelectedYears(Array.isArray(yrs) && yrs.length > 0 ? yrs : [2]);
    setDescription(b.description || '');
    setIsModalOpen(true);
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (isEditing && targetBatchId) {
        await api.updateBatch(targetBatchId, {
          name,
          code,
          departmentId: departmentId || null,
          professorId,
          allowCrossDepartment: allowCrossDept,
          allowMultipleYears: allowMultiYears,
          allowedYears: selectedYears,
          description
        });
        setFeedback({ type: 'success', message: `Batch ${code} updated successfully!` });
        if (selectedBatch && selectedBatch.id === targetBatchId) {
          setSelectedBatch({
            ...selectedBatch,
            name,
            code,
            departmentId,
            professorId,
            allowCrossDepartment: allowCrossDept,
            allowMultipleYears: allowMultiYears,
            allowedYears: selectedYears,
            description
          });
        }
      } else {
        await api.createBatch({
          name,
          code,
          departmentId: departmentId || null,
          professorId,
          allowCrossDepartment: allowCrossDept,
          allowMultipleYears: allowMultiYears,
          allowedYears: selectedYears,
          description
        });
        setFeedback({ type: 'success', message: `Batch ${code} created successfully!` });
      }

      setIsModalOpen(false);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save batch.' });
    }
  };

  const handleDeleteBatch = async (id: string, code: string) => {
    if (!confirm(`Are you sure you want to delete batch ${code}? All roster enrollments will be deleted.`)) return;
    try {
      await api.deleteBatch(id);
      setFeedback({ type: 'success', message: `Batch ${code} deleted.` });
      if (selectedBatch?.id === id) setSelectedBatch(null);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete batch.' });
    }
  };

  const handleSelectCohort = async (batch: Batch) => {
    setSelectedBatch(batch);
    setActiveTab('overview');
    setFeedback(null);
    try {
      const [membersRes, facultyRes, slotsRes, annRes] = await Promise.all([
        api.getBatchMembers(batch.id),
        api.getBatchProfessors(batch.id),
        api.getTimetableSlots({ batchId: batch.id }),
        api.getAnnouncements('BATCH', batch.id)
      ]);
      setMembers(membersRes.members || []);
      setBatchFaculty(facultyRes.professors || []);
      setTimetable(slotsRes.slots || []);
      setAnnouncements(annRes.announcements || []);
    } catch (err: any) {
      console.error('Failed to load batch cohort details', err);
    }
  };

  // TEACHER / FACULTY ACTIONS
  const handleAddProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !facultyToAdd) return;
    setFeedback(null);
    try {
      await api.addProfessorToBatch(selectedBatch.id, facultyToAdd, facultyRole);
      setFeedback({ type: 'success', message: 'Faculty member assigned to batch leadership team!' });
      const res = await api.getBatchProfessors(selectedBatch.id);
      setBatchFaculty(res.professors || []);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to assign faculty member.' });
    }
  };

  const handleRemoveProfessor = async (profId: string, profName: string) => {
    if (!selectedBatch) return;
    if (!confirm(`Remove ${profName} from this batch's faculty team?`)) return;
    setFeedback(null);
    try {
      await api.removeProfessorFromBatch(selectedBatch.id, profId);
      setFeedback({ type: 'success', message: `Removed ${profName} from batch faculty.` });
      const res = await api.getBatchProfessors(selectedBatch.id);
      setBatchFaculty(res.professors || []);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove faculty member.' });
    }
  };

  // STUDENT ACTIONS
  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !studentIdToEnroll) return;
    setFeedback(null);
    try {
      await api.addStudentToBatch(selectedBatch.id, studentIdToEnroll);
      setFeedback({ type: 'success', message: `Enrolled student into ${selectedBatch.name}!` });
      const res = await api.getBatchMembers(selectedBatch.id);
      setMembers(res.members || []);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Enrollment rejected by batch policy.' });
    }
  };

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
    if (!selectedBatch) return;
    if (!confirm(`Remove ${studentName} from this batch?`)) return;
    try {
      await api.removeStudentFromBatch(selectedBatch.id, studentId);
      setFeedback({ type: 'success', message: `Removed ${studentName} from batch.` });
      const res = await api.getBatchMembers(selectedBatch.id);
      setMembers(res.members || []);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to remove student.' });
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !annTitle || !annContent) return;
    try {
      await api.createAnnouncement({
        title: annTitle,
        content: annContent,
        priority: annPriority,
        scopeType: 'BATCH',
        scopeId: selectedBatch.id
      });
      setFeedback({ type: 'success', message: 'Announcement posted to batch notice board!' });
      setAnnTitle('');
      setAnnContent('');
      const annRes = await api.getAnnouncements('BATCH', selectedBatch.id);
      setAnnouncements(annRes.announcements || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to post announcement.' });
    }
  };

  const toggleYear = (yr: number) => {
    if (selectedYears.includes(yr)) {
      if (selectedYears.length > 1) {
        setSelectedYears(selectedYears.filter((y) => y !== yr));
      }
    } else {
      setSelectedYears([...selectedYears, yr].sort());
    }
  };

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      if (deptFilter !== 'ALL' && (b.departmentId || (b as any).department_id) !== deptFilter) return false;
      if (policyFilter === 'CROSS_DEPT' && !b.allowCrossDepartment && !(b as any).allow_cross_department) return false;
      if (policyFilter === 'SINGLE_DEPT' && (b.allowCrossDepartment || (b as any).allow_cross_department)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = b.name.toLowerCase().includes(q);
        const codeMatch = b.code.toLowerCase().includes(q);
        if (!nameMatch && !codeMatch) return false;
      }
      return true;
    });
  }, [batches, deptFilter, policyFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Flexible Batches & Interdisciplinary Cohorts</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Multi-departmental and multi-year cohorts with multi-faculty leadership and student roster administration.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} />
          <span>Create New Batch</span>
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

      {/* Filter & Search Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <span className="form-label" style={{ marginBottom: 0 }}>POLICY FILTER:</span>
          <button
            className={`tab-pill ${policyFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setPolicyFilter('ALL')}
          >
            All Batches ({batches.length})
          </button>
          <button
            className={`tab-pill ${policyFilter === 'CROSS_DEPT' ? 'active' : ''}`}
            onClick={() => setPolicyFilter('CROSS_DEPT')}
          >
            Cross-Departmental Only
          </button>
          <button
            className={`tab-pill ${policyFilter === 'SINGLE_DEPT' ? 'active' : ''}`}
            onClick={() => setPolicyFilter('SINGLE_DEPT')}
          >
            Department-Restricted
          </button>
        </div>

        <div className="filter-group">
          <span className="form-label" style={{ marginBottom: 0 }}>HOST DEPT:</span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={15} color="var(--secondary)" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '36px', paddingTop: '7px', paddingBottom: '7px', fontSize: '13px' }}
            placeholder="Search batches by name or code…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Batches Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
        {filteredBatches.map((b) => {
          const isCrossDept = Boolean(b.allowCrossDepartment ?? (b as any).allow_cross_department);
          const isMultiYr = Boolean(b.allowMultipleYears ?? (b as any).allow_multiple_years);
          const yrs = b.allowedYears || (b as any).allowed_years || [2];
          const deptCode = b.departmentCode || (b as any).department_code || 'General';
          const profName = b.professorName || (b as any).professor_name || 'Prof. Alan Turing';
          const memberCount = b.memberCount || (b as any).member_count || 0;

          return (
            <div
              key={b.id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
                borderColor: selectedBatch?.id === b.id ? 'var(--primary-container)' : 'var(--outline)'
              }}
              onClick={() => handleSelectCohort(b)}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <span className="badge badge-purple" style={{ marginBottom: '6px' }}>
                      {b.code}
                    </span>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--on-surface)' }}>{b.name}</h3>
                  </div>
                  <span className="badge badge-emerald">
                    <Users size={12} />
                    <span>{memberCount} Students</span>
                  </span>
                </div>

                <p style={{ fontSize: '13px', color: 'var(--secondary)', marginBottom: '16px', lineHeight: '1.4', minHeight: '36px' }}>
                  {b.description?.slice(0, 110) || 'Specialized university cohort.'}…
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '14px',
                    backgroundColor: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--outline)',
                    marginBottom: '16px',
                    fontSize: '12.5px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--secondary)' }}>Admission Scope:</span>
                    {isCrossDept ? (
                      <span className="badge badge-emerald">Cross-Departmental</span>
                    ) : (
                      <span className="badge badge-blue">{deptCode} Only</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--secondary)' }}>Year Policy:</span>
                    <span className="badge badge-amber">
                      {isMultiYr ? `Years ${yrs.join(', ')}` : `Year ${yrs[0]} Only`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--secondary)' }}>Lead Faculty:</span>
                    <strong>{profName}</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--outline)' }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '12.5px', padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectCohort(b);
                  }}
                >
                  <BookOpen size={14} />
                  <span>Open Cohort Hub</span>
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(b);
                  }}
                  title="Edit Batch"
                >
                  <Edit2 size={13} />
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '8px 12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteBatch(b.id, b.code);
                  }}
                  title="Delete Batch"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cohort Detail Hub Modal */}
      {selectedBatch && (
        <Modal
          isOpen={Boolean(selectedBatch)}
          onClose={() => setSelectedBatch(null)}
          title={`Batch Cohort Hub: ${selectedBatch.name} (${selectedBatch.code})`}
          maxWidth="880px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header Banner */}
            <div
              style={{
                backgroundColor: 'var(--surface-container-low)',
                border: '1px solid var(--outline)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '13px' }}>{selectedBatch.code}</span>
                  {selectedBatch.allowCrossDepartment ? (
                    <span className="badge badge-emerald">Cross-Departmental</span>
                  ) : (
                    <span className="badge badge-blue">{selectedBatch.departmentCode || 'Host Dept'}</span>
                  )}
                  <span className="badge badge-amber">
                    Years [{(selectedBatch.allowedYears || (selectedBatch as any).allowed_years)?.join(', ')}]
                  </span>
                  <span className="badge badge-blue">
                    {batchFaculty.length} Faculty Assigned
                  </span>
                </div>
                <h3 style={{ fontSize: '20px', fontWeight: 800 }}>{selectedBatch.name}</h3>
                <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '4px' }}>
                  {selectedBatch.description || 'Specialized university batch.'}
                </p>
              </div>

              <button
                className="btn btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => handleOpenEdit(selectedBatch)}
              >
                <Edit2 size={12} />
                <span>Edit Batch</span>
              </button>
            </div>

            {/* Hub Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--outline)', paddingBottom: '10px', flexWrap: 'wrap' }}>
              <button
                className={`tab-pill ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <ShieldCheck size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Policy & Governance
              </button>
              <button
                className={`tab-pill ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff')}
              >
                <GraduationCap size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Faculty Leadership Team ({batchFaculty.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'roster' ? 'active' : ''}`}
                onClick={() => setActiveTab('roster')}
              >
                <Users size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Student Roster ({members.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'timetable' ? 'active' : ''}`}
                onClick={() => setActiveTab('timetable')}
              >
                <Calendar size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Cohort Timetable ({timetable.length})
              </button>
              <button
                className={`tab-pill ${activeTab === 'notices' ? 'active' : ''}`}
                onClick={() => setActiveTab('notices')}
              >
                <Bell size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Announcements ({announcements.length})
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="card" style={{ padding: '18px' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Department Affiliation Rule</h5>
                    <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.5' }}>
                      {selectedBatch.allowCrossDepartment
                        ? 'Students from any department (CSE, IT, MECH, ECE, AERO) are eligible to enroll.'
                        : `Restricted strictly to majors from the ${selectedBatch.departmentCode || 'host'} department.`}
                    </p>
                  </div>

                  <div className="card" style={{ padding: '18px' }}>
                    <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Academic Year Eligibility</h5>
                    <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.5' }}>
                      {selectedBatch.allowMultipleYears
                        ? `Allows multi-year grouping across Years [${(selectedBatch.allowedYears || (selectedBatch as any).allowed_years)?.join(', ')}].`
                        : `Only permits students of Year ${(selectedBatch.allowedYears || (selectedBatch as any).allowed_years)?.[0] || 2}.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: FACULTY TEAM (ADD / REMOVE TEACHERS) */}
            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Add Faculty Form */}
                <form
                  onSubmit={handleAddProfessor}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 180px auto',
                    gap: '12px',
                    alignItems: 'flex-end',
                    padding: '16px',
                    backgroundColor: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--outline)'
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ASSIGN PROFESSOR / TEACHER TO BATCH</label>
                    <select
                      className="form-select"
                      value={facultyToAdd}
                      onChange={(e) => setFacultyToAdd(e.target.value)}
                    >
                      {professors.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.departmentCode || 'Dept'} • {p.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ASSIGNMENT ROLE</label>
                    <select
                      className="form-select"
                      value={facultyRole}
                      onChange={(e) => setFacultyRole(e.target.value)}
                    >
                      <option value="LEAD_MENTOR">Lead Mentor</option>
                      <option value="CO_INSTRUCTOR">Co-Instructor</option>
                      <option value="LAB_COORDINATOR">Lab Coordinator</option>
                      <option value="PROJECT_ADVISOR">Project Advisor</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
                    <UserPlus size={14} />
                    <span>Assign Teacher</span>
                  </button>
                </form>

                {/* Faculty List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span className="form-label">ASSIGNED FACULTY MENTORS & INSTRUCTORS ({batchFaculty.length})</span>
                  {batchFaculty.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                      No faculty members assigned to this batch yet. Use the form above to assign teachers.
                    </div>
                  ) : (
                    batchFaculty.map((f) => (
                      <div
                        key={f.professorId || f.id}
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
                              fontSize: '15px',
                              fontWeight: 800,
                              border: '1.5px solid rgba(46, 125, 50, 0.25)'
                            }}
                          >
                            {(f.professorName || 'P').charAt(0)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <strong style={{ fontSize: '14px' }}>{f.professorName}</strong>
                              <span className={`badge ${f.role === 'LEAD_MENTOR' ? 'badge-emerald' : 'badge-blue'}`}>
                                {f.role ? f.role.replace(/_/g, ' ') : 'Instructor'}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px' }}>
                              {f.email} • Department of {f.departmentName || f.departmentCode || 'Computer Science'}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleRemoveProfessor(f.professorId, f.professorName)}
                          title="Remove from batch faculty"
                        >
                          <Trash2 size={13} />
                          <span>Remove Teacher</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: STUDENT ROSTER (ADD / REMOVE STUDENTS) */}
            {activeTab === 'roster' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* Dynamic Add Student Form */}
                <form
                  onSubmit={handleEnrollStudent}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '12px',
                    alignItems: 'flex-end',
                    padding: '16px',
                    backgroundColor: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--outline)'
                  }}
                >
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ENROLL REGISTERED STUDENT INTO BATCH</label>
                    <select
                      className="form-select"
                      value={studentIdToEnroll}
                      onChange={(e) => setStudentIdToEnroll(e.target.value)}
                    >
                      {allStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} ({s.departmentCode || 'Dept'} • Year {s.yearOfStudy || 1} • {s.enrollmentId || s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
                    <UserPlus size={14} />
                    <span>Enroll Student</span>
                  </button>
                </form>

                {/* Enrolled Students Table */}
                <div className="table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Email & Enrollment ID</th>
                        <th>Department</th>
                        <th>Year</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--secondary)', padding: '32px' }}>
                            No students enrolled in this batch yet. Use the selector above to enroll students.
                          </td>
                        </tr>
                      ) : (
                        members.map((m) => (
                          <tr key={m.studentId}>
                            <td><strong>{m.studentName || m.studentId}</strong></td>
                            <td>
                              <div>{m.email || '—'}</div>
                              <code style={{ fontSize: '11px', color: 'var(--secondary)' }}>{m.enrollmentId || '—'}</code>
                            </td>
                            <td><span className="badge badge-purple">{m.departmentCode || 'CSE'}</span></td>
                            <td><span className="badge badge-emerald">Year {m.yearOfStudy || 1}</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleRemoveStudent(m.studentId, m.studentName || 'this student')}
                                title="Remove student from batch"
                              >
                                <Trash2 size={12} />
                                <span>Remove Student</span>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span className="form-label">ASSIGNED SCHEDULE SLOTS FOR THIS BATCH</span>
                {timetable.length === 0 ? (
                  <div style={{ padding: '28px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--outline)' }}>
                    No recurring timetable slots assigned to this batch yet. You can apply a template from the Timetable Templates tab.
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
                          {slot.startTime} – {slot.endTime} • {slot.classroomName || 'Turing Hall (Building A)'}
                        </div>
                      </div>
                      <span className="badge badge-purple">Batch Session</span>
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
                      placeholder="Batch Notice Title (e.g. Lab Demonstration Review)"
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
                      placeholder="Write announcement for enrolled batch students..."
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
                      No announcements posted to this batch.
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
                          <span className={`badge ${a.priority === 'URGENT' ? 'badge-rose' : 'badge-purple'}`}>
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

      {/* CREATE / EDIT BATCH MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? `Edit Batch: ${code}` : 'Create New Academic Batch'}
      >
        <form onSubmit={handleSaveBatch}>
          <div className="form-group">
            <label className="form-label">BATCH NAME</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Embedded AI & Robotics Lab"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">BATCH CODE</label>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. BATCH_AI_26"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">HOST / SPONSOR DEPARTMENT</label>
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
            <label className="form-label">PRIMARY FACULTY MENTOR</label>
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

          {/* Policy Flags Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '16px',
              backgroundColor: 'var(--surface-container-low)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--outline)',
              marginBottom: '16px'
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={allowCrossDept}
                onChange={(e) => setAllowCrossDept(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-container)' }}
              />
              <div>
                <strong>Allow Students from Different Departments</strong>
                <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                  Permits enrollment across CSE, IT, MECH, ECE, AERO without restriction.
                </p>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13.5px' }}>
              <input
                type="checkbox"
                checked={allowMultiYears}
                onChange={(e) => setAllowMultiYears(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary-container)' }}
              />
              <div>
                <strong>Allow Multiple Academic Years of Study</strong>
                <p style={{ fontSize: '12px', color: 'var(--secondary)' }}>
                  Permits combining students from different years (e.g. Years 2 & 3).
                </p>
              </div>
            </label>

            <div style={{ marginTop: '4px' }}>
              <span className="form-label">ELIGIBLE ACADEMIC YEARS:</span>
              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                {[1, 2, 3, 4].map((yr) => {
                  const active = selectedYears.includes(yr);
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => toggleYear(yr)}
                      className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                    >
                      Year {yr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of batch specialization and objectives..."
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
              {isEditing ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
