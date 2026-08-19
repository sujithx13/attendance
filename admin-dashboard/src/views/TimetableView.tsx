import React, { useState, useEffect } from 'react';
import {
  Plus,
  Zap,
  Repeat,
  Calendar as CalendarIcon,
  Trash2,
  Users,
  BookOpen,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api.js';
import { Modal } from '../components/layout/Modal.js';
import type { TimetableSlot, Batch } from '../types/index.js';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
  { id: 0, name: 'Sunday' }
];

export const TimetableView: React.FC = () => {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeTab, setActiveTab] = useState<'recurring' | 'daily'>('recurring');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotType, setSlotType] = useState<'RECURRING_WEEKLY' | 'SPECIFIC_DATE'>('RECURRING_WEEKLY');
  const [targetType, setTargetType] = useState<'CLASS' | 'BATCH'>('CLASS');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [specificDate, setSpecificDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [courseCode, setCourseCode] = useState('CS101');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [professorId, setProfessorId] = useState('usr_prof_alan');
  const [classroomId, setClassroomId] = useState('room_hall_a');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [generating, setGenerating] = useState(false);

  const fetchTimetable = async () => {
    try {
      const res = await api.getTimetableSlots();
      setSlots(res.slots || []);
      const batchRes = await api.getBatches();
      setBatches(batchRes.batches || []);
      if (batchRes.batches && batchRes.batches.length > 0) {
        setSelectedBatchId(batchRes.batches[0].id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load timetable.' });
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTimetableSlot({
        scheduleType: slotType,
        dayOfWeek: slotType === 'RECURRING_WEEKLY' ? dayOfWeek : undefined,
        specificDate: slotType === 'SPECIFIC_DATE' ? specificDate : undefined,
        startTime,
        endTime,
        targetType,
        courseId: targetType === 'CLASS' ? `crs_${courseCode.toLowerCase()}` : undefined,
        batchId: targetType === 'BATCH' ? selectedBatchId : undefined,
        professorId,
        classroomId
      });

      setFeedback({
        type: 'success',
        message: `Successfully scheduled ${targetType === 'CLASS' ? courseCode : 'Batch'} slot!`
      });
      setIsModalOpen(false);
      fetchTimetable();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create slot.' });
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Are you sure you want to remove this timetable slot?')) return;
    try {
      await api.deleteTimetableSlot(id);
      setFeedback({ type: 'success', message: 'Timetable slot removed.' });
      fetchTimetable();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete slot.' });
    }
  };

  const handleGenerateTodaySessions = async () => {
    setGenerating(true);
    setFeedback(null);
    try {
      const res = await api.generateSessionsForDate(selectedDate);
      setFeedback({
        type: 'success',
        message: `Generated ${res.sessionsGenerated} live attendance session(s) for ${res.targetDate} based on master schedule!`
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to generate sessions.' });
    } finally {
      setGenerating(false);
    }
  };

  // Group recurring slots by day of week
  const slotsByDay: Record<number, TimetableSlot[]> = {
    1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 0: []
  };

  slots
    .filter((s) => (activeTab === 'recurring' ? s.scheduleType === 'RECURRING_WEEKLY' : true))
    .forEach((s) => {
      if (s.dayOfWeek !== null && s.dayOfWeek !== undefined) {
        slotsByDay[s.dayOfWeek]?.push(s);
      }
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Control Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 800 }}>Master Timetable & Scheduling Engine</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Configure recurring weekly timetable blocks on repeat or deploy single-day custom schedules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>Schedule New Slot</span>
          </button>

          <button
            className="btn btn-primary"
            onClick={handleGenerateTodaySessions}
            disabled={generating}
          >
            <Zap size={16} />
            <span>{generating ? 'Spawning Sessions…' : "Generate Day's Live Sessions"}</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          style={{
            backgroundColor: feedback.type === 'success' ? 'var(--primary-soft)' : 'var(--accent-rose-soft)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            color: feedback.type === 'success' ? 'var(--primary-light)' : '#FB7185'
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Scheduling Mode Switcher & Date Picker */}
      <div
        className="card"
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${activeTab === 'recurring' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '8px 14px' }}
            onClick={() => setActiveTab('recurring')}
          >
            <Repeat size={14} />
            <span>Weekly Master (On Repeat)</span>
          </button>

          <button
            className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '8px 14px' }}
            onClick={() => setActiveTab('daily')}
          >
            <CalendarIcon size={14} />
            <span>Daily Custom Overrides</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Target Execution Date:</span>
          <input
            type="date"
            className="form-input"
            style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* 7-Day Timetable Grid */}
      <div className="card" style={{ padding: '20px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--primary)' }} />
              <strong>Core Classes</strong> (Single Dept)
            </span>
            <span style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: 'var(--accent-purple)' }} />
              <strong>Flexible Batches</strong> (Cross-Dept / Multi-Year)
            </span>
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Showing {slots.length} scheduled timeblock(s)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', minWidth: '940px' }}>
          {DAYS_OF_WEEK.map((d) => {
            const daySlots = slotsByDay[d.id] || [];
            const isToday = new Date().getDay() === d.id;

            return (
              <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className={`day-column-header ${isToday ? 'today' : ''}`}>
                  <div>{d.name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {daySlots.length} slot(s)
                  </div>
                </div>

                <div className="time-slot-cell" style={{ flex: 1 }}>
                  {daySlots.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', marginTop: '30px' }}>
                      No slots
                    </div>
                  ) : (
                    daySlots.map((slot) => {
                      const isBatch = slot.targetType === 'BATCH';
                      return (
                        <div
                          key={slot.id}
                          className={`timetable-card ${isBatch ? 'batch-slot' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div className="slot-time">
                              <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                              {slot.startTime} – {slot.endTime}
                            </div>
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                padding: '2px'
                              }}
                              title="Delete slot"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="slot-title">
                            {isBatch ? (
                              <span style={{ color: 'var(--accent-purple-soft)' }}>
                                <Users size={12} style={{ display: 'inline', marginRight: '4px', color: '#C084FC' }} />
                                {slot.batchName || slot.batchCode || 'Batch Session'}
                              </span>
                            ) : (
                              <span>
                                <BookOpen size={12} style={{ display: 'inline', marginRight: '4px', color: 'var(--primary)' }} />
                                {slot.courseCode || 'Course Session'}
                              </span>
                            )}
                          </div>

                          <div className="slot-sub">
                            <MapPin size={10} style={{ display: 'inline', marginRight: '3px' }} />
                            {slot.classroomName || 'Room Hall A'} • {slot.professorName || 'Prof. Alan'}
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
      </div>

      {/* Create Slot Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Timetable Slot"
      >
        <form onSubmit={handleCreateSlot}>
          <div className="form-group">
            <label className="form-label">SCHEDULE TYPE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${slotType === 'RECURRING_WEEKLY' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setSlotType('RECURRING_WEEKLY')}
              >
                Recurring Weekly (On Repeat)
              </button>
              <button
                type="button"
                className={`btn ${slotType === 'SPECIFIC_DATE' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setSlotType('SPECIFIC_DATE')}
              >
                Specific Date Only
              </button>
            </div>
          </div>

          {slotType === 'RECURRING_WEEKLY' ? (
            <div className="form-group">
              <label className="form-label">DAY OF WEEK</label>
              <select
                className="form-select"
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.id} value={d.id}>
                    Every {d.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">CALENDAR DATE</label>
              <input
                type="date"
                className="form-input"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                required
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">START TIME</label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">END TIME</label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">TARGET COHORT TYPE</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${targetType === 'CLASS' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setTargetType('CLASS')}
              >
                Class (Same Department)
              </button>
              <button
                type="button"
                className={`btn ${targetType === 'BATCH' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, padding: '8px', fontSize: '12px' }}
                onClick={() => setTargetType('BATCH')}
              >
                Batch (Flexible Cohort)
              </button>
            </div>
          </div>

          {targetType === 'CLASS' ? (
            <div className="form-group">
              <label className="form-label">COURSE CODE</label>
              <select
                className="form-select"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
              >
                <option value="CS101">CS101 - Distributed Systems (CSE)</option>
                <option value="IT201">IT201 - Cloud Architecture (IT)</option>
                <option value="ME301">ME301 - Thermal Dynamics (MECH)</option>
                <option value="EC101">EC101 - Digital Signal Processing (ECE)</option>
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label">SELECT BATCH</label>
              <select
                className="form-select"
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code}) {b.allowCrossDepartment ? '• Cross-Dept' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">ASSIGNED FACULTY</label>
              <select
                className="form-select"
                value={professorId}
                onChange={(e) => setProfessorId(e.target.value)}
              >
                <option value="usr_prof_alan">Prof. Alan Turing (CSE)</option>
                <option value="usr_prof_ada">Prof. Ada Lovelace (IT)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">CLASSROOM</label>
              <select
                className="form-select"
                value={classroomId}
                onChange={(e) => setClassroomId(e.target.value)}
              >
                <option value="room_hall_a">Hall A (Main Block)</option>
                <option value="room_lab_1">Lab 1 (CS Block)</option>
                <option value="room_sem_2">Seminar Hall 2</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Slot to Master Timetable
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
