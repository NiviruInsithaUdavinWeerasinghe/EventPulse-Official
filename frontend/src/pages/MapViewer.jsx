import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

export default function MapViewer({ eventId, onNavigate }) {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${eventId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Event not found.');
        setEvent(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 h-[calc(100vh-80px)] text-slate-500">
        <div className="w-10 h-10 border-[3px] border-indigo-500/15 border-t-indigo-500 rounded-full animate-spin" />
        <p>Loading floor map...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 h-[calc(100vh-80px)] text-slate-500">
        <span className="text-5xl">⚠️</span>
        <p className="text-slate-400">{error || 'Event not found.'}</p>
        <button onClick={() => onNavigate('events')} className="bg-white/[0.03] text-slate-50 border border-white/10 px-7 py-3 rounded-lg font-semibold text-sm cursor-pointer font-[inherit] hover:bg-white/[0.08] transition-colors">Back to Events</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] overflow-hidden bg-[#020611]">

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3.5 bg-[#0b0f19]/95 border-b border-white/5 shrink-0 gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <button
            id="back-to-events-btn"
            onClick={() => onNavigate('events')}
            className="bg-white/[0.04] border border-white/[0.08] text-slate-400 px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer font-[inherit] transition-all duration-200 whitespace-nowrap shrink-0 hover:bg-white/[0.08] hover:text-slate-50"
          >
            ← Back
          </button>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-base font-bold text-slate-50 truncate">{event.name}</span>
            {formatDate(event.date) && <span className="text-xs text-slate-600">📅 {formatDate(event.date)}</span>}
          </div>
        </div>
        <a
          href={event.floorMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-500/[0.08] border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-lg text-sm font-semibold no-underline transition-colors whitespace-nowrap hover:bg-indigo-500/[0.18] shrink-0"
        >
          Open Original ↗
        </a>
      </div>

      {/* Body: map + panel */}
      <div className="flex flex-1 overflow-hidden max-[768px]:flex-col">

        {/* Map area */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 map-grid-bg">
          <div className="relative max-w-full max-h-full rounded-xl overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_60px_-12px_rgba(0,0,0,0.8)]">
            <img
              id="floormap-image"
              src={event.floorMapUrl}
              alt={`${event.name} floor map`}
              className="block max-w-full max-h-[calc(100vh-200px)] object-contain bg-[#0b0f19] max-[768px]:max-h-[50vh]"
            />
            <div id="map-interactive-overlay" className="absolute inset-0 pointer-events-none" />
          </div>
        </div>

        {/* Right panel */}
        <aside className="w-[280px] shrink-0 bg-[#0b0f19]/95 border-l border-white/5 overflow-y-auto p-6 flex flex-col gap-4 max-[768px]:w-full max-[768px]:border-l-0 max-[768px]:border-t max-[768px]:border-white/5 max-[768px]:max-h-[260px]">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-base font-bold text-slate-50 m-0">Map Controls</h2>
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[0.68rem] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">Coming Soon</span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[0.75rem] font-semibold text-slate-600 uppercase tracking-widest m-0">Event</p>
            <p className="text-sm text-slate-200 m-0 leading-relaxed">{event.name}</p>
          </div>

          {event.description && (
            <div className="flex flex-col gap-1">
              <p className="text-[0.75rem] font-semibold text-slate-600 uppercase tracking-widest m-0">Description</p>
              <p className="text-sm text-slate-500 m-0 leading-relaxed">{event.description}</p>
            </div>
          )}

          {formatDate(event.date) && (
            <div className="flex flex-col gap-1">
              <p className="text-[0.75rem] font-semibold text-slate-600 uppercase tracking-widest m-0">Date</p>
              <p className="text-sm text-slate-200 m-0">{formatDate(event.date)}</p>
            </div>
          )}

          <div className="h-px bg-white/5 my-1" />

          <div className="flex flex-col gap-2">
            {[['🏪','Stall Manager'],['📍','Zone Labels'],['🔥','Congestion Heat Map'],['🧭','Routing']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-xl text-slate-700 text-sm font-medium cursor-default">
                <span className="text-lg opacity-40">{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <p className="text-[0.75rem] text-slate-800 leading-relaxed m-0 text-center">
            Interactive controls will be implemented in upcoming sprints.
          </p>
        </aside>
      </div>
    </div>
  );
}
