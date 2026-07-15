import React, { useState, useEffect } from 'react';
import { Clock, User, Activity } from 'lucide-react';

export default function EventTimeline({ eventId }) {
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const fetchSchedule = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      // JS getTimezoneOffset() returns minutes, e.g. 330 for UTC-5:30 (standard JS returns offset opposite of standard sign)
      const offset = new Date().getTimezoneOffset();
      const res = await fetch(`/api/events/${eventId}/schedule?timezoneOffset=${offset}`);
      if (!res.ok) throw new Error('Failed to load event timeline.');
      const result = await res.json();
      if (result.success) {
        setSchedule(result.data);
      }
    } catch (err) {
      console.error('Error fetching schedule:', err);
      if (!isSilent) setError(err.message);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Initial fetch and ticking timer
  useEffect(() => {
    fetchSchedule(false);

    // Poll schedule every 60 seconds (US-201-SUB-3 / EP-127)
    const pollInterval = setInterval(() => {
      fetchSchedule(true);
    }, 60000);

    // Tick current time every 5 seconds to update live badge instantly if boundaries are crossed
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(clockInterval);
    };
  }, [eventId]);

  const getEventState = (startStr, endStr) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    const now = currentTime;

    if (now >= start && now <= end) return 'LIVE';
    if (now > end) return 'PAST';
    return 'UPCOMING';
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-500">
        <div className="w-8 h-8 border-2 border-indigo-500/25 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-xs">Loading live schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 text-center text-rose-400 text-xs">
        ⚠️ {error}
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-indigo-400 w-5 h-5 animate-pulse" />
            Live Event Schedule
          </h2>
          <p className="text-xs text-slate-400 mt-1">Ongoing sessions and timeline for today</p>
        </div>
        <span className="text-[10px] font-medium px-2 py-1 rounded bg-white/[0.04] text-slate-400 border border-white/5">
          Auto-refreshing
        </span>
      </div>

      {schedule.length === 0 ? (
        <div className="py-12 text-center rounded-2xl border border-white/5 bg-white/[0.01]">
          <p className="text-sm text-slate-500">No scheduled sessions for today.</p>
        </div>
      ) : (
        <div className="relative border-l border-white/10 ml-3 pl-6 space-y-8 py-2">
          {schedule.map((item) => {
            const state = getEventState(item.start_time, item.end_time);
            const isLive = state === 'LIVE';
            const isPast = state === 'PAST';

            return (
              <div 
                key={item._id} 
                className={`relative transition-all duration-300 ${
                  isPast ? 'opacity-50 grayscale-[25%]' : ''
                }`}
              >
                {/* Timeline node marker indicator */}
                <div 
                  className={`absolute -left-[33px] top-1.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isLive 
                      ? 'bg-emerald-500 border-emerald-400 ring-4 ring-emerald-500/20 scale-110 shadow-lg shadow-emerald-500/50' 
                      : isPast
                        ? 'bg-slate-700 border-slate-600'
                        : 'bg-indigo-600 border-indigo-400'
                  }`}
                >
                  {isLive && (
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  )}
                </div>

                {/* Event Card */}
                <div 
                  className={`rounded-2xl p-5 border transition-all duration-300 ${
                    isLive 
                      ? 'border-emerald-500/30 bg-emerald-500/[0.02] shadow-2xl shadow-emerald-500/[0.02]' 
                      : 'border-white/5 bg-white/[0.01] hover:border-indigo-500/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2.5">
                        <span className="text-[11px] font-bold tracking-wide uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          {item.stage}
                        </span>
                        
                        {isLive && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 uppercase tracking-widest shadow-sm shadow-emerald-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                            Live
                          </span>
                        )}

                        {isPast && (
                          <span className="text-[10px] font-bold text-slate-500 bg-white/[0.03] px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Completed
                          </span>
                        )}
                      </div>

                      <h3 className={`text-base font-extrabold mt-2 leading-snug ${isPast ? 'text-slate-400 line-through decoration-slate-600' : 'text-white'}`}>
                        {item.name}
                      </h3>
                      
                      <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mt-1">
                        {item.description}
                      </p>
                    </div>

                    {/* Metadata column */}
                    <div className="flex flex-col gap-1.5 sm:text-right shrink-0 mt-1 text-slate-400">
                      <span className="text-xs font-bold text-slate-200 flex items-center sm:justify-end gap-1.5">
                        <Clock size={13} className="text-indigo-450" />
                        {formatTime(item.start_time)} - {formatTime(item.end_time)}
                      </span>
                      {item.performer && (
                        <span className="text-[11px] flex items-center sm:justify-end gap-1 text-slate-400">
                          <User size={12} />
                          {item.performer}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
