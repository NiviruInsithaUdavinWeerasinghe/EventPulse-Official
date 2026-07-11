import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
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
  AlertTriangle,
  CheckCircle,
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
  const { isDarkMode } = useTheme();
  // Encode the raw qrCodeData into a real scannable QR image (no library needed)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(ticket.qrCodeData)}`;

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: isDarkMode ? 'rgba(3,7,18,0.88)' : 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs rounded-3xl p-7 text-center border bg-white dark:bg-gradient-to-br dark:from-[#0f1629] dark:to-[#0a0f1e] border-slate-200 dark:border-indigo-500/35 shadow-xl dark:shadow-[0_0_60px_rgba(99,102,241,0.25)]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Ticket meta */}
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 font-semibold">Entry Ticket</p>
        <p className="text-base font-bold text-slate-900 dark:text-white mb-0.5 line-clamp-2">
          {ticket.event?.name || 'Event'}
        </p>
        <div className="flex items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-5">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} className="text-slate-400 dark:text-slate-505" /> {formatDate(ticket.event?.date)}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 font-semibold text-slate-600 dark:text-slate-300">
            {ticket.tier}
          </span>
          <span>Seat {ticket.seat}</span>
        </div>

        {/* Real QR code generated from ticket.qrCodeData */}
        <div
          className="mx-auto rounded-2xl p-3 mb-5 border border-slate-200 dark:border-white/10"
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

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Show this QR at the event entry gate
        </p>

        <div
          className="rounded-xl py-2 px-4 text-xs font-semibold"
          style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))'
              : 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.1))',
            color: isDarkMode ? '#a5b4fc' : '#4f46e5',
            border: isDarkMode ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(99,102,241,0.15)',
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
  const { isDarkMode } = useTheme();
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
      className="relative rounded-2xl overflow-hidden flex-shrink-0 w-72 cursor-pointer transition-all duration-300 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06]"
      style={{
        boxShadow: `0 10px 30px -10px ${theme.glow}`,
      }}
      onClick={onClick}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      }}
    >
      {/* colour bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${theme.color}`} />

      <div className="p-5">
        {/* tier badge */}
        <span
          className="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md mb-3 bg-slate-200/50 dark:bg-white/5 border border-slate-300/30 dark:border-white/5 text-slate-700 dark:text-slate-300"
        >
          {ticket.tier}
        </span>

        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight mb-3 line-clamp-2">
          {ticket.event?.name || 'Event Title'}
        </h3>

        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <CalendarDays size={12} className="text-slate-400 dark:text-slate-500" />
            {formatDate(ticket.event?.date)}
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={12} className="text-slate-400 dark:text-slate-500" />
            Exhibition Arena Hall A
          </div>
        </div>

        {/* divider dashed */}
        <div
          className="my-4"
          style={{
            borderTop: isDarkMode ? '1px dashed rgba(255,255,255,0.08)' : '1px dashed rgba(0,0,0,0.08)',
          }}
        />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Seat</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{ticket.seat}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-200/40 dark:bg-white/[0.03]">
            <QrCode size={18} className="text-slate-500 dark:text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Top Up Modal ───────────────────────────────────────── */
