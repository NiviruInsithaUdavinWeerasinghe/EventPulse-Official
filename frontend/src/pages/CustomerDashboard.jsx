import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
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
  Database,
  Gift,
} from 'lucide-react';


/* ─── helpers ─────────────────────────────────────────── */
function getUser() {
  try {
    const raw = JSON.parse(localStorage.getItem('user')) || {};
    const token = localStorage.getItem('token');
    const jwtPayload = token ? parseJwt(token) : {};
    return {
      id: raw.id || raw._id || jwtPayload.id,
      _id: raw._id || raw.id || jwtPayload.id,
      fullName: raw.fullName || raw.name || jwtPayload.name || 'Customer',
      email: raw.email || jwtPayload.email || '',
      role: raw.role || jwtPayload.role || 'customer'
    };
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

/* ─── Voucher QR Modal ──────────────────────────────────── */
function VoucherQrModal({ voucher, onClose }) {
  const { isDarkMode } = useTheme();
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=10&data=${encodeURIComponent(voucher.code)}`;
  const isRedeemed = voucher.status === 'Redeemed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: isDarkMode ? 'rgba(3,7,18,0.88)' : 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xs rounded-3xl p-7 text-center border bg-white dark:bg-gradient-to-br dark:from-[#100c00] dark:to-[#0a0f1e] border-slate-200 dark:border-amber-500/35 shadow-xl dark:shadow-[0_0_60px_rgba(245,158,11,0.2)]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
          <Gift size={22} className="text-amber-400" />
        </div>
        <p className="text-xs text-amber-400 uppercase tracking-widest mb-1 font-bold">Food Court Voucher</p>
        <p className="text-base font-bold text-slate-900 dark:text-white mb-0.5">
          {isRedeemed ? 'Already Redeemed' : 'Show at Food Court POS'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          {isRedeemed
            ? `Redeemed on ${new Date(voucher.redeemedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'Scan this QR code at any participating food court vendor to claim your free meal.'}
        </p>

        <div
          className="mx-auto rounded-2xl p-3 mb-5 border border-slate-200 dark:border-white/10"
          style={{ background: 'white', width: 196, height: 196, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isRedeemed ? 0.45 : 1 }}
        >
          <img src={qrUrl} alt="Voucher QR code" width={180} height={180} style={{ display: 'block' }} />
        </div>

        {!isRedeemed && (
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mb-4 tracking-widest">{voucher.code}</p>
        )}

        <div
          className="rounded-xl py-2 px-4 text-xs font-semibold"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,88,12,0.15))'
              : 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(234,88,12,0.08))',
            color: isDarkMode ? '#fbbf24' : '#b45309',
            border: isDarkMode ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(245,158,11,0.15)',
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
    if (tier === 'VIP') {
      return { 
        gradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        badgeBg: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : '#e0e7ff',
        badgeText: isDarkMode ? '#c7d2fe' : '#4338ca',
        border: isDarkMode ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)',
        glow: 'rgba(99, 102, 241, 0.25)'
      };
    }
    if (tier === 'General') {
      return { 
        gradient: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
        badgeBg: isDarkMode ? 'rgba(6, 182, 212, 0.2)' : '#cffafe',
        badgeText: isDarkMode ? '#a5f3fc' : '#0891b2',
        border: isDarkMode ? 'rgba(6, 182, 212, 0.3)' : 'rgba(6, 182, 212, 0.2)',
        glow: 'rgba(6, 182, 212, 0.25)'
      };
    }
    return { 
      gradient: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      badgeBg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
      badgeText: isDarkMode ? '#fde68a' : '#b45309',
      border: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.2)',
      glow: 'rgba(245, 158, 11, 0.25)'
    };
  };

  const theme = getThemeDetails(ticket.tier);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Saturday, Jul 11, 2026';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      onClick={onClick}
      className="relative rounded-3xl overflow-hidden flex-shrink-0 w-80 cursor-pointer transition-all duration-300 group select-none"
      style={{
        background: isDarkMode 
          ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(10, 15, 30, 0.95) 100%)' 
          : '#ffffff',
        border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
        boxShadow: isDarkMode ? '0 15px 35px -5px rgba(0, 0, 0, 0.5)' : '0 10px 25px -3px rgba(0, 0, 0, 0.06)'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.borderColor = isDarkMode ? 'rgba(99, 102, 241, 0.4)' : '#cbd5e1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0';
      }}
    >
      {/* Top accent gradient strip */}
      <div className="h-1.5 w-full" style={{ background: theme.gradient }} />

      <div className="p-6 space-y-4">
        {/* Tier badge & Live status */}
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border"
            style={{
              background: theme.badgeBg,
              color: theme.badgeText,
              borderColor: theme.border
            }}
          >
            {ticket.tier || 'Standard'} Pass
          </span>

          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Valid Entry
          </span>
        </div>

        {/* Event Name */}
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-1 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
            {ticket.event?.name || 'Live Event'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
            <CalendarDays size={13} className="text-slate-400" />
            {formatDate(ticket.event?.date)}
          </p>
        </div>

        {/* Location chip */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.03] px-3 py-2 rounded-xl border border-slate-200/60 dark:border-white/5">
          <MapPin size={13} className="text-indigo-500 flex-shrink-0" />
          <span className="truncate font-medium">Exhibition Arena Hall A</span>
        </div>

        {/* Perforated ticket notch separator */}
        <div className="relative py-1">
          <div 
            className="w-full border-t border-dashed"
            style={{ borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0' }}
          />
        </div>

        {/* Ticket Bottom: Seat & QR trigger */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Assigned Seat</p>
            <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{ticket.seat || 'General'}</p>
          </div>

          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm group-hover:scale-105"
            style={{
              background: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : '#f1f5f9',
              color: isDarkMode ? '#a5b4fc' : '#334155',
              border: isDarkMode ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid #e2e8f0'
            }}
          >
            <QrCode size={15} />
            <span>Show QR</span>
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
  const { walletBalance, setWalletBalance, activeAlert, updateBalance } = useNotification();
  const [user, setUser] = useState(getUser);
  const [showTopUp, setShowTopUp] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [notifCount] = useState(2);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null); // for ticket QR modal
  const [transactions, setTransactions] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null); // for voucher QR modal

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    // Fetch user wallet state & tickets
    if (user.id) {
      const loadDashboardData = async () => {
        try {
          // Fetch updated wallet balance using context method
          updateBalance();

          // Fetch real tickets
          const ticketsRes = await fetch(`/api/events/user/${user.id}/tickets`);
          const ticketsData = await ticketsRes.json();
          if (ticketsData.success) {
            setTickets(ticketsData.data);
          }

          // Fetch earned vouchers
          const token = localStorage.getItem('token');
          const vouchersRes = await fetch('/api/scavenger/vouchers', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (vouchersRes.ok) {
            const vouchersData = await vouchersRes.json();
            if (vouchersData.success) setVouchers(vouchersData.vouchers || []);
          }
          // Fetch initial wallet history
          const historyRes = await fetch(`/api/wallet/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.success) {
              setTransactions(historyData.transactions || []);
            }
          }
        } catch (err) {
          console.error("Dashboard fetch error:", err);
        }
      };
      loadDashboardData();
    }
  }, [user.id]);

  // Re-fetch transaction history whenever a transaction occurs (activeAlert transitions to null)
  useEffect(() => {
    if (!activeAlert && user.id) {
      const fetchHistory = async () => {
        try {
          const token = localStorage.getItem('token');
          const historyRes = await fetch(`/api/wallet/history`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            if (historyData.success) {
              setTransactions(historyData.transactions);
            }
          }
        } catch (err) {
          console.error("Error fetching transactions history:", err);
        }
      };
      fetchHistory();
    }
  }, [activeAlert, user.id]);


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

      {selectedVoucher && (
        <VoucherQrModal voucher={selectedVoucher} onClose={() => setSelectedVoucher(null)} />
      )}

      <TopUpModal 
        isOpen={showTopUp} 
        onClose={() => setShowTopUp(false)} 
        onTopUpSuccess={(newBalance) => setWalletBalance(newBalance)} 
      />

      {/* ── Main ── */}
      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* ── Header / Greeting Hero Banner ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-extrabold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Attendee Console
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {greeting}, <span className="capitalize">{user.fullName || 'Attendee'}</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl font-normal">
              Manage your verified passes, instant venue payments, and real-time activity.
            </p>
          </div>

          {/* Quick wallet balance pill button */}
          <div 
            onClick={() => setShowTopUp(true)}
            className="flex items-center gap-4 p-3.5 pr-5 rounded-2xl border cursor-pointer transition-all shadow-md group select-none shrink-0"
            style={{
              background: isDarkMode ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 15, 30, 0.85) 100%)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }}
          >
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Digital Balance</p>
              <p className="text-base font-black text-slate-900 dark:text-white">
                LKR {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats Metric Cards (Grid of 3) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 animate-slide-up">
          {[
            {
              id: 'stat-tickets',
              icon: Ticket,
              label: 'Active Passes',
              value: tickets.length,
              subtext: 'Ready for scanning',
              color: '#6366f1',
              bgLight: '#eef2ff',
              bgDark: 'rgba(99, 102, 241, 0.15)',
            },
            {
              id: 'stat-wallet',
              icon: Wallet,
              label: 'Digital Wallet',
              value: `LKR ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
              subtext: 'Cashless balance',
              color: '#a855f7',
              bgLight: '#faf5ff',
              bgDark: 'rgba(168, 85, 247, 0.15)',
            },
            {
              id: 'stat-upcoming',
              icon: CalendarDays,
              label: 'Booked Sessions',
              value: tickets.length > 0 ? 1 : 0,
              subtext: 'Upcoming event this month',
              color: '#06b6d4',
              bgLight: '#ecfeff',
              bgDark: 'rgba(6, 182, 212, 0.15)',
            },
          ].map(stat => (
            <div
              key={stat.id}
              id={stat.id}
              className="rounded-3xl p-6 flex items-center gap-5 border transition-all duration-300 shadow-sm hover:shadow-md"
              style={{
                background: isDarkMode 
                  ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' 
                  : '#ffffff',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              }}
            >
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: isDarkMode ? stat.bgDark : stat.bgLight,
                  color: stat.color
                }}
              >
                <stat.icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">{stat.label}</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white truncate">
                  {stat.value}
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{stat.subtext}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Workspace Row: Tickets & Live Digital Wallet ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Tickets panel ── takes 7 cols */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Active Passes & Tickets</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Click any ticket to display its entry QR code</p>
              </div>
              <button
                id="view-all-tickets"
                onClick={() => navigate('/events')}
                className="text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-none font-bold"
              >
                Browse events <ChevronRight size={13} />
              </button>
            </div>

            {/* Horizontal scroll of ticket cards with hidden scrollbar */}
            <div className="flex gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar">
              {tickets.length > 0 ? (
                tickets.map(t => (
                  <TicketCard
                    key={t._id}
                    ticket={t}
                    onClick={() => setSelectedTicket(t)}
                  />
                ))
              ) : (
                <div 
                  className="w-full py-12 px-6 text-center rounded-3xl border text-slate-500 text-sm"
                  style={{
                    background: isDarkMode ? 'rgba(255, 255, 255, 0.01)' : '#f8fafc',
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
                  }}
                >
                  <Ticket size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No tickets purchased yet</p>
                  <p className="text-xs text-slate-400 mt-1">Book tickets from any event page to activate access.</p>
                </div>
              )}
            </div>
          </div>

          {/* Wallet panel ── takes 5 cols */}
          <div
            id="wallet-panel"
            className="lg:col-span-5 rounded-3xl p-7 flex flex-col justify-between border shadow-xl relative overflow-hidden transition-colors"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(10, 15, 30, 0.98) 100%)' 
                : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 20px 50px rgba(0, 0, 0, 0.5)' : '0 10px 30px rgba(0, 0, 0, 0.05)',
              minHeight: 280,
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Wallet size={16} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Event Digital Wallet</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Cashless POS Token</p>
                  </div>
                </div>
                <span
                  className="text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border"
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    borderColor: 'rgba(16, 185, 129, 0.25)',
                  }}
                >
                  Active & Live
                </span>
              </div>

              <div 
                className="p-5 rounded-2xl border mb-6"
                style={{
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
                }}
              >
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  Available Spending Balance
                </p>
                <div className="flex items-baseline justify-between">
                  <p className="text-3xl font-black text-slate-900 dark:text-white">
                    LKR {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    ≈ USD {(walletBalance / 300).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                id="quick-pay-qr-btn"
                onClick={() => navigate('/customer/wallet/pay')}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm text-white transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-500/25"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)',
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <QrCode size={17} />
                Generate Quick Pay QR
              </button>

              <button
                id="top-up-btn"
                onClick={() => setShowTopUp(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-xs border transition-all cursor-pointer"
                style={{
                  background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f1f5f9',
                  borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  color: isDarkMode ? '#cbd5e1' : '#334155'
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                + Top Up Wallet Balance
              </button>
            </div>
          </div>
        </div>

        {/* ── Interactive Venue Exploration / Scavenger Hunt ── */}
        <div
          id="scavenger-hunt-cta"
          className="rounded-3xl overflow-hidden relative cursor-pointer group border transition-all duration-300 shadow-sm hover:shadow-lg"
          style={{
            background: isDarkMode 
              ? 'linear-gradient(135deg, rgba(30, 27, 75, 0.35) 0%, rgba(15, 23, 42, 0.85) 100%)' 
              : '#ffffff',
            borderColor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : '#e2e8f0'
          }}
          onClick={() => navigate('/customer/scavenger-hunt')}
        >
          <div className="relative z-10 p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Interactive Venue Experience
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-1">
                Venue Discovery & Scavenger Quest
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Scan authenticated checkpoint QR checkpoints across hall zones to unlock food court perks and partner incentives.
              </p>
            </div>

            <div
              className="flex-shrink-0 px-5 py-3 rounded-2xl flex items-center gap-2 font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md shadow-indigo-600/20"
            >
              <QrCode size={16} />
              Launch Scanner
            </div>
          </div>
        </div>

        {/* ── My Rewards (Vouchers) ── */}
        {vouchers.length > 0 && (
          <div id="my-rewards-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-amber-500" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white">Earned Rewards & Vouchers</h2>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {vouchers.filter(v => v.status === 'Active').length} Available
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {vouchers.map(v => {
                const isRedeemed = v.status === 'Redeemed';
                return (
                  <div
                    key={v._id}
                    onClick={() => setSelectedVoucher(v)}
                    className="relative rounded-3xl overflow-hidden flex-shrink-0 w-64 cursor-pointer transition-all duration-300 border shadow-md select-none"
                    style={{
                      background: isDarkMode 
                        ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' 
                        : '#ffffff',
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                      opacity: isRedeemed ? 0.5 : 1
                    }}
                    onMouseEnter={e => { if (!isRedeemed) e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md ${
                          isRedeemed
                            ? 'bg-slate-200/50 dark:bg-white/5 text-slate-500'
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-500 dark:text-amber-300'
                        }`}>
                          {isRedeemed ? 'Redeemed' : 'Active'}
                        </span>
                        <Gift size={14} className={isRedeemed ? 'text-slate-400' : 'text-amber-400'} />
                      </div>

                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-tight">Food Court Voucher</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {isRedeemed ? 'Voucher claimed at vendor POS' : 'Complimentary meal at event food stalls'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-dashed border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-500">Free Item</span>
                        <span className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400">View QR →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recent Activity Feed (Clean Financial Statement Style) ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Recent Wallet Activity</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Live Audit Trail</span>
          </div>

          <div
            className="rounded-3xl border overflow-hidden shadow-sm transition-colors"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' 
                : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
            }}
          >
            {transactions.length > 0 ? (
              transactions.map((item, idx) => {
                const isCredit = item.transactionType === 'Credit';
                const formattedTime = new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div
                    key={item.id || idx}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-white/[0.01]"
                    style={{
                      borderTop: idx === 0 ? 'none' : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.04)' : '1px solid #f1f5f9'),
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isCredit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        color: isCredit ? '#10b981' : '#6366f1'
                      }}
                    >
                      <Wallet size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
                        {item.description}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                        {item.referenceType} • <span className={isCredit ? 'text-emerald-500 font-semibold' : 'text-slate-400'}>{item.transactionType}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-black ${isCredit ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                        {isCredit ? '+' : '-'} LKR {item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">{formattedTime}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-sm">
                No transaction logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
