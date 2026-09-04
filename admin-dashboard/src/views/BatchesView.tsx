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
  ShieldCheck,
  MapPin,
  Copy,
  CalendarPlus
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import { ConfirmDialog } from '../components/common/ConfirmDialog.js';
import type { Batch, BatchMember, User, TimetableSlot, TimetableTemplate, Announcement } from '../types/index.js';

// 12-hour AM/PM helper
function formatToAmPm(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1] || '00';
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export const BatchesView: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [policyFilter, setPolicyFilter] = useState<'ALL' | 'CROSS_DEPT' | 'SINGLE_DEPT'>('ALL');

  // Confirmation Popups State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    isDestructive: false,
    onConfirm: () => {}
  });

  // Create / Edit Batch Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [targetBatchId, setTargetBatchId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [allowCrossDept, setAllowCrossDept] = useState(true);
  const [allowMultiYears, setAllowMultiYears] = useState(true);
  const [selectedYears, setSelectedYears] = useState<number[]>([2, 3]);
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

  // Add Student Form State
  const [studentIdToEnroll, setStudentIdToEnroll] = useState('');

  // Modifiable Batch Timetable Slot Modal State (Add & Edit)
  const [isAddSlotOpen, setIsAddSlotOpen] = useState(false);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [slotDay, setSlotDay] = useState(1);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:30');
  const [slotProfId, setSlotProfId] = useState('');
  const [slotRoomId, setSlotRoomId] = useState('');

  // Apply Template Modal State
  const [isApplyTemplateOpen, setIsApplyTemplateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Announcement Form State
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<'GENERAL' | 'ACADEMIC' | 'URGENT'>('ACADEMIC');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchBatchesAndMeta = async () => {
    try {
      const [batchRes, profRes, studentRes, roomRes, tmplRes] = await Promise.all([
        api.getBatches(),
        api.getUsers({ role: 'PROFESSOR' }),
        api.getUsers({ role: 'STUDENT' }),
        api.getClassrooms(),
        api.getTemplates()
      ]);
      setBatches(batchRes.batches || []);
      setProfessors(profRes.users || []);
      setAllStudents(studentRes.users || []);
      setClassrooms(roomRes.classrooms || []);
      setTemplates(tmplRes.templates || []);

      if (profRes.users?.length > 0 && !facultyToAdd) {
        setFacultyToAdd(profRes.users[0].id);
      }
      if (profRes.users?.length > 0 && !slotProfId) {
        setSlotProfId(profRes.users[0].id);
      }
      if (studentRes.users?.length > 0 && !studentIdToEnroll) {
        setStudentIdToEnroll(studentRes.users[0].id);
      }
      if (roomRes.classrooms?.length > 0 && !slotRoomId) {
        setSlotRoomId(roomRes.classrooms[0].id);
      }
      if (tmplRes.templates?.length > 0 && !selectedTemplateId) {
        setSelectedTemplateId(tmplRes.templates[0].id);
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
    setDescription('Cross-departmental and multi-year collaborative batch.');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Batch) => {
    setIsEditing(true);
    setTargetBatchId(b.id);
    setName(b.name);
    setCode(b.code);
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
          departmentId: undefined,
          professorId: undefined,
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
          departmentId: undefined,
          professorId: undefined,
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

  const promptDeleteBatch = (id: string, code: string) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Batch ${code}?`,
      message: `Are you sure you want to delete batch "${code}"? All assigned weekly timetable slots and student enrollments for this batch will be removed.`,
      confirmText: 'Yes, Delete Batch',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteBatch(id);
          setFeedback({ type: 'success', message: `Batch ${code} deleted.` });
          if (selectedBatch?.id === id) setSelectedBatch(null);
          fetchBatchesAndMeta();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.message || 'Failed to delete batch.' });
        }
      }
    });
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

  // FACULTY ACTIONS
  const handleAddProfessor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !facultyToAdd) return;
    setFeedback(null);
    try {
      await api.addProfessorToBatch(selectedBatch.id, facultyToAdd, 'FACULTY');
      setFeedback({ type: 'success', message: 'Faculty member added to batch!' });
      const res = await api.getBatchProfessors(selectedBatch.id);
      setBatchFaculty(res.professors || []);
      fetchBatchesAndMeta();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add faculty member.' });
    }
  };

  const promptRemoveProfessor = (profId: string, profName: string) => {
    if (!selectedBatch) return;
    setConfirmDialog({
      isOpen: true,
      title: `Remove Faculty Member?`,
      message: `Remove ${profName} from the faculty team of batch "${selectedBatch.name}"?`,
      confirmText: 'Remove Faculty',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.removeProfessorFromBatch(selectedBatch.id, profId);
          setFeedback({ type: 'success', message: `Removed ${profName} from batch faculty.` });
          const res = await api.getBatchProfessors(selectedBatch.id);
          setBatchFaculty(res.professors || []);
          fetchBatchesAndMeta();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.message || 'Failed to remove faculty member.' });
        }
      }
    });
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

  const promptRemoveStudent = (studentId: string, studentName: string) => {
    if (!selectedBatch) return;
    setConfirmDialog({
      isOpen: true,
      title: `Remove Student from Batch?`,
      message: `Remove ${studentName} from the student roster of batch "${selectedBatch.name}"?`,
      confirmText: 'Remove Student',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.removeStudentFromBatch(selectedBatch.id, studentId);
          setFeedback({ type: 'success', message: `Removed ${studentName} from batch.` });
          const res = await api.getBatchMembers(selectedBatch.id);
          setMembers(res.members || []);
          fetchBatchesAndMeta();
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.message || 'Failed to remove student.' });
        }
      }
    });
  };

  // TIMETABLE ACTIONS FOR BATCH (ADD / EDIT / DELETE)
  const handleOpenAddSlot = () => {
    setIsEditingSlot(false);
    setTargetSlotId(null);
    setSlotDay(1);
    setSlotStart('09:00');
    setSlotEnd('10:30');
    if (professors.length > 0) setSlotProfId(professors[0].id);
    if (classrooms.length > 0) setSlotRoomId(classrooms[0].id);
    setIsAddSlotOpen(true);
  };

  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setIsEditingSlot(true);
    setTargetSlotId(slot.id);
    setSlotDay(slot.dayOfWeek ?? 1);
    setSlotStart(slot.startTime.slice(0, 5));
    setSlotEnd(slot.endTime.slice(0, 5));
    setSlotProfId(slot.professorId || professors[0]?.id || '');
    setSlotRoomId(slot.classroomId || classrooms[0]?.id || '');
    setIsAddSlotOpen(true);
  };

  const handleSaveBatchSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;
    setFeedback(null);
    try {
      if (isEditingSlot && targetSlotId) {
        await api.updateTimetableSlot(targetSlotId, {
          dayOfWeek: slotDay,
          startTime: slotStart,
          endTime: slotEnd,
          batchId: selectedBatch.id,
          professorId: slotProfId || professors[0]?.id,
          classroomId: slotRoomId || classrooms[0]?.id
        });
        setFeedback({ type: 'success', message: 'Timetable slot updated successfully!' });
      } else {
        await api.createTimetableSlot({
          scheduleType: 'RECURRING_WEEKLY',
          dayOfWeek: slotDay,
          startTime: slotStart,
          endTime: slotEnd,
          targetType: 'BATCH',
          batchId: selectedBatch.id,
          professorId: slotProfId || professors[0]?.id,
          classroomId: slotRoomId || classrooms[0]?.id
        });
        setFeedback({ type: 'success', message: 'New schedule slot scheduled for batch!' });
      }
      setIsAddSlotOpen(false);
      const slotsRes = await api.getTimetableSlots({ batchId: selectedBatch.id });
      setTimetable(slotsRes.slots || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save timetable slot.' });
    }
  };

  const promptDeleteBatchSlot = (slotId: string) => {
    if (!selectedBatch) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Remove Timetable Slot?',
      message: 'Are you sure you want to remove this recurring schedule slot from the batch timetable?',
      confirmText: 'Remove Slot',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        try {
          await api.deleteTimetableSlot(slotId);
          setFeedback({ type: 'success', message: 'Schedule slot removed.' });
          const slotsRes = await api.getTimetableSlots({ batchId: selectedBatch.id });
          setTimetable(slotsRes.slots || []);
        } catch (err: any) {
          setFeedback({ type: 'error', message: err.message || 'Failed to remove slot.' });
        }
      }
    });
  };

  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedTemplateId) return;
    try {
      const res = await api.applyTemplateToCohort(selectedTemplateId, 'BATCH', selectedBatch.id);
      setFeedback({ type: 'success', message: `Template applied! Scheduled ${res.appliedCount} recurring weekly slots.` });
      setIsApplyTemplateOpen(false);
      const slotsRes = await api.getTimetableSlots({ batchId: selectedBatch.id });
      setTimetable(slotsRes.slots || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to apply template.' });
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
  }, [batches, policyFilter, searchQuery]);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Academic Batches & Cohorts</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Flexible cohorts with faculty assignments, student enrollments, and editable weekly timetables.
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
            Cross-Departmental
          </button>
          <button
            className={`tab-pill ${policyFilter === 'SINGLE_DEPT' ? 'active' : ''}`}
            onClick={() => setPolicyFilter('SINGLE_DEPT')}
          >
            Single-Department Only
          </button>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
        {filteredBatches.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-md)', border: '1px solid var(--outline)' }}>
            <Users size={36} color="var(--secondary)" style={{ margin: '0 auto 12px auto' }} />
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--on-surface)' }}>No Batches Created Yet</h4>
            <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '4px' }}>
              Click <strong>"Create New Batch"</strong> above to set up an academic cohort.
            </p>
          </div>
        ) : (
          filteredBatches.map((b) => {
            const isCrossDept = Boolean(b.allowCrossDepartment ?? (b as any).allow_cross_department);
            const isMultiYr = Boolean(b.allowMultipleYears ?? (b as any).allow_multiple_years);
            const yrs = b.allowedYears || (b as any).allowed_years || [2];
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
                    {b.description?.slice(0, 110) || 'Academic batch cohort.'}
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
                      <span style={{ color: 'var(--secondary)' }}>Admission Policy:</span>
                      {isCrossDept ? (
                        <span className="badge badge-emerald">Cross-Departmental</span>
                      ) : (
                        <span className="badge badge-blue">Single Department</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--secondary)' }}>Year Policy:</span>
                      <span className="badge badge-amber">
                        {isMultiYr ? `Years ${yrs.join(', ')}` : `Year ${yrs[0]} Only`}
                      </span>
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
                      promptDeleteBatch(b.id, b.code);
                    }}
                    title="Delete Batch"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cohort Detail Hub Modal */}
      {selectedBatch && (
        <Modal
          isOpen={Boolean(selectedBatch)}
          onClose={() => setSelectedBatch(null)}
          title={`Batch Cohort Hub: ${selectedBatch.name} (${selectedBatch.code})`}
          maxWidth="920px"
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
                    <span className="badge badge-blue">Single Department</span>
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
                  {selectedBatch.description || 'Academic batch cohort.'}
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
                Policy & Rules
              </button>
              <button
                className={`tab-pill ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => setActiveTab('staff')}
              >
                <GraduationCap size={14} style={{ display: 'inline', marginRight: '6px' }} />
                Faculty Leadership ({batchFaculty.length})
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
                    <h5 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Department Admission Scope</h5>
                    <p style={{ fontSize: '13px', color: 'var(--secondary)', lineHeight: '1.5' }}>
                      {selectedBatch.allowCrossDepartment
                        ? 'Students from any department are eligible to enroll.'
                        : 'Restricted strictly to students from the designated department.'}
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

            {/* TAB 2: FACULTY TEAM */}
            {activeTab === 'staff' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <form
                  onSubmit={handleAddProfessor}
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
                    <label className="form-label">SELECT FACULTY MEMBER TO ADD</label>
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

                  <button type="submit" className="btn btn-primary" style={{ height: '38px' }}>
                    <UserPlus size={14} />
                    <span>Add Faculty</span>
                  </button>
                </form>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span className="form-label">ASSIGNED FACULTY ({batchFaculty.length})</span>
                  {batchFaculty.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                      No faculty members assigned to this batch yet.
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
                              width: '40px',
                              height: '40px',
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
                            <strong style={{ fontSize: '14px' }}>{f.professorName}</strong>
                            <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px' }}>
                              {f.email}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="btn btn-danger"
                          style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => promptRemoveProfessor(f.professorId, f.professorName)}
                          title="Remove faculty from batch"
                        >
                          <Trash2 size={13} />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: STUDENT ROSTER */}
            {activeTab === 'roster' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
                            <td><span className="badge badge-purple">{m.departmentCode || 'General'}</span></td>
                            <td><span className="badge badge-emerald">Year {m.yearOfStudy || 1}</span></td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                className="btn btn-danger"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => promptRemoveStudent(m.studentId, m.studentName || 'this student')}
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

            {/* TAB 4: EDITABLE YOUR SCHEDULE */}
            {activeTab === 'timetable' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <span className="form-label" style={{ marginBottom: 0 }}>
                    SCHEDULED WEEKLY TIMETABLE SLOTS ({timetable.length})
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '12.5px', padding: '6px 12px' }}
                      onClick={() => setIsApplyTemplateOpen(true)}
                    >
                      <Copy size={13} />
                      <span>Apply Saved Template</span>
                    </button>
                    <button
                      className="btn btn-primary"
                      style={{ fontSize: '12.5px', padding: '6px 12px' }}
                      onClick={handleOpenAddSlot}
                    >
                      <CalendarPlus size={13} />
                      <span>Add Schedule Slot</span>
                    </button>
                  </div>
                </div>

                {timetable.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--outline)' }}>
                    <Calendar size={28} color="var(--secondary)" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontWeight: 600, color: 'var(--on-surface)' }}>No schedule slots assigned to this batch yet.</div>
                    <p style={{ fontSize: '12.5px', marginTop: '4px' }}>
                      Click <strong>"Add Schedule Slot"</strong> above to schedule a class time with AM/PM formatting.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {timetable.map((slot) => (
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span className="badge badge-purple" style={{ minWidth: '90px', textAlign: 'center' }}>
                            {dayNames[slot.dayOfWeek || 0]}
                          </span>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--on-surface)' }}>
                              <Clock size={13} style={{ display: 'inline', marginRight: '6px', color: 'var(--primary-container)' }} />
                              {formatToAmPm(slot.startTime)} – {formatToAmPm(slot.endTime)}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span><MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />{slot.classroomName || 'Classroom'}</span>
                              <span>• Instructor: <strong>{slot.professorName || 'Faculty'}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            onClick={() => handleOpenEditSlot(slot)}
                            title="Edit slot"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            onClick={() => promptDeleteBatchSlot(slot.id)}
                            title="Remove slot"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                      placeholder="Batch Notice Title"
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

      {/* CONFIRM ACTION DIALOG FOR BATCHES */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          isDestructive={confirmDialog.isDestructive}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        />
      )}

      {/* ADD / EDIT SCHEDULE SLOT MODAL FOR BATCH */}
      {selectedBatch && isAddSlotOpen && (
        <Modal
          isOpen={isAddSlotOpen}
          onClose={() => setIsAddSlotOpen(false)}
          title={isEditingSlot ? `Edit Schedule Slot: ${selectedBatch.name}` : `Add Schedule Slot: ${selectedBatch.name}`}
        >
          <form onSubmit={handleSaveBatchSlot}>
            <div className="form-group">
              <label className="form-label">DAY OF THE WEEK</label>
              <select
                className="form-select"
                value={slotDay}
                onChange={(e) => setSlotDay(parseInt(e.target.value, 10))}
              >
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">START TIME (24H: {slotStart} • {formatToAmPm(slotStart)})</label>
                <input
                  type="time"
                  className="form-input"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">END TIME (24H: {slotEnd} • {formatToAmPm(slotEnd)})</label>
                <input
                  type="time"
                  className="form-input"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div style={{ marginBottom: '16px' }}>
              <span className="form-label" style={{ fontSize: '11px' }}>QUICK TIME PRESETS (AM / PM):</span>
              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => { setSlotStart('09:00'); setSlotEnd('10:30'); }}
                >
                  09:00 AM - 10:30 AM
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => { setSlotStart('10:45'); setSlotEnd('12:15'); }}
                >
                  10:45 AM - 12:15 PM
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => { setSlotStart('13:30'); setSlotEnd('15:00'); }}
                >
                  01:30 PM - 03:00 PM
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '4px 8px' }}
                  onClick={() => { setSlotStart('14:00'); setSlotEnd('17:00'); }}
                >
                  02:00 PM - 05:00 PM (Lab 3hr)
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">INSTRUCTOR / PROFESSOR</label>
              <select
                className="form-select"
                value={slotProfId}
                onChange={(e) => setSlotProfId(e.target.value)}
              >
                {professors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.departmentCode || 'Dept'} • {p.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">CLASSROOM / LABORATORY</label>
              <select
                className="form-select"
                value={slotRoomId}
                onChange={(e) => setSlotRoomId(e.target.value)}
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.building || 'Main Block'} • Capacity: {c.capacity || 60})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAddSlotOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {isEditingSlot ? 'Save Changes' : 'Add Slot to Batch'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* APPLY TEMPLATE MODAL FOR BATCH */}
      {selectedBatch && isApplyTemplateOpen && (
        <Modal
          isOpen={isApplyTemplateOpen}
          onClose={() => setIsApplyTemplateOpen(false)}
          title={`Apply Schedule Template to ${selectedBatch.name}`}
        >
          <form onSubmit={handleApplyTemplate}>
            <div className="form-group">
              <label className="form-label">CHOOSE SAVED SCHEDULE TEMPLATE</label>
              <select
                className="form-select"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({(t.slots || []).length} slots)
                  </option>
                ))}
              </select>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '8px' }}>
              Applying this template will automatically copy its pre-configured weekly slot schedule directly into <strong>{selectedBatch.name}</strong>.
            </p>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsApplyTemplateOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Apply Template Now
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE / EDIT BATCH MODAL (Host Dept & Primary Faculty Removed) */}
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
                  Permits enrollment across any university department without restriction.
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
