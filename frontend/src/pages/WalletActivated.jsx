import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Wallet,
  CheckCircle2,
  QrCode,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';

/* ── Role guard helper (mirrors AppRouter logic) ───────────────────────────── */
function getCustomerRole() {
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

/* ── Animated badge ─────────────────────────────────────────────────────────── */
function ActiveBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest"
      style={{
        background: 'rgba(16,185,129,0.12)',
        color: '#34d399',
        border: '1px solid rgba(16,185,129,0.25)',
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-emerald-400"
        style={{ animation: 'pulse 1.8s ease-in-out infinite' }}
      />
      Active
    </span>
  );
}

/* ── Copy-to-clipboard button ───────────────────────────────────────────────── */
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy wallet ID"
      className="p-1.5 rounded-lg transition-colors"
      style={{ background: 'rgba(255,255,255,0.04)', color: copied ? '#34d399' : '#64748b' }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/* ── Main screen ────────────────────────────────────────────────────────────── */
export default function WalletActivated() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Role guard: only customers may view this screen ──────────────────────
  useEffect(() => {
    const role = getCustomerRole();
    if (!role) {
      navigate('/login', { replace: true });
    } else if (role !== 'customer') {
      // Redirect non-customers to their own home
      if (role === 'organizer') navigate('/organizer/dashboard', { replace: true });
      else if (role === 'vendor') navigate('/vendor/portal', { replace: true });
      else navigate('/', { replace: true });
    }
  }, [navigate]);

  // Wallet data is passed via router state from the QR scan handler caller
  const wallet = location.state?.wallet ?? null;
  const ticket = location.state?.ticket ?? null;

  // Fallback if navigated to directly without state
  const walletId = wallet?.walletId ?? '—';
  const accountId = wallet?.accountId ?? '—';
  const balance = wallet?.balance ?? '0.00';
  const currency = wallet?.currency ?? 'LKR';
  const status = wallet?.status ?? 'Active';

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.10) 0%, transparent 55%),' +
          'radial-gradient(ellipse at 80% 80%, rgba(99,102,241,0.07) 0%, transparent 50%), #030712',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 relative overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d1526 0%, #080e1c 100%)',
          border: '1px solid rgba(16,185,129,0.20)',
          boxShadow: '0 0 80px -10px rgba(16,185,129,0.15), 0 40px 60px -20px rgba(0,0,0,0.6)',
        }}
      >
        {/* Glow ring */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, transparent 70%)',
          }}
        />

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
            >
              <Sparkles size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">EventPulse</span>
          </div>
          <ActiveBadge />
        </div>

        {/* ── Success icon ── */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.18) 0%, rgba(16,185,129,0.04) 70%)',
              border: '1px solid rgba(16,185,129,0.25)',
            }}
          >
            <CheckCircle2 size={40} className="text-emerald-400" strokeWidth={1.5} />
          </div>

          <h1 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
            Wallet Activated!
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            Your secure digital wallet profile is now live and ready to use at EventPulse venues.
          </p>
        </div>

        {/* ── Wallet card ── */}
        <div
          className="rounded-2xl p-5 mb-6 relative overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.05) 100%)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          {/* Decorative stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: 'linear-gradient(90deg, #6366f1, #a855f7, #06b6d4)' }}
          />

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet size={15} className="text-purple-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-widest">
                Digital Wallet
              </span>
            </div>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>

          {/* Balance */}
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              Available Balance
            </p>
            <p className="text-3xl font-extrabold text-white">
              {currency} {parseFloat(balance).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* IDs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Wallet ID</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300 font-mono truncate max-w-[160px]">
                  {walletId !== '—' ? `${walletId.toString().slice(0, 12)}…` : '—'}
                </span>
                {walletId !== '—' && <CopyButton text={walletId.toString()} />}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Account ID</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300 font-mono truncate max-w-[160px]">
                  {accountId !== '—' ? `${accountId.slice(0, 12)}…` : '—'}
                </span>
                {accountId !== '—' && <CopyButton text={accountId} />}
              </div>
            </div>
          </div>
        </div>

        {/* ── Ticket info (if available) ── */}
        {ticket && (
          <div
            className="rounded-xl px-4 py-3 mb-6 flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <QrCode size={16} className="text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">Entry scanned</p>
              <p className="text-xs font-semibold text-slate-200">
                {ticket.tier} · Seat {ticket.seat}
              </p>
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <button
          id="go-to-dashboard-btn"
          onClick={() => navigate('/customer/dashboard')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
            boxShadow: '0 8px 24px -6px rgba(99,102,241,0.4)',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          Go to Dashboard
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