function TopUpModal({ isOpen, onClose, onTopUpSuccess }) {
  const { isDarkMode } = useTheme();
  const [amount, setAmount] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const quickAmounts = [1000, 2000, 5000, 10000];

  const handleTopUp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount.');
      setLoading(false);
      return;
    }

    if (!cardNumber || !expiry || !cvc) {
      setError('Please fill in all card details.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: numAmount,
          paymentToken: `mock_token_${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Top-up failed.');
      }

      setSuccess(true);
      setTimeout(() => {
        onTopUpSuccess(parseFloat(data.wallet.balance));
        onClose();
        setSuccess(false);
        setAmount('');
        setCardNumber('');
        setExpiry('');
        setCvc('');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: isDarkMode ? 'rgba(3,7,18,0.85)' : 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl p-7 text-left border bg-white dark:bg-gradient-to-br dark:from-[#0f1629] dark:to-[#0a0f1e] border-slate-200 dark:border-purple-500/35 shadow-xl dark:shadow-[0_0_60px_rgba(168,85,247,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Top Up Wallet</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Add digital funds to your cashless event profile securely.</p>
        </div>

        {success ? (
          <div className="text-center py-8 space-y-3">
            <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto text-green-550 dark:text-green-400 font-bold text-xl">
              ✓
            </div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Top-up Successful!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Your wallet balance has been updated.</p>
          </div>
        ) : (
          <form onSubmit={handleTopUp} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Quick amount selectors */}
            <div>
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2 font-semibold">Quick Add</label>
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`py-2 px-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      amount === val.toString()
                        ? 'bg-purple-600/20 border-purple-500 text-purple-600 dark:text-purple-300'
                        : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    +{val}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div>
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 font-semibold">Custom Amount (LKR)</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>

            {/* Credit Card Fields */}
            <div className="space-y-3">
              <label className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-semibold">Card Details</label>
              <div>
                <input
                  type="text"
                  placeholder="Card Number"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                  maxLength={16}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                  maxLength={5}
                  required
                />
                <input
                  type="password"
                  placeholder="CVC"
                  value={cvc}
                  onChange={e => setCvc(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-purple-500 transition-colors"
                  maxLength={3}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 rounded-xl font-bold text-sm text-white transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg,#a855f7,#7c3aed)',
              }}
            >
              {loading ? 'Processing...' : 'Pay & Top Up'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─── Main Dashboard ────────────────────────────────────── */
export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [user, setUser] = useState(getUser);
  const [showTopUp, setShowTopUp] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [greeting, setGreeting] = useState('');
  const [notifCount] = useState(2);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null); // for ticket QR modal
  const [activeAlert, setActiveAlert] = useState(null); // { type, message, amount, vendorName }


  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Fetch user wallet state & tickets
    if (user.id) {
      const loadDashboardData = async () => {
        try {
          // Fetch updated wallet balance using init endpoint
          const token = localStorage.getItem('token');
          const userRes = await fetch(`/api/wallet/init`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          if (userRes.ok) {
            const userData = await userRes.json();
            setWalletBalance(parseFloat(userData.wallet.balance) || 0);
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !user.id) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:5000/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'TX_REJECTED') {
          setActiveAlert({
            type: 'TX_REJECTED',
            message: data.message || 'Insufficient Wallet Balance',
            amount: data.amount,
            timestamp: data.timestamp,
          });
        } else if (data.type === 'TX_SUCCESS') {
          setActiveAlert({
            type: 'TX_SUCCESS',
            message: 'Payment Successful',
            amount: data.amount,
            vendorName: data.vendorName || 'Stall Vendor',
            timestamp: data.timestamp,
          });
          if (data.remainingBalance !== undefined) {
            setWalletBalance(data.remainingBalance);
          }
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [user.id]);


  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const firstName = (user.fullName || 'there').split(' ')[0];
  const bgStyle = isDarkMode
    ? 'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.08) 0%, transparent 55%), radial-gradient(ellipse at 0% 80%, rgba(168,85,247,0.05) 0%, transparent 50%), #030712'
    : 'radial-gradient(ellipse at 60% 0%, rgba(99,102,241,0.04) 0%, transparent 55%), radial-gradient(ellipse at 0% 80%, rgba(168,85,247,0.02) 0%, transparent 50%), #f8fafc';

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-white"
      style={{
        background: bgStyle,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {selectedTicket && (
        <TicketQrModal ticket={selectedTicket} onClose={() => setSelectedTicket(null)} />
      )}

      {activeAlert && (
        <div
          className="fixed inset-0 z-55 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(12px)', background: 'rgba(3,7,18,0.85)' }}
          onClick={() => setActiveAlert(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl p-7 text-center border bg-white dark:bg-gradient-to-br dark:from-[#0f1629] dark:to-[#0a0f1e] border-slate-200 dark:border-red-500/35 shadow-xl shadow-red-500/10 text-slate-800 dark:text-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveAlert(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {activeAlert.type === 'TX_REJECTED' ? (
              <>
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/25 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <AlertTriangle className="w-10 h-10 text-red-500" />
                </div>
                <h2 className="text-xl font-extrabold text-red-555 dark:text-red-400 mb-2">Insufficient Balance</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                  A checkout request for <span className="font-bold text-slate-800 dark:text-slate-150">LKR {activeAlert.amount.toFixed(2)}</span> was declined due to insufficient funds in your wallet.
                </p>
                <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 text-left text-xs mb-8 text-red-600 dark:text-red-300/80 leading-relaxed">
                  <span className="font-bold">Suggested action:</span> Please tap the <strong>+ Top Up Wallet</strong> button on your dashboard to add more funds before retrying the checkout.
                </div>
                <button
                  onClick={() => { setActiveAlert(null); setShowTopUp(true); }}
                  className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-red-500/20"
                >
                  Top Up Now
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 mb-1">Payment Successful</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Processed at {activeAlert.vendorName}</p>
                <p className="text-3xl font-extrabold text-slate-800 dark:text-slate-55 mb-6">
                  LKR {activeAlert.amount.toFixed(2)}
                </p>
                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 text-left text-xs mb-8 space-y-2 text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between">
                    <span>Paid To:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeAlert.vendorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Remaining Balance:</span>
                    <span className="text-slate-850 dark:text-slate-200 font-bold">LKR {walletBalance.toLocaleString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAlert(null)}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Close Receipt
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <TopUpModal 
        isOpen={showTopUp} 
        onClose={() => setShowTopUp(false)} 
        onTopUpSuccess={(newBalance) => setWalletBalance(newBalance)} 
      />



      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Greeting */}
        <div className="animate-slide-up">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">{greeting},</p>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {user.fullName || 'Welcome back'} 👋
          </h1>
          <p className="text-slate-550 dark:text-slate-500 text-sm mt-1">Here's what's happening with your events.</p>
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
              className="rounded-2xl p-5 flex items-center gap-4 border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-200/50 dark:bg-white/[0.03]"
              >
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">
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
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Tickets</h2>
              <button
                id="view-all-tickets"
                className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-650 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none font-semibold"
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
            className="rounded-2xl p-6 flex flex-col justify-between border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.002]"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(255,255,255,0.01) 0%, rgba(255,255,255,0.002) 100%)'
                : 'linear-gradient(145deg, rgba(0,0,0,0.01) 0%, rgba(0,0,0,0.002) 100%)',
              minHeight: 260,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Wallet size={16} className="text-purple-500 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Digital Wallet</span>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{
                    background: 'rgba(168,85,247,0.1)',
                    color: isDarkMode ? '#c084fc' : '#7e22ce',
                    border: '1px solid rgba(168,85,247,0.15)',
                  }}
                >
                  Live
                </span>
              </div>

              <p className="text-xs text-slate-550 dark:text-slate-500 mb-1">Available Balance</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mb-0.5">
                LKR {walletBalance.toLocaleString()}
              </p>
              <p className="text-xs text-slate-550 dark:text-slate-500">≈ USD {(walletBalance / 300).toFixed(2)}</p>
            </div>

            <div className="space-y-2 mt-6">
              <button
                id="quick-pay-qr-btn"
                onClick={() => navigate('/customer/wallet/pay')}
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
                onClick={() => setShowTopUp(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm bg-slate-200/50 dark:bg-white/[0.02] border border-slate-300/30 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-300/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
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
          className="rounded-2xl overflow-hidden relative cursor-pointer group border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01] hover:border-indigo-500/20 transition-all duration-300"
          onClick={() => navigate('/events')}
        >
          <div className="relative z-10 p-7 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={16} className="text-indigo-500 dark:text-indigo-400" />
                <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">
                  Discover
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">
                Browse Upcoming Events
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Find concerts, expos, and food fests near you
              </p>
            </div>

            <div
              className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ml-4 transition-all duration-200 group-hover:-translate-y-1 bg-slate-200/40 dark:bg-white/[0.02] border border-slate-300/30 dark:border-white/5"
            >
              <ChevronRight size={22} className="text-indigo-500 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Recent Activity</h2>
          <div
            className="rounded-2xl divide-y border border-slate-200 dark:border-white/[0.04] bg-slate-50 dark:bg-white/[0.01]"
            style={{
              divideColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
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
                  borderColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                  borderTopWidth: idx === 0 ? 0 : 1,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-200/50 dark:bg-white/[0.03]"
                >
                  <item.icon size={14} style={{ color: item.color }} />
                </div>
                <p className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item.label}</p>
                <span className="text-xs text-slate-500 dark:text-slate-600 flex-shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
