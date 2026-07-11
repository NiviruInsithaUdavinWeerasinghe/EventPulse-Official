import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Wallet,
  QrCode,
  CalendarDays,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Sparkles,
  MapPin,
  Clock,
  X,
} from 'lucide-react';

/* ─── helpers ─────────────────────────────────────────── */
function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return {};
  }
}

/* ─── mock data (replaced by API calls once endpoints exist) ─ */
const MOCK_TICKETS = [
  {
    id: 't1',
    event: 'Neon Nights Music Festival',
    date: 'Jul 12, 2025',
    time: '7:00 PM',
    venue: 'Colombo Exhibition Centre',
    tier: 'VIP',
    seat: 'A-14',
    color: 'from-indigo-500 to-purple-600',
    accentLight: 'rgba(99,102,241,0.15)',
  },
  {
    id: 't2',
    event: 'Tech Summit 2025',
    date: 'Aug 3, 2025',
    time: '9:00 AM',
    venue: 'BMICH, Colombo',
    tier: 'General',
    seat: 'G-88',
    color: 'from-cyan-500 to-blue-600',
    accentLight: 'rgba(6,182,212,0.15)',
  },
  {
    id: 't3',
    event: 'Sri Lanka Food Expo',
    date: 'Aug 18, 2025',
    time: '11:00 AM',
    venue: 'SLECC, Colombo',
    tier: 'Standard',
    seat: 'S-211',
    color: 'from-amber-500 to-orange-500',
    accentLight: 'rgba(245,158,11,0.15)',
  },
];

/* ─── Ticket QR Modal ───────────────────────────────────── */
function TicketQrModal({ ticket, onClose }) {
  // Encode the raw qrCodeData into a real scannable QR image (no library needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(ticket.qrCodeData)}`;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(3,7,18,0.88)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs rounded-3xl p-7 text-center"
        style={{
          background: 'linear-gradient(145deg, #0f1629 0%, #0a0f1e 100%)',
          border: '1px solid rgba(99,102,241,0.35)',
          boxShadow: '0 0 60px rgba(99,102,241,0.25)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Ticket meta */}
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Entry Ticket</p>
        <p className="text-base font-bold text-white mb-0.5 line-clamp-2">
          {ticket.event?.name || 'Event'}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 mb-5">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} /> {formatDate(ticket.event?.date)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5 font-semibold text-slate-300">
            {ticket.tier}
          </span>
          <span>Seat {ticket.seat}</span>
        </div>

        {/* Real QR code generated from ticket.qrCodeData */}
        <div
          className="mx-auto rounded-2xl p-3 mb-5"
          style={{
            background: 'white',
            width: 196,
            height: 196,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src={qrUrl}
            alt="Ticket QR code"
            width={180}
            height={180}
            style={{ display: 'block' }}
          />
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Show this QR at the event entry gate
        </p>

        <div
          className="rounded-xl py-2 px-4 text-xs font-semibold"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
            color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.25)',
          }}
        >
          Tap anywhere to close
        </div>
      </div>
    </div>
  );
}

