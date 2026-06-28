import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

function getRoleFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return payload.role || null;
  } catch {
    return null;
  }
}

export default function EventsPage({ onNavigate }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const role = getRoleFromToken();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_BASE}/events`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch events.');
        setEvents(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-12 pb-20">
      {/* Header */}
      <div className="text-center mb-14">
        <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-5">
          Venue Events
        </div>
        <h1 className="text-4xl font-extrabold gradient-text-hero m-0 mb-4">Events</h1>
        <p className="text-slate-500 text-base max-w-md mx-auto leading-relaxed mb-7">
          Browse all events and explore their interactive floor maps.
        </p>
        {role === 'organizer' && (
          <button
            id="create-event-btn"
            onClick={() => onNavigate('create-event')}
            className="btn-gradient text-white border-none px-7 py-3 text-sm font-semibold rounded-lg cursor-pointer font-[inherit] transition-all duration-200"
          >
            + Create Event
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col items-center gap-5 py-20 text-slate-500">
          <div className="w-10 h-10 border-[3px] border-indigo-500/15 border-t-indigo-500 rounded-full animate-spin" />
          <p>Loading events...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="flex flex-col items-center gap-5 py-20 text-slate-500">
          <span className="text-5xl">⚠️</span>
          <p className="text-slate-400">{error}</p>
          <button onClick={() => window.location.reload()} className="bg-white/[0.03] text-slate-50 border border-white/10 px-7 py-3 rounded-lg font-semibold text-sm cursor-pointer font-[inherit] hover:bg-white/[0.08] transition-colors">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && events.length === 0 && (
        <div className="flex flex-col items-center gap-5 py-20 text-slate-500">
          <span className="text-5xl">🗓️</span>
          <p className="text-slate-400">No events created yet.</p>
          {role === 'organizer' && (
            <button id="create-first-event-btn" onClick={() => onNavigate('create-event')} className="btn-gradient text-white border-none px-7 py-3 text-sm font-semibold rounded-lg cursor-pointer font-[inherit] transition-all duration-200">
              Create Your First Event
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && events.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-8">
          {events.map((event) => (
            <div
              key={event._id}
              id={`event-card-${event._id}`}
              className="bg-white/[0.02] border border-white/5 rounded-[18px] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500/30 hover:shadow-[0_16px_40px_-8px_rgba(99,102,241,0.2)] group"
              onClick={() => onNavigate('map-viewer', event._id)}
            >
              {/* Banner */}
              <div className="relative h-52 overflow-hidden bg-[#0b0f19]">
                <img src={event.bannerImageUrl} alt={event.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#06091b]/85 to-transparent flex items-end p-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-slate-50 text-sm font-semibold bg-indigo-500/75 px-4 py-1.5 rounded-lg backdrop-blur-sm">🗺️ View Floor Map</span>
                </div>
              </div>
              {/* Body */}
              <div className="p-5 pb-6">
                <h3 className="text-base font-bold text-slate-50 m-0 mb-2 truncate">{event.name}</h3>
                {event.description && (
                  <p className="text-sm text-slate-500 m-0 mb-4 leading-relaxed line-clamp-2">{event.description}</p>
                )}
                <div className="flex items-center justify-between gap-2">
                  {formatDate(event.date) ? (
                    <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold">📅 {formatDate(event.date)}</span>
                  ) : (
                    <span className="bg-white/[0.03] border border-white/5 text-slate-700 px-3 py-1 rounded-full text-xs font-semibold">No date set</span>
                  )}
                  <span className="text-xs text-slate-700">Has floor map →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
