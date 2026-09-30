import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';
import EventTimeline from '../components/EventTimeline.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTier, setSelectedTier] = useState('Standard');

  const tiers = [
    { value: 'VIP', label: 'VIP Ticket', price: 15000, desc: 'Premium front row seats, complimentary drinks & fast-track entry.', icon: '👑' },
    { value: 'Standard', label: 'Standard Ticket', price: 5000, desc: 'Comfortable middle row seating with great view of the main arena.', icon: '🎟️' },
    { value: 'General', label: 'General Admission', price: 2000, desc: 'Standing admission area at the back of the exhibition hall.', icon: '🏃' }
  ];

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        const res = await fetch(`/api/events/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load event details.');
        setEvent(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEventDetails();
  }, [id]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleCheckoutRedirect = () => {
    const chosen = tiers.find(t => t.value === selectedTier);
    navigate(`/events/${id}/checkout`, { state: { tier: chosen.value, price: chosen.price } });
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <div className="w-10 h-10 border-[3px] border-indigo-500/15 border-t-indigo-500 rounded-full animate-spin" />
        <p>Loading event details...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <span className="text-5xl">⚠️</span>
        <p className="text-slate-400">{error || 'Event details not found.'}</p>
        <button onClick={() => navigate('/events')} className="bg-white/[0.03] text-slate-50 border border-white/10 px-6 py-2.5 rounded-xl font-semibold text-sm cursor-pointer hover:bg-white/[0.08] transition-colors">Go Back</button>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-10">
      {/* Top back action & badge */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/events')} 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          <ArrowLeft size={15} /> Back to Events
        </button>
        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
          ● Tickets Available
        </span>
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Banner image & description - left column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="relative rounded-3xl overflow-hidden h-[360px] border border-slate-200 dark:border-white/10 bg-slate-900 shadow-2xl group">
            <img 
              src={event.bannerImageUrl} 
              alt={event.name} 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 backdrop-blur-md mb-3 shadow-lg">
                <Sparkles size={12} className="text-amber-300" /> Featured Event
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight tracking-tight m-0 drop-shadow-md">
                {event.name}
              </h1>
            </div>
          </div>

          {/* Description card */}
          <div 
            className="p-6 rounded-3xl border shadow-xl space-y-3 transition-colors"
            style={{
              background: isDarkMode ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 20px 50px rgba(0, 0, 0, 0.4)' : '0 10px 30px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">About the Event</h3>
              <span className="text-[11px] text-slate-500 font-semibold">302CEM Exhibition</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {event.description || 'Welcome to this EventPulse live event. Explore real-time schedule sessions, interactive stalls, and reserve your tickets seamlessly using our digital wallet integration.'}
            </p>
          </div>

          {/* Date & Venue meta cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              className="p-5 rounded-2xl border shadow-md flex items-start gap-4 transition-colors"
              style={{
                background: isDarkMode ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 15, 30, 0.8) 100%)' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }}
            >
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0 text-indigo-500 dark:text-indigo-400">
                <CalendarDays size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Date & Time</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  {formatDate(event.date) || 'Saturday, July 11, 2026'}
                </p>
              </div>
            </div>

            <div 
              className="p-5 rounded-2xl border shadow-md flex items-start gap-4 transition-colors"
              style={{
                background: isDarkMode ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.65) 0%, rgba(10, 15, 30, 0.8) 100%)' : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }}
            >
              <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 text-purple-500 dark:text-purple-400">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Venue & Hall</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                  Exhibition Arena Hall A
                </p>
              </div>
            </div>
          </div>

          {/* Real-time schedule timeline */}
          <div className="pt-2">
            <EventTimeline eventId={id} />
          </div>
        </div>

        {/* Purchase Card / Tier Selector - right column (5 cols) */}
        <div className="lg:col-span-5 space-y-6 sticky top-24">
          <div 
            className="p-7 rounded-3xl border shadow-xl relative overflow-hidden transition-colors"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' 
                : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 20px 50px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Choose Your Pass</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Select an admission tier to proceed</p>
              </div>
              <span 
                className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
                style={{
                  background: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                  color: isDarkMode ? '#a5b4fc' : '#4f46e5',
                  borderColor: isDarkMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'
                }}
              >
                Direct Booking
              </span>
            </div>
            
            <div className="space-y-3 mb-6">
              {tiers.map((tier) => {
                const isSelected = selectedTier === tier.value;
                return (
                  <button
                    key={tier.value}
                    onClick={() => setSelectedTier(tier.value)}
                    className="w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer"
                    style={{
                      background: isSelected 
                        ? (isDarkMode ? 'rgba(99, 102, 241, 0.18)' : '#eef2ff') 
                        : (isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
                      borderColor: isSelected 
                        ? '#6366f1' 
                        : (isDarkMode ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0'),
                      boxShadow: isSelected ? '0 4px 14px rgba(99, 102, 241, 0.2)' : 'none'
                    }}
                  >
                    <span 
                      className="text-2xl mt-0.5 p-1.5 rounded-xl shadow-sm flex items-center justify-center"
                      style={{
                        background: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'
                      }}
                    >
                      {tier.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{tier.label}</span>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">LKR {tier.price.toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-normal">{tier.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCheckoutRedirect}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:opacity-95 active:scale-[0.98] text-white font-bold py-4 px-4 rounded-2xl transition-all duration-200 shadow-xl shadow-indigo-500/25 cursor-pointer text-sm"
            >
              Proceed to Checkout <ChevronRight size={17} />
            </button>
          </div>

          {/* Interactive Layout Map CTA */}
          <div 
            onClick={() => navigate(`/map-viewer/${id}`)}
            className="p-5 rounded-3xl border transition-all duration-300 flex items-center justify-between cursor-pointer group shadow-lg"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' 
                : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-xl">
                🗺️
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                  Explore Interactive Layout Map
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">Locate event booths, stages and vendor stalls</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