/* ─── Ticket Card ───────────────────────────────────────── */
function TicketCard({ ticket, onClick }) {
  const getThemeDetails = (tier) => {
    if (tier === 'VIP') return { color: 'from-indigo-500 to-purple-600', glow: 'rgba(99,102,241,0.15)' };
    if (tier === 'General') return { color: 'from-cyan-500 to-blue-600', glow: 'rgba(6,182,212,0.15)' };
    return { color: 'from-amber-500 to-orange-500', glow: 'rgba(245,158,11,0.15)' };
  };

  const theme = getThemeDetails(ticket.tier);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex-shrink-0 w-72 cursor-pointer transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: `0 10px 30px -10px ${theme.glow}`,
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      {/* colour bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${theme.color}`} />

      <div className="p-5">
        {/* tier badge */}
        <span
          className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-3 bg-white/5 border border-white/5 text-slate-300`}
        >
          {ticket.tier}
        </span>

        <h3 className="text-base font-bold text-white leading-tight mb-3 line-clamp-2">
          {ticket.event?.name || 'Event Title'}
        </h3>

        <div className="space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CalendarDays size={12} className="text-slate-500" />
            {formatDate(ticket.event?.date)}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-slate-500" />
            Exhibition Arena Hall A
          </div>
        </div>

        {/* divider dashed */}
        <div
          className="my-4"
          style={{
            borderTop: '1px dashed rgba(255,255,255,0.08)',
          }}
        />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Seat</p>
            <p className="text-sm font-bold text-white">{ticket.seat}</p>
          </div>
          <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <QrCode size={18} className="text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────── */
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(getUser);
  const [showQr, setShowQr] = useState(false);
  const [walletBalance, setWalletBalance] = useState(24750);
  const [greeting, setGreeting] = useState('');
  const [notifCount] = useState(2);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null); // for ticket QR modal

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Fetch user wallet state & tickets
    if (user.id) {
      const loadDashboardData = async () => {
        try {
          // Fetch updated wallet balance
          const userRes = await fetch(`/api/auth/google-set-role`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, role: 'customer' })
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setWalletBalance(userData.user.walletBalance ?? 24750);
          }

          // Fetch real tickets
          const ticketsRes = await fetch(`/api/events/user/${user.id}/tickets`);
          const ticketsData = await ticketsRes.json();
          if (ticketsData.success) {
            setTickets(ticketsData.data);
          }
        } catch (err) {
          console.error("Dashboard fetch error:", err);
        }
      };
      loadDashboardData();
    }
  }, [user.id]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const firstName = (user.fullName || 'there').split(' ')[0];

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.08) 0%, transparent 55%), radial-gradient(ellipse at 0% 80%, rgba(168,85,247,0.05) 0%, transparent 50%), #030712',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {selectedTicket && (
        <TicketQrModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {/* ── Top Nav ── */}
      <header
        className="sticky top-0 z-45"
        style={{
          background: 'rgba(3,7,18,0.7)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
            >
              <Sparkles size={15} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">EventPulse</span>
          </div>

          {/* Search bar */}
          <div
            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-slate-500 cursor-text flex-1 max-w-xs mx-8"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
            onClick={() => navigate('/events')}
          >
            <Search size={14} />
            <span>Search events…</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <button
              id="notif-btn"
              className="relative p-2 rounded-xl transition-colors hover:bg-white/5"
            >
              <Bell size={18} className="text-slate-400" />
              {notifCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
                >
                  {notifCount}
                </span>
              )}
            </button>

            {/* Avatar */}
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}
              >
                {firstName[0]?.toUpperCase()}
              </div>
              <span className="hidden sm:block text-sm font-medium text-slate-300">
                {firstName}
              </span>
            </div>

            <button
              id="logout-btn"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Greeting */}
        <div className="animate-slide-up">
          <p className="text-slate-400 text-sm mb-1">{greeting},</p>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {user.fullName || 'Welcome back'} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">Here's what's happening with your events.</p>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
          {[
            {
              id: 'stat-tickets',
              icon: Ticket,
              label: 'Active Tickets',
              value: tickets.length,
              suffix: '',
              color: '#6366f1',
            },
            {
              id: 'stat-wallet',
              icon: Wallet,
              label: 'Wallet Balance',
              value: `LKR ${walletBalance.toLocaleString()}`,
              suffix: '',
              color: '#a855f7',
            },
            {
              id: 'stat-upcoming',
              icon: CalendarDays,
              label: 'Upcoming Events',
              value: tickets.length > 0 ? 1 : 0,
              suffix: ' this month',
              color: '#06b6d4',
            },
          ].map(stat => (
            <div
              key={stat.id}
              id={stat.id}
              className="rounded-2xl p-5 flex items-center gap-4 border border-white/[0.04] bg-white/[0.01]"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255, 255, 255, 0.03)' }}
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{stat.label}</p>
                <p className="text-xl font-bold text-white">
                  {stat.value}
                  <span className="text-xs font-normal text-slate-500">{stat.suffix}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tickets + Wallet Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Tickets panel ── takes 2/3 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">My Tickets</h2>
              <button
                id="view-all-tickets"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none font-semibold"
              >
                View all <ChevronRight size={13} />
              </button>
            </div>

            {/* Horizontal scroll of ticket cards */}
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
              {tickets.length > 0 ? (
                tickets.map(t => (
                  <TicketCard
                    key={t._id}
                    ticket={t}
                    onClick={() => setSelectedTicket(t)}
                  />
                ))
              ) : (
                <div className="text-slate-500 py-6 text-sm">No tickets purchased yet.</div>
              )}
            </div>
          </div>

          {/* Wallet panel ── takes 1/3 */}
          <div
            id="wallet-panel"
            className="rounded-2xl p-6 flex flex-col justify-between border border-white/[0.04]"
            style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.002) 100%)',
              minHeight: 260,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-purple-400" />
                  <span className="text-sm font-semibold text-slate-300">Digital Wallet</span>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(168,85,247,0.1)',
                    color: '#c084fc',
                    border: '1px solid rgba(168,85,247,0.15)',
                  }}
                >
                  Live
                </span>
              </div>

              <p className="text-xs text-slate-500 mb-1">Available Balance</p>
              <p className="text-3xl font-extrabold text-white mb-0.5">
                LKR {walletBalance.toLocaleString()}
              </p>
              <p className="text-xs text-slate-500">≈ USD {(walletBalance / 300).toFixed(2)}</p>
            </div>

            <div className="space-y-2 mt-6">
              <button
                id="quick-pay-qr-btn"
                onClick={() => setShowQr(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-500/10"
                style={{
                  background: 'linear-gradient(135deg,#6366f1,#7c3aed)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <QrCode size={16} />
                Quick Pay QR
              </button>

              <button
                id="top-up-btn"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm text-slate-300 hover:text-white transition-colors cursor-pointer bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                + Top Up Wallet
              </button>
            </div>
          </div>
        </div>

        {/* ── Browse Events CTA ── */}
        <div
          id="browse-events-cta"
          className="rounded-2xl overflow-hidden relative cursor-pointer group border border-white/[0.04] bg-white/[0.01] hover:border-indigo-500/20 transition-all duration-300"
          onClick={() => navigate('/events')}
        >
          <div className="relative z-10 p-7 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">
                  Discover
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white mb-1">
                Browse Upcoming Events
              </h2>
              <p className="text-sm text-slate-400">
                Find concerts, expos, and food fests near you
              </p>
            </div>

            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ml-4 transition-all duration-200 group-hover:-translate-y-1 bg-white/[0.02] border border-white/5"
            >
              <ChevronRight size={22} className="text-indigo-400" />
            </div>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Recent Activity</h2>
          <div
            className="rounded-2xl divide-y border border-white/[0.04] bg-white/[0.01]"
            style={{
              divideColor: 'rgba(255,255,255,0.05)',
            }}
          >
            {[
              {
                id: 'act-1',
                icon: Ticket,
                label: 'Ticket purchased — Neon Nights Music Festival',
                time: '2 days ago',
                color: '#6366f1',
              },
              {
                id: 'act-2',
                icon: Wallet,
                label: 'Wallet top-up — LKR 5,000',
                time: '3 days ago',
                color: '#a855f7',
              },
              {
                id: 'act-3',
                icon: Clock,
                label: 'Checked in — Tech Summit 2025',
                time: '1 week ago',
                color: '#06b6d4',
              },
            ].map((item, idx) => (
              <div
                key={item.id}
                id={item.id}
                className="flex items-center gap-4 px-5 py-4"
                style={{
                  borderColor: 'rgba(255,255,255,0.04)',
                  borderTopWidth: idx === 0 ? 0 : 1,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255, 255, 255, 0.03)' }}
                >
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                <p className="flex-1 text-sm text-slate-300">{item.label}</p>
                <span className="text-xs text-slate-600 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
