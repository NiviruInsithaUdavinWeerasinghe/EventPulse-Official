import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  BarChart3, 
  Users, 
  MapPin, 
  Calendar, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EventManagement({ searchQuery }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState("All");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (data.success) {
          // Adapt fields to match the UI keys (or fallback if empty)
          const adapted = data.data.map(e => ({
            id: e._id,
            name: e.name,
            venue: 'Exhibition Arena Hall A',
            date: e.date ? new Date(e.date).toLocaleDateString('en-CA') : '2026-10-15',
            status: e.date && new Date(e.date) < new Date() ? 'Live' : 'Scheduled',
            stallsConfigured: 30,
            stallsBooked: 0,
            attendees: 0,
            revenue: 'LKR 0',
            banner: e.bannerImageUrl
          }));
          setEvents(adapted);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: "",
    venue: "",
    date: "",
    stallsConfigured: 30
  });

  // Filter logic
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          event.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || event.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this event? This action is irreversible.")) {
      setEvents(events.filter(e => e.id !== id));
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setIsCreateModalOpen(false);
    // Redirect to the working event creation page
    navigate('/create-event');
  };


  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Event Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create, edit, analyze, and oversee your exhibition registries.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Plus size={16} />
          Create New Event
        </button>
      </div>

      {/* ── Sub-navigation actions cards ─────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[
          { title: "Active Registrations", value: events.filter(e => e.status !== 'Draft').length, desc: "Scheduled and active on the map viewports", color: "indigo" },
          { title: "Draft Campaigns", value: events.filter(e => e.status === 'Draft').length, desc: "Work in progress and blueprint staging", color: "amber" },
          { title: "Average Stall Bookings", value: `${Math.round(events.reduce((acc, curr) => acc + (curr.stallsBooked/curr.stallsConfigured)*100, 0) / events.length)}%`, desc: "Aggregate occupancy metrics across events", color: "emerald" },
        ].map((c, idx) => {
          const colorBorder = {
            indigo: 'border-indigo-500/10 dark:border-indigo-500/20 bg-indigo-500/5',
            amber: 'border-amber-500/10 dark:border-amber-500/20 bg-amber-500/5',
            emerald: 'border-emerald-500/10 dark:border-emerald-500/20 bg-emerald-500/5',
          }[c.color];
          
          return (
            <div key={idx} className={`p-5 rounded-2xl border ${colorBorder} backdrop-blur-sm`}>
              <h3 className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">{c.title}</h3>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 mb-1">{c.value}</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs leading-normal">{c.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ── Filters Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white dark:bg-zinc-900/40 p-4 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl shadow-xs">
        <div className="flex flex-wrap gap-2">
          {["All", "Live", "Scheduled", "Draft"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">{filteredEvents.length} events matching</span>
        </div>
      </div>

      {/* ── Events Layout Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredEvents.map((evt) => (
          <div 
            key={evt.id} 
            className="group bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{evt.id}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mt-0.5 leading-tight">{evt.name}</h3>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                evt.status === 'Live' 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                  : evt.status === 'Scheduled' 
                  ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                  : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}>
                {evt.status}
              </span>
            </div>

            {/* Info details */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-6 bg-slate-50/50 dark:bg-zinc-800/20 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/50">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <span className="truncate">{evt.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span>{evt.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-400" />
                <span>{evt.stallsBooked} / {evt.stallsConfigured} Stalls (Occupied)</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-slate-400" />
                <span>Attendees: {evt.attendees > 0 ? evt.attendees.toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            {/* Booking occupancy progress bar */}
            <div className="space-y-1.5 mb-6">
              <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                <span>Stall Occupancy Progress</span>
                <span>{Math.round((evt.stallsBooked / evt.stallsConfigured) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${(evt.stallsBooked / evt.stallsConfigured) * 100}%` }}
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-4 mt-auto">
              <div className="text-[11px] font-bold text-slate-400 uppercase">
                Estimated Sales: <span className="text-slate-900 dark:text-slate-200 font-extrabold">{evt.revenue}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button 
                  title="View Analytics" 
                  className="p-2 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer transition-all"
                >
                  <BarChart3 size={15} />
                </button>
                <button 
                  title="Edit details" 
                  className="p-2 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer transition-all"
                >
                  <Edit3 size={15} />
                </button>
                <button 
                  onClick={() => handleDelete(evt.id)}
                  title="Delete event" 
                  className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Create New Event Modal ──────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-slate-950 dark:text-white">Create New Event</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Event Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Expo Trade Show 2026"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={newEvent.name}
                  onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Venue Location</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Convention Center Hall A"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={newEvent.venue}
                  onChange={e => setNewEvent({...newEvent, venue: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Date</label>
                  <input 
                    type="date" 
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={newEvent.date}
                    onChange={e => setNewEvent({...newEvent, date: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Stalls Count</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    value={newEvent.stallsConfigured}
                    onChange={e => setNewEvent({...newEvent, stallsConfigured: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button 
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
