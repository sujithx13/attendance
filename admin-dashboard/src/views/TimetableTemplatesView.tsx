import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers,
  Search,
  GraduationCap,
  CalendarDays,
  CalendarPlus
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import type {
  TimetableSlot,
  TimetableTemplate,
  Batch,
  User
} from '../types/index.js';

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

export const TimetableTemplatesView: React.FC = () => {
  const [viewMode, setViewMode] = useState<'MATRIX' | 'BATCH_EXPLORER' | 'TEMPLATES'>('MATRIX');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);

  // Filtering
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Daily Session Generator State
  const [genDate, setGenDate] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);

  // Add / Edit Slot Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [slotDay, setSlotDay] = useState(1);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:30');
  const [slotBatchId, setSlotBatchId] = useState('');
  const [slotProfId, setSlotProfId] = useState('');
  const [slotRoomId, setSlotRoomId] = useState('');

  // Create Template Modal State
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [tmplName, setTmplName] = useState('');
  const [tmplDesc, setTmplDesc] = useState('');
  const [templateSlotItems, setTemplateSlotItems] = useState<
    { dayOfWeek: number; startTime: string; endTime: string; subjectName: string; classroomId?: string; professorId?: string }[]
  >([
    { dayOfWeek: 1, startTime: '09:00', endTime: '10:30', subjectName: 'Core Theory Slot A' },
    { dayOfWeek: 2, startTime: '10:45', endTime: '12:15', subjectName: 'Core Theory Slot B' },
    { dayOfWeek: 4, startTime: '14:00', endTime: '17:00', subjectName: 'Laboratory Practicum' }
  ]);

  // Apply Template Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<TimetableTemplate | null>(null);
  const [applyTargetBatchId, setApplyTargetBatchId] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekDays = [1, 2, 3, 4, 5, 6]; // Monday to Saturday

  const fetchAllData = async () => {
    try {
      const [slotsRes, tmplRes, batchRes, profRes, roomRes] = await Promise.all([
        api.getTimetableSlots(),
        api.getTemplates(),
        api.getBatches(),
        api.getUsers({ role: 'PROFESSOR' }),
        api.getClassrooms()
      ]);

      setSlots(slotsRes.slots || []);
      setTemplates(tmplRes.templates || []);
      setBatches(batchRes.batches || []);
      setProfessors(profRes.users || []);
      setClassrooms(roomRes.classrooms || []);

      if (batchRes.batches?.length > 0 && !slotBatchId) {
        setSlotBatchId(batchRes.batches[0].id);
        setApplyTargetBatchId(batchRes.batches[0].id);
      }
      if (profRes.users?.length > 0 && !slotProfId) {
        setSlotProfId(profRes.users[0].id);
      }
      if (roomRes.classrooms?.length > 0 && !slotRoomId) {
        setSlotRoomId(roomRes.classrooms[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load scheduling data.' });
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Filtered Slots
  const filteredSlots = useMemo(() => {
    return slots.filter((s) => {
      if (selectedBatchFilter !== 'ALL' && s.batchId !== selectedBatchFilter && (s as any).batch_id !== selectedBatchFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const batchMatch = (s.batchName || (s as any).batch_name || s.batchCode || '').toLowerCase().includes(q);
        const profMatch = (s.professorName || (s as any).professor_name || '').toLowerCase().includes(q);
        const roomMatch = (s.classroomName || (s as any).classroom_name || '').toLowerCase().includes(q);
        if (!batchMatch && !profMatch && !roomMatch) return false;
      }
      return true;
    });
  }, [slots, selectedBatchFilter, searchQuery]);

  // Slots Grouped by Day
  const slotsByDay = useMemo(() => {
    const grouped: Record<number, TimetableSlot[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    filteredSlots.forEach((slot) => {
      const day = slot.dayOfWeek ?? 1;
      if (grouped[day]) {
        grouped[day].push(slot);
      }
    });
    // Sort each day chronologically
    Object.keys(grouped).forEach((d) => {
      grouped[Number(d)].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [filteredSlots]);

  // Open Add Slot Modal
  const handleOpenAddSlot = (dayNumber?: number) => {
    setIsEditingSlot(false);
    setTargetSlotId(null);
    if (dayNumber !== undefined) setSlotDay(dayNumber);
    if (selectedBatchFilter !== 'ALL') setSlotBatchId(selectedBatchFilter);
    else if (batches.length > 0) setSlotBatchId(batches[0].id);
    setSlotStart('09:00');
    setSlotEnd('10:30');
    if (professors.length > 0) setSlotProfId(professors[0].id);
    if (classrooms.length > 0) setSlotRoomId(classrooms[0].id);
    setIsSlotModalOpen(true);
  };

  // Open Edit Slot Modal
  const handleOpenEditSlot = (slot: TimetableSlot) => {
    setIsEditingSlot(true);
    setTargetSlotId(slot.id);
    setSlotDay(slot.dayOfWeek ?? 1);
    setSlotStart(slot.startTime.slice(0, 5));
    setSlotEnd(slot.endTime.slice(0, 5));
    setSlotBatchId(slot.batchId || (slot as any).batch_id || batches[0]?.id || '');
    setSlotProfId(slot.professorId || (slot as any).professor_id || professors[0]?.id || '');
    setSlotRoomId(slot.classroomId || (slot as any).classroom_id || classrooms[0]?.id || '');
    setIsSlotModalOpen(true);
  };

  // Handler: Save Timetable Slot (Create or Edit)
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      if (isEditingSlot && targetSlotId) {
        await api.updateTimetableSlot(targetSlotId, {
          dayOfWeek: slotDay,
          startTime: slotStart,
          endTime: slotEnd,
          batchId: slotBatchId,
          professorId: slotProfId,
          classroomId: slotRoomId
        });
        setFeedback({ type: 'success', message: 'Timetable slot updated successfully!' });
      } else {
        await api.createTimetableSlot({
          scheduleType: 'RECURRING_WEEKLY',
          dayOfWeek: slotDay,
          startTime: slotStart,
          endTime: slotEnd,
          targetType: 'BATCH',
          batchId: slotBatchId || batches[0]?.id,
          professorId: slotProfId || professors[0]?.id,
          classroomId: slotRoomId || classrooms[0]?.id
        });
        setFeedback({ type: 'success', message: 'Timetable slot created and added to master schedule!' });
      }
      setIsSlotModalOpen(false);
      const res = await api.getTimetableSlots();
      setSlots(res.slots || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save slot.' });
    }
  };

  // Handler: Delete Timetable Slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this timetable slot from the schedule?')) return;
    setFeedback(null);
    try {
      await api.deleteTimetableSlot(slotId);
      setFeedback({ type: 'success', message: 'Timetable slot deleted.' });
      const res = await api.getTimetableSlots();
      setSlots(res.slots || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete slot.' });
    }
  };

  // Handler: Generate Daily Sessions
  const handleGenerateSessions = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await api.generateSessionsForDate(genDate);
      setFeedback({
        type: 'success',
        message: `Successfully spawned ${res.sessionsGenerated} live attendance sessions for ${genDate}!`
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate sessions.' });
    } finally {
      setGenerating(false);
    }
  };

  // Handler: Create Template
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmplName.trim()) return;
    setFeedback(null);
    try {
      await api.createTemplate({
        name: tmplName,
        description: tmplDesc,
        targetType: 'BATCH',
        slots: templateSlotItems.map((s) => ({
          ...s,
          classroomId: s.classroomId || classrooms[0]?.id,
          professorId: s.professorId || professors[0]?.id
        }))
      });
      setFeedback({ type: 'success', message: `Template "${tmplName}" created successfully!` });
      setIsCreateTemplateOpen(false);
      setTmplName('');
      setTmplDesc('');
      const res = await api.getTemplates();
      setTemplates(res.templates || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create template.' });
    }
  };

  // Handler: Delete Template
  const handleDeleteTemplate = async (tmplId: string, tmplName: string) => {
    if (!confirm(`Delete template "${tmplName}"?`)) return;
    setFeedback(null);
    try {
      await api.deleteTemplate(tmplId);
      setFeedback({ type: 'success', message: `Template "${tmplName}" deleted.` });
      const res = await api.getTemplates();
      setTemplates(res.templates || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete template.' });
    }
  };

  // Handler: Open Apply Template Modal
  const handleOpenApplyModal = (tmpl: TimetableTemplate) => {
    setTemplateToApply(tmpl);
    if (batches.length > 0) setApplyTargetBatchId(batches[0].id);
    setIsApplyModalOpen(true);
  };

  // Handler: Execute Apply Template to Batch
  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateToApply || !applyTargetBatchId) return;
    setFeedback(null);
    try {
      const res = await api.applyTemplateToCohort(templateToApply.id, 'BATCH', applyTargetBatchId);
      const targetBatch = batches.find((b) => b.id === applyTargetBatchId);
      setFeedback({
        type: 'success',
        message: `Template applied to ${targetBatch?.name || 'batch'}! Added ${res.appliedCount} recurring slots.`
      });
      setIsApplyModalOpen(false);
      const slotsRes = await api.getTimetableSlots();
      setSlots(slotsRes.slots || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to apply template.' });
    }
  };

  // Add Item to Template Builder
  const handleAddTemplateSlotItem = () => {
    setTemplateSlotItems([
      ...templateSlotItems,
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:30', subjectName: 'New Subject Slot' }
    ]);
  };

  // Remove Item from Template Builder
  const handleRemoveTemplateSlotItem = (idx: number) => {
    if (templateSlotItems.length > 1) {
      setTemplateSlotItems(templateSlotItems.filter((_, i) => i !== idx));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Master Timetable & Scheduling Hub</h2>
          <p style={{ fontSize: '14px', color: 'var(--secondary)', marginTop: '4px' }}>
            Intuitive weekly scheduling matrix, editable batch timetables (AM/PM), and automated session spawner.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setIsCreateTemplateOpen(true)}
          >
            <Copy size={15} />
            <span>Create Template</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={() => handleOpenAddSlot()}
          >
            <CalendarPlus size={15} />
            <span>Add Schedule Slot</span>
          </button>
        </div>
      </div>

      {/* Session Spawner Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(46, 125, 50, 0.08) 0%, var(--surface-container-low) 100%)',
          border: '1px solid var(--outline)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-container)'
            }}
          >
            <Zap size={22} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--on-surface)' }}>
              Live Attendance Session Spawner
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--secondary)', marginTop: '2px' }}>
              Spawns today's active batch attendance sessions directly onto student mobile apps.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '7px 12px', fontSize: '13px' }}
            value={genDate}
            onChange={(e) => setGenDate(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={handleGenerateSessions}
            disabled={generating}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Zap size={14} />
            <span>{generating ? 'Spawning Sessions…' : 'Generate Daily Sessions'}</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
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

      {/* View Switcher & Filters */}
      <div className="filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`tab-pill ${viewMode === 'MATRIX' ? 'active' : ''}`}
            onClick={() => setViewMode('MATRIX')}
          >
            <CalendarDays size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Weekly Calendar Matrix
          </button>

          <button
            className={`tab-pill ${viewMode === 'BATCH_EXPLORER' ? 'active' : ''}`}
            onClick={() => setViewMode('BATCH_EXPLORER')}
          >
            <Layers size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Batch Timetable Explorer
          </button>

          <button
            className={`tab-pill ${viewMode === 'TEMPLATES' ? 'active' : ''}`}
            onClick={() => setViewMode('TEMPLATES')}
          >
            <Copy size={14} style={{ display: 'inline', marginRight: '6px' }} />
            Schedule Templates ({templates.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="form-label" style={{ marginBottom: 0, fontSize: '11.5px' }}>FILTER BATCH:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '13px' }}
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
            >
              <option value="ALL">All Batches ({slots.length} slots)</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={14} color="var(--secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '32px', paddingTop: '6px', paddingBottom: '6px', fontSize: '12.5px' }}
              placeholder="Search schedule…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: WEEKLY CALENDAR MATRIX */}
      {viewMode === 'MATRIX' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(180px, 1fr))', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {weekDays.map((dayNum) => {
            const daySlots = slotsByDay[dayNum] || [];
            return (
              <div
                key={dayNum}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--surface-container-low)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--outline)',
                  minHeight: '480px',
                  overflow: 'hidden'
                }}
              >
                {/* Day Header */}
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--outline)',
                    backgroundColor: 'var(--card-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--on-surface)' }}>
                      {dayNames[dayNum]}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--secondary)', marginTop: '2px' }}>
                      {daySlots.length} {daySlots.length === 1 ? 'Slot' : 'Slots'}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px' }}
                    onClick={() => handleOpenAddSlot(dayNum)}
                    title={`Add slot for ${dayNames[dayNum]}`}
                  >
                    <Plus size={12} />
                  </button>
                </div>

                {/* Day Slot Cards List */}
                <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                  {daySlots.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--secondary)',
                        fontSize: '12px',
                        border: '1px dashed var(--outline)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '24px 12px',
                        textAlign: 'center'
                      }}
                    >
                      <span>No slots</span>
                      <button
                        className="btn btn-secondary"
                        style={{ marginTop: '8px', fontSize: '11px', padding: '4px 8px' }}
                        onClick={() => handleOpenAddSlot(dayNum)}
                      >
                        + Add Slot
                      </button>
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const batchCode = slot.batchCode || (slot as any).batch_code || 'BATCH';
                      const batchName = slot.batchName || (slot as any).batch_name || 'Academic Batch';
                      const roomName = slot.classroomName || (slot as any).classroom_name || 'Room';
                      const profName = slot.professorName || (slot as any).professor_name || 'Faculty';

                      return (
                        <div
                          key={slot.id}
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--outline)',
                            borderLeft: '4px solid var(--primary-container)',
                            padding: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            position: 'relative'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                            <span className="badge badge-purple" style={{ fontSize: '11px' }}>
                              {batchCode}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenEditSlot(slot)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--secondary)',
                                  padding: '2px'
                                }}
                                title="Edit Slot"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSlot(slot.id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--secondary)',
                                  padding: '2px'
                                }}
                                title="Delete Slot"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--on-surface)', lineHeight: '1.3' }}>
                            {batchName}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'var(--primary-container)'
                            }}
                          >
                            <Clock size={12} />
                            <span>{formatToAmPm(slot.startTime)} – {formatToAmPm(slot.endTime)}</span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px', color: 'var(--secondary)', borderTop: '1px solid var(--outline)', paddingTop: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{roomName}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <GraduationCap size={10} />
                              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profName}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: BATCH TIMETABLE EXPLORER */}
      {viewMode === 'BATCH_EXPLORER' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {batches.map((b) => {
            const batchSlots = slots.filter((s) => s.batchId === b.id || (s as any).batch_id === b.id);
            return (
              <div
                key={b.id}
                className="card"
                style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span className="badge badge-purple">{b.code}</span>
                    <span className="badge badge-emerald">{batchSlots.length} Weekly Slots</span>
                  </div>

                  <h3 style={{ fontSize: '17px', fontWeight: 800 }}>{b.name}</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--secondary)', marginTop: '4px', marginBottom: '16px' }}>
                    {b.description?.slice(0, 90) || 'Specialized university batch.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {batchSlots.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--secondary)', backgroundColor: 'var(--surface-container-low)', borderRadius: 'var(--radius-sm)' }}>
                        No schedule slots assigned.
                      </div>
                    ) : (
                      batchSlots.slice(0, 4).map((s) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            backgroundColor: 'var(--surface-container-low)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px'
                          }}
                        >
                          <div>
                            <strong>{dayNames[s.dayOfWeek || 0]}</strong> • {formatToAmPm(s.startTime)} – {formatToAmPm(s.endTime)}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEditSlot(s)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--secondary)' }}
                          >
                            <Edit2 size={11} />
                          </button>
                        </div>
                      ))
                    )}
                    {batchSlots.length > 4 && (
                      <div style={{ fontSize: '11.5px', color: 'var(--primary-container)', textAlign: 'center', fontWeight: 600 }}>
                        +{batchSlots.length - 4} more slots in weekly schedule
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--outline)' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '12px', padding: '6px 10px' }}
                    onClick={() => {
                      setSelectedBatchFilter(b.id);
                      setViewMode('MATRIX');
                    }}
                  >
                    <CalendarDays size={13} />
                    <span>View in Grid</span>
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '6px 10px' }}
                    onClick={() => {
                      setSlotBatchId(b.id);
                      handleOpenAddSlot();
                    }}
                  >
                    <Plus size={13} />
                    <span>Add Slot</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: SCHEDULE TEMPLATES REPOSITORY */}
      {viewMode === 'TEMPLATES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Saved Timetable Templates</h3>
              <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '2px' }}>
                Reusable weekly schedules ready to be deployed to any academic cohort with 1 click.
              </p>
            </div>

            <button className="btn btn-primary" onClick={() => setIsCreateTemplateOpen(true)}>
              <Plus size={15} />
              <span>Create New Template</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
            {templates.map((t) => {
              const slotCount = (t.slots || []).length;
              return (
                <div key={t.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <span className="badge badge-purple">Template</span>
                      <span className="badge badge-emerald">{slotCount} Scheduled Slots</span>
                    </div>

                    <h4 style={{ fontSize: '17px', fontWeight: 800 }}>{t.name}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--secondary)', marginTop: '4px', marginBottom: '16px' }}>
                      {t.description || 'Pre-configured university weekly template pattern.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
                      {(t.slots || []).map((s, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--surface-container-low)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <strong>{dayNames[s.dayOfWeek]}</strong>: {s.subjectName || 'Lecture'}
                          </div>
                          <span className="badge badge-blue">{formatToAmPm(s.startTime)} - {formatToAmPm(s.endTime)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--outline)' }}>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, fontSize: '12.5px', padding: '8px 12px' }}
                      onClick={() => handleOpenApplyModal(t)}
                    >
                      <Copy size={13} />
                      <span>Apply to Batch</span>
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ padding: '8px 12px' }}
                      onClick={() => handleDeleteTemplate(t.id, t.name)}
                      title="Delete Template"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SCHEDULE SLOT */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title={isEditingSlot ? 'Edit Timetable Slot' : 'Schedule New Timetable Slot'}
      >
        <form onSubmit={handleSaveSlot}>
          <div className="form-group">
            <label className="form-label">TARGET ACADEMIC BATCH</label>
            <select
              className="form-select"
              value={slotBatchId}
              onChange={(e) => setSlotBatchId(e.target.value)}
              required
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>

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
              <label className="form-label">START TIME ({formatToAmPm(slotStart)})</label>
              <input
                type="time"
                className="form-input"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">END TIME ({formatToAmPm(slotEnd)})</label>
              <input
                type="time"
                className="form-input"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div style={{ marginBottom: '16px' }}>
            <span className="form-label" style={{ fontSize: '11px' }}>QUICK TIME INTERVAL PRESETS:</span>
            <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => { setSlotStart('09:00'); setSlotEnd('10:30'); }}
              >
                09:00 AM - 10:30 AM (Theory 1)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => { setSlotStart('10:45'); setSlotEnd('12:15'); }}
              >
                10:45 AM - 12:15 PM (Theory 2)
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={() => { setSlotStart('13:30'); setSlotEnd('15:00'); }}
              >
                01:30 PM - 03:00 PM (Afternoon)
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
            <label className="form-label">ASSIGNED PROFESSOR / INSTRUCTOR</label>
            <select
              className="form-select"
              value={slotProfId}
              onChange={(e) => setSlotProfId(e.target.value)}
              required
            >
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.departmentCode || 'Dept'} • {p.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">CLASSROOM / LAB LOCATION</label>
            <select
              className="form-select"
              value={slotRoomId}
              onChange={(e) => setSlotRoomId(e.target.value)}
              required
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
              onClick={() => setIsSlotModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditingSlot ? 'Save Changes' : 'Save Schedule Slot'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: APPLY TEMPLATE TO BATCH */}
      {isApplyModalOpen && templateToApply && (
        <Modal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          title={`Deploy Template: ${templateToApply.name}`}
        >
          <form onSubmit={handleApplyTemplate}>
            <div className="form-group">
              <label className="form-label">SELECT RECIPIENT BATCH</label>
              <select
                className="form-select"
                value={applyTargetBatchId}
                onChange={(e) => setApplyTargetBatchId(e.target.value)}
                required
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} — {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface-container-low)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--outline)',
                fontSize: '13px',
                marginTop: '12px'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '6px' }}>Slots to be copied:</div>
              {(templateToApply.slots || []).map((s, i) => (
                <div key={i} style={{ fontSize: '12px', color: 'var(--secondary)', marginTop: '2px' }}>
                  • {dayNames[s.dayOfWeek]}: {formatToAmPm(s.startTime)} - {formatToAmPm(s.endTime)} ({s.subjectName || 'Class'})
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsApplyModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Deploy Template Now
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: CREATE NEW TEMPLATE */}
      <Modal
        isOpen={isCreateTemplateOpen}
        onClose={() => setIsCreateTemplateOpen(false)}
        title="Create New Reusable Schedule Template"
        maxWidth="680px"
      >
        <form onSubmit={handleCreateTemplate}>
          <div className="form-group">
            <label className="form-label">TEMPLATE NAME</label>
            <input
              type="text"
              className="form-input"
              value={tmplName}
              onChange={(e) => setTmplName(e.target.value)}
              placeholder="e.g. Standard 2nd Year Engineering Schedule"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <input
              type="text"
              className="form-input"
              value={tmplDesc}
              onChange={(e) => setTmplDesc(e.target.value)}
              placeholder="e.g. Balanced 4-day weekly matrix with afternoon lab practicum"
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="form-label" style={{ marginBottom: 0 }}>TEMPLATE SLOTS ({templateSlotItems.length})</span>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '4px 8px' }}
                onClick={handleAddTemplateSlotItem}
              >
                <Plus size={12} />
                <span>Add Slot</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '240px', overflowY: 'auto' }}>
              {templateSlotItems.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 90px 90px 1fr auto',
                    gap: '8px',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: 'var(--surface-container-low)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--outline)'
                  }}
                >
                  <select
                    className="form-select"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    value={item.dayOfWeek}
                    onChange={(e) => {
                      const updated = [...templateSlotItems];
                      updated[idx].dayOfWeek = parseInt(e.target.value, 10);
                      setTemplateSlotItems(updated);
                    }}
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>

                  <input
                    type="time"
                    className="form-input"
                    style={{ fontSize: '12px', padding: '4px 6px' }}
                    value={item.startTime}
                    onChange={(e) => {
                      const updated = [...templateSlotItems];
                      updated[idx].startTime = e.target.value;
                      setTemplateSlotItems(updated);
                    }}
                  />

                  <input
                    type="time"
                    className="form-input"
                    style={{ fontSize: '12px', padding: '4px 6px' }}
                    value={item.endTime}
                    onChange={(e) => {
                      const updated = [...templateSlotItems];
                      updated[idx].endTime = e.target.value;
                      setTemplateSlotItems(updated);
                    }}
                  />

                  <input
                    type="text"
                    className="form-input"
                    style={{ fontSize: '12px', padding: '4px 8px' }}
                    placeholder="Subject Name"
                    value={item.subjectName}
                    onChange={(e) => {
                      const updated = [...templateSlotItems];
                      updated[idx].subjectName = e.target.value;
                      setTemplateSlotItems(updated);
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveTemplateSlotItem(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--secondary)'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCreateTemplateOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
