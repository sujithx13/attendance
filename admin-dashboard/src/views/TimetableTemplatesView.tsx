import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Clock,
  MapPin,
  Zap,
  CheckCircle2,
  AlertCircle,
  Copy,
  Layers
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import type {
  TimetableSlot,
  TimetableTemplate,
  Course,
  Batch,
  User
} from '../types/index.js';

export const TimetableTemplatesView: React.FC = () => {
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);

  // Cohort Filter State (NOT "one for all"!)
  const [filterType, setFilterType] = useState<'ALL' | 'CLASS' | 'BATCH'>('ALL');
  const [selectedCohortId, setSelectedCohortId] = useState<string>('');

  // Create Template Modal State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const templateSlots = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '10:30', subjectName: 'Core Theory Slot A', classroomId: 'clr_turing_hall', professorId: 'usr_prof_alan' },
    { dayOfWeek: 3, startTime: '11:00', endTime: '12:30', subjectName: 'Laboratory Practicum B', classroomId: 'clr_lovelace_lab', professorId: 'usr_prof_ada' }
  ];

  // Apply Template Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [selectedTemplateToApply, setSelectedTemplateToApply] = useState<TimetableTemplate | null>(null);
  const [targetType, setTargetType] = useState<'CLASS' | 'BATCH'>('CLASS');
  const [targetId, setTargetId] = useState('');

  // Single Slot Modal State
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotDay, setSlotDay] = useState(1);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:30');
  const [slotTargetType, setSlotTargetType] = useState<'CLASS' | 'BATCH'>('CLASS');
  const [slotTargetId, setSlotTargetId] = useState('');
  const [slotProfId, setSlotProfId] = useState('');
  const [slotRoomId, setSlotRoomId] = useState('clr_turing_hall');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchAllData = async () => {
    try {
      const [tmplRes, crsRes, btcRes, profRes] = await Promise.all([
        api.getTemplates(),
        api.getCourses(),
        api.getBatches(),
        api.getUsers({ role: 'PROFESSOR' })
      ]);
      setTemplates(tmplRes.templates || []);
      setCourses(crsRes.courses || []);
      setBatches(btcRes.batches || []);
      setProfessors(profRes.users || []);

      if (crsRes.courses?.length > 0 && !targetId) {
        setTargetId(crsRes.courses[0].id);
        setSlotTargetId(crsRes.courses[0].id);
      }
      if (profRes.users?.length > 0 && !slotProfId) {
        setSlotProfId(profRes.users[0].id);
      }

      await loadFilteredSlots();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load scheduling data.' });
    }
  };

  const loadFilteredSlots = async () => {
    try {
      const filters: any = {};
      if (filterType === 'CLASS' && selectedCohortId) {
        filters.courseId = selectedCohortId;
      } else if (filterType === 'BATCH' && selectedCohortId) {
        filters.batchId = selectedCohortId;
      }
      const res = await api.getTimetableSlots(filters);
      setSlots(res.slots || []);
    } catch (err: any) {
      console.error('Failed to load slots', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    loadFilteredSlots();
  }, [filterType, selectedCohortId]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createTemplate({
        name: templateName,
        description: templateDesc,
        slots: templateSlots
      });
      setFeedback({ type: 'success', message: `Timetable Template "${templateName}" saved!` });
      setIsTemplateModalOpen(false);
      setTemplateName('');
      setTemplateDesc('');
      const res = await api.getTemplates();
      setTemplates(res.templates || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create template.' });
    }
  };

  const handleApplyTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateToApply || !targetId) return;
    setFeedback(null);
    try {
      const res = await api.applyTemplateToCohort(selectedTemplateToApply.id, targetType, targetId);
      setFeedback({ type: 'success', message: res.message });
      setIsApplyModalOpen(false);
      loadFilteredSlots();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to apply template.' });
    }
  };

  const handleDeleteTemplate = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await api.deleteTemplate(id);
      setFeedback({ type: 'success', message: `Template "${name}" deleted.` });
      const res = await api.getTemplates();
      setTemplates(res.templates || []);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete template.' });
    }
  };

  const handleCreateSingleSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await api.createTimetableSlot({
        scheduleType: 'RECURRING_WEEKLY',
        dayOfWeek: slotDay,
        startTime: slotStart,
        endTime: slotEnd,
        targetType: slotTargetType,
        courseId: slotTargetType === 'CLASS' ? slotTargetId : undefined,
        batchId: slotTargetType === 'BATCH' ? slotTargetId : undefined,
        professorId: slotProfId,
        classroomId: slotRoomId
      });
      setFeedback({ type: 'success', message: 'Timetable slot created!' });
      setIsSlotModalOpen(false);
      loadFilteredSlots();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create slot.' });
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Remove this scheduled slot?')) return;
    try {
      await api.deleteTimetableSlot(id);
      setFeedback({ type: 'success', message: 'Slot removed from schedule.' });
      loadFilteredSlots();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete slot.' });
    }
  };

  const handleGenerateToday = async () => {
    setGenerating(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await api.generateSessionsForDate(today);
      setFeedback({ type: 'success', message: `Spawned ${res.sessionsGenerated} active attendance sessions for today!` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate sessions.' });
    } finally {
      setGenerating(false);
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Timetable Templates & Cohort Scheduling</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Build reusable weekly schedule templates and assign them directly to specific Classes or Batches (not as a single one-for-all).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(true)}>
            <Plus size={16} />
            <span>Create New Template</span>
          </button>

          <button className="btn btn-secondary" onClick={() => setIsSlotModalOpen(true)}>
            <Plus size={16} />
            <span>Add Single Slot</span>
          </button>

          <button className="btn btn-primary" onClick={handleGenerateToday} disabled={generating}>
            <Zap size={16} />
            <span>{generating ? 'Spawning…' : "Generate Today's Sessions"}</span>
          </button>
        </div>
      </div>

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

      {/* TEMPLATES LIBRARY CARDS */}
      <div className="card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--kahe-green-light)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Saved Timetable Templates</h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            {templates.length} saved template(s) available for assignment
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
          {templates.map((tmpl) => (
            <div
              key={tmpl.id}
              style={{
                padding: '16px',
                backgroundColor: 'var(--bg-surface-raised)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13px', color: 'var(--text-main)' }}>{tmpl.name}</strong>
                  <span className="badge badge-emerald">{tmpl.slot_count || tmpl.slots?.length || 0} Slots</span>
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {tmpl.description || 'Standard recurring weekly timetable layout.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '6px', fontSize: '11px' }}
                  onClick={() => {
                    setSelectedTemplateToApply(tmpl);
                    setIsApplyModalOpen(true);
                  }}
                >
                  <Copy size={12} />
                  <span>Assign to Cohort</span>
                </button>
                <button
                  className="btn btn-danger"
                  style={{ padding: '6px 8px', fontSize: '11px' }}
                  onClick={() => handleDeleteTemplate(tmpl.id, tmpl.name)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* COHORT FILTER BAR (Not "one-for-all") */}
      <div className="filter-bar">
        <div className="filter-group">
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>VIEW CALENDAR FOR:</span>

          <button
            className={`tab-pill ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('ALL');
              setSelectedCohortId('');
            }}
          >
            All Active Slots ({slots.length})
          </button>

          <button
            className={`tab-pill ${filterType === 'CLASS' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('CLASS');
              if (courses.length > 0) setSelectedCohortId(courses[0].id);
            }}
          >
            Specific Class
          </button>

          <button
            className={`tab-pill ${filterType === 'BATCH' ? 'active' : ''}`}
            onClick={() => {
              setFilterType('BATCH');
              if (batches.length > 0) setSelectedCohortId(batches[0].id);
            }}
          >
            Specific Batch
          </button>
        </div>

        {filterType === 'CLASS' && (
          <div className="filter-group">
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT CLASS:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {filterType === 'BATCH' && (
          <div className="filter-group">
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>SELECT BATCH:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
              value={selectedCohortId}
              onChange={(e) => setSelectedCohortId(e.target.value)}
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 7-DAY VISUAL CALENDAR GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', overflowX: 'auto' }}>
        {daysOfWeek.map((dayName, idx) => {
          const dayIndex = idx + 1 > 6 ? 0 : idx + 1; // 1 = Mon, ..., 6 = Sat, 0 = Sun
          const daySlots = slots.filter((s) => s.dayOfWeek === dayIndex);

          return (
            <div
              key={dayName}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                minHeight: '380px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  padding: '12px',
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface-raised)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'center'
                }}
              >
                {dayName.toUpperCase()}
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 500 }}>
                  {daySlots.length} Session(s)
                </div>
              </div>

              <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {daySlots.length === 0 ? (
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '30px' }}>
                    No classes
                  </div>
                ) : (
                  daySlots.map((slot) => {
                    const isBatch = slot.targetType === 'BATCH';
                    return (
                      <div
                        key={slot.id}
                        style={{
                          padding: '10px',
                          backgroundColor: 'var(--bg-surface-raised)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: `3px solid ${isBatch ? 'var(--accent-purple)' : 'var(--kahe-green-light)'}`,
                          fontSize: '11px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <span className={`badge ${isBatch ? 'badge-purple' : 'badge-emerald'}`} style={{ fontSize: '9px', padding: '2px 5px' }}>
                            {slot.courseCode || slot.batchCode || slot.targetType}
                          </span>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}
                            title="Remove slot"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>

                        <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '11px', lineHeight: '1.2' }}>
                          {slot.courseTitle || slot.batchName || 'Lecture Slot'}
                        </strong>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          <Clock size={10} />
                          <span>{slot.startTime} – {slot.endTime}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', marginTop: '2px' }}>
                          <MapPin size={10} />
                          <span>{slot.classroomName || 'Room Hall A'}</span>
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

      {/* CREATE TEMPLATE MODAL */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        title="Create Reusable Timetable Template"
      >
        <form onSubmit={handleCreateTemplate}>
          <div className="form-group">
            <label className="form-label">TEMPLATE NAME</label>
            <input
              type="text"
              className="form-input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. 2nd Year Core Theory + Lab Master Schedule"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">DESCRIPTION</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={templateDesc}
              onChange={(e) => setTemplateDesc(e.target.value)}
              placeholder="Overview of weekly schedule structure..."
            />
          </div>

          <div style={{ marginTop: '16px', padding: '14px', backgroundColor: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-md)' }}>
            <span className="form-label" style={{ display: 'block', marginBottom: '8px' }}>
              CONFIGURED SLOTS IN THIS TEMPLATE ({templateSlots.length}):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px' }}>
              {templateSlots.map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', backgroundColor: 'var(--bg-app)', borderRadius: '4px' }}>
                  <span>{daysOfWeek[s.dayOfWeek - 1] || 'Day'}: {s.subjectName}</span>
                  <span style={{ color: 'var(--kahe-green-light)' }}>{s.startTime} – {s.endTime}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsTemplateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Template
            </button>
          </div>
        </form>
      </Modal>

      {/* ASSIGN TEMPLATE TO COHORT MODAL */}
      {selectedTemplateToApply && (
        <Modal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          title={`Assign Template: ${selectedTemplateToApply.name}`}
        >
          <form onSubmit={handleApplyTemplate}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Assigning this template will instantly generate and schedule recurring weekly timetable slots specifically for your chosen cohort.
            </p>

            <div className="form-group">
              <label className="form-label">TARGET COHORT TYPE</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${targetType === 'CLASS' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setTargetType('CLASS');
                    if (courses.length > 0) setTargetId(courses[0].id);
                  }}
                >
                  Departmental Class
                </button>
                <button
                  type="button"
                  className={`btn ${targetType === 'BATCH' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                  onClick={() => {
                    setTargetType('BATCH');
                    if (batches.length > 0) setTargetId(batches[0].id);
                  }}
                >
                  Flexible Batch
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">SELECT SPECIFIC COHORT</label>
              <select
                className="form-select"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
              >
                {targetType === 'CLASS'
                  ? courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.title}
                      </option>
                    ))
                  : batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
              </select>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsApplyModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Apply Template to Cohort
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* SINGLE SLOT MODAL */}
      <Modal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        title="Schedule Single Recurring Slot"
      >
        <form onSubmit={handleCreateSingleSlot}>
          <div className="form-group">
            <label className="form-label">DAY OF WEEK</label>
            <select
              className="form-select"
              value={slotDay}
              onChange={(e) => setSlotDay(Number(e.target.value))}
            >
              <option value={1}>Monday</option>
              <option value={2}>Tuesday</option>
              <option value={3}>Wednesday</option>
              <option value={4}>Thursday</option>
              <option value={5}>Friday</option>
              <option value={6}>Saturday</option>
              <option value={0}>Sunday</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">START TIME</label>
              <input
                type="time"
                className="form-input"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">END TIME</label>
              <input
                type="time"
                className="form-input"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">COHORT TYPE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${slotTargetType === 'CLASS' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setSlotTargetType('CLASS');
                  if (courses.length > 0) setSlotTargetId(courses[0].id);
                }}
              >
                Class
              </button>
              <button
                type="button"
                className={`btn ${slotTargetType === 'BATCH' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => {
                  setSlotTargetType('BATCH');
                  if (batches.length > 0) setSlotTargetId(batches[0].id);
                }}
              >
                Batch
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">ASSIGNED COHORT</label>
            <select
              className="form-select"
              value={slotTargetId}
              onChange={(e) => setSlotTargetId(e.target.value)}
            >
              {slotTargetType === 'CLASS'
                ? courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))
                : batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} — {b.name}
                    </option>
                  ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">PROFESSOR</label>
            <select
              className="form-select"
              value={slotProfId}
              onChange={(e) => setSlotProfId(e.target.value)}
            >
              {professors.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName} ({p.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">CLASSROOM</label>
            <select
              className="form-select"
              value={slotRoomId}
              onChange={(e) => setSlotRoomId(e.target.value)}
            >
              <option value="clr_turing_hall">Turing Hall (Building A)</option>
              <option value="clr_lovelace_lab">Lovelace Lab (Building B)</option>
            </select>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsSlotModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Schedule Slot
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
