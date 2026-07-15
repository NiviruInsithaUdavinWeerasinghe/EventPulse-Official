import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Plus, Pencil, Trash2, X, Clock, User,
  MapPin, CheckCircle, AlertCircle, ChevronDown, Loader
} from 'lucide-react';

const EMPTY_FORM = {
  name: '', description: '', start_time: '', end_time: '', stage: '', performer: ''
};

function toLocalDatetimeInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplayTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ScheduleManager() {
  const [events, setEvents]           = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sessions, setSessions]       = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState(null);
  const [toast, setToast]             = useState(null);

  // Modal state
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingId, setEditingId]     = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all events for the dropdown
  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(res => {
        if (res.success) setEvents(res.data || []);
      })
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, []);

  // Fetch sessions whenever selected event changes
  const fetchSessions = useCallback(async () => {
    if (!selectedEventId) { setSessions([]); return; }
    setLoadingSessions(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/schedule`);
      const data = await res.json();
      if (data.success) setSessions(data.data || []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, [selectedEventId]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name,
      description: s.description || '',
      start_time: toLocalDatetimeInput(s.start_time),
      end_time: toLocalDatetimeInput(s.end_time),
      stage: s.stage,
      performer: s.performer || ''
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.start_time || !form.end_time || !form.stage.trim()) {
      setFormError('Name, Stage, Start Time and End Time are required.');
      return;
    }
    if (new Date(form.start_time) >= new Date(form.end_time)) {
      setFormError('Start time must be before end time.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form };
      const url    = editingId ? `/api/events/schedule/${editingId}` : `/api/events/${selectedEventId}/schedule`;
      const method = editingId ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast(editingId ? 'Session updated!' : 'Session added!');
      setModalOpen(false);
      fetchSessions();
    } catch (err) {
      setFormError(err.message || 'Failed to save session.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/events/schedule/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showToast('Session deleted.', 'success');
      fetchSessions();
    } catch (err) {
      showToast(err.message || 'Failed to delete.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-slide-up
          ${toast.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
          }`}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CalendarDays className="text-indigo-500" size={22} />
            Schedule Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add and manage live sessions for your events. Attendees see this timeline in real time.
          </p>
        </div>

        <button
          onClick={openCreate}
          disabled={!selectedEventId}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus size={15} /> Add Session
        </button>
      </div>

      {/* Event Selector */}
      <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Select Event
        </label>
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={e => setSelectedEventId(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10 cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">— Choose an event —</option>
            {events.map(e => (
              <option key={e._id} value={e._id} className="bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200">{e.name}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Sessions Table */}
      {!selectedEventId ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
          <CalendarDays size={32} className="text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Select an event above to manage its sessions.</p>
        </div>
      ) : loadingSessions ? (
        <div className="py-16 flex justify-center">
          <Loader size={24} className="text-indigo-500 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
          <CalendarDays size={32} className="text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">No sessions yet. Click "Add Session" to create the first one.</p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all"
          >
            <Plus size={14} /> Add First Session
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {sessions.length} Session{sessions.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800/80">
            {sessions.map(s => (
              <div key={s._id} className="flex items-start gap-4 p-5 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                {/* Left: time column */}
                <div className="shrink-0 w-24 text-right hidden sm:block">
                  <p className="text-xs font-bold text-indigo-500">{formatDisplayTime(s.start_time)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatDisplayDate(s.start_time)}</p>
                </div>

                {/* Divider dot */}
                <div className="hidden sm:flex flex-col items-center shrink-0 pt-1">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div className="w-px flex-1 bg-slate-200 dark:bg-zinc-700 mt-1" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 items-center mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                      {s.stage}
                    </span>
                    <span className="text-[10px] text-slate-400 sm:hidden">
                      {formatDisplayTime(s.start_time)} – {formatDisplayTime(s.end_time)}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{s.description}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {formatDisplayTime(s.start_time)} – {formatDisplayTime(s.end_time)}
                    </span>
                    {s.performer && (
                      <span className="flex items-center gap-1">
                        <User size={11} /> {s.performer}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                    title="Edit session"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(s._id)}
                    disabled={deleting === s._id}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete session"
                  >
                    {deleting === s._id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-2xl animate-slide-up overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                {editingId ? 'Edit Session' : 'Add New Session'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Session Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Opening Keynote"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of this session..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {/* Start / End time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Start Time *</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">End Time *</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Stage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={11} /> Stage / Location *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Stage, Stage A, Workshop Hall"
                  value={form.stage}
                  onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Performer */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={11} /> Performer / Speaker
                </label>
                <input
                  type="text"
                  placeholder="e.g. DJ Arjun, Dr. Perera"
                  value={form.performer}
                  onChange={e => setForm(f => ({ ...f, performer: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {formError && (
                <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl px-4 py-2.5">
                  <AlertCircle size={13} /> {formError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-zinc-800">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-bold border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                {saving ? <Loader size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {editingId ? 'Save Changes' : 'Add Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
