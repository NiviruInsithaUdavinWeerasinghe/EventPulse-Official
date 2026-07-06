import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CalendarDays, MapPin, Sparkles, ChevronRight, ArrowLeft } from 'lucide-react';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
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
    <div className="max-w-[1000px] mx-auto px-6 py-12">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/events')} 
        className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors mb-8 bg-transparent border-none cursor-pointer p-0 font-[inherit]"
      >
        <ArrowLeft size={16} /> Back to Events
      </button>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Banner image & description - left column */}
        <div className="lg:col-span-3 space-y-6">
          <div className="relative rounded-2xl overflow-hidden h-[340px] border border-white/5 bg-[#0b0f19]">
            <img src={event.bannerImageUrl} alt={event.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#030712] via-[#030712]/40 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 mb-3">
                <Sparkles size={12} /> Featured Event
              </span>
              <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight m-0">{event.name}</h1>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider text-xs text-indigo-400">About Event</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{event.description || 'No description provided for this event.'}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 text-slate-400">
                <CalendarDays size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Date & Time</p>
                <p className="text-sm font-semibold text-white mt-0.5">{formatDate(event.date) || 'Date details pending'}</p>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] flex items-center justify-center flex-shrink-0 text-slate-400">
                <MapPin size={18} />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Venue</p>
                <p className="text-sm font-semibold text-white mt-0.5">Exhibition Arena Hall A</p>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Card / Tier Selector - right column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4">Select Tickets</h3>
            
            <div className="space-y-3 mb-6">
              {tiers.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => setSelectedTier(tier.value)}
                  className={`w-full flex items-start gap-3.5 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer
                    ${selectedTier === tier.value
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5'
                      : 'border-white/5 hover:border-white/10 bg-white/[0.01]'
                    }`}
                >
                  <span className="text-2xl mt-0.5">{tier.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-white">{tier.label}</span>
                      <span className="text-xs font-semibold text-indigo-400">LKR {tier.price.toLocaleString()}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal">{tier.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleCheckoutRedirect}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/10 cursor-pointer text-sm"
            >
              Proceed to Checkout <ChevronRight size={16} />
            </button>
          </div>

          {/* Interactive Layout Map CTA */}
          <div 
            onClick={() => navigate(`/map-viewer/${id}`)}
            className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] hover:border-indigo-500/20 transition-all duration-300 flex items-center justify-between cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🗺️</span>
              <div>
                <p className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">Explore Interactive Layout Map</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Configure and locate vendor stalls</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
}
