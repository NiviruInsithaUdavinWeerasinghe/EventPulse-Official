import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useNotification } from '../context/NotificationContext.jsx';
import { ArrowLeft, RefreshCw, Wallet, ShieldCheck, AlertTriangle, Zap, CheckCircle, X } from 'lucide-react';

// ── constants ────────────────────────────────────────────────────────────────
const TOKEN_TTL_MS = 60_000; // 60 seconds, must match backend
const REFRESH_THRESHOLD_MS = 5_000; // auto-refresh 5 s before expiry for smooth UX
const QR_SIZE = 220;

// ── helpers ──────────────────────────────────────────────────────────────────
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || {};
  } catch {
    return {};
  }
}

/** Build the qrserver.com URL that renders the token string as a scannable QR image */
function buildQrUrl(tokenString) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${QR_SIZE}x${QR_SIZE}&margin=12&data=${encodeURIComponent(tokenString)}`;
}

// ── Circular countdown ring (SVG) ────────────────────────────────────────────
function CountdownRing({ secondsLeft, totalSeconds = 60 }) {
  const radius = 158;
  const stroke = 8;
  const normalised = radius - stroke;
  const circumference = 2 * Math.PI * normalised;
  const progress = secondsLeft / totalSeconds;
  const dashOffset = circumference * (1 - progress);

  // Colour shifts: green → amber → red
  const hue = Math.round(progress * 120); // 120 = green, 0 = red
  const ringColor = `hsl(${hue},80%,52%)`;

  return (
    <svg
      width={radius * 2}
      height={radius * 2}
      className="absolute pointer-events-none"
      style={{
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-90deg)',
        zIndex: 10,
      }}
    >
      {/* background track */}
      <circle
        cx={radius}
        cy={radius}
        r={normalised}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />
      {/* progress arc */}
      <circle
        cx={radius}
        cy={radius}
        r={normalised}
        fill="none"
        stroke={ringColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.5s ease' }}
      />
    </svg>
  );
}

// ── Status pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const configs = {
    active:     { dot: '#22c55e', label: 'Active · Ready to Scan',  bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   text: '#4ade80' },
    refreshing: { dot: '#f59e0b', label: 'Refreshing Token…',       bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)',  text: '#fbbf24' },
    error:      { dot: '#ef4444', label: 'Connection Error',         bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   text: '#f87171' },
    loading:    { dot: '#6366f1', label: 'Loading…',                 bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)', text: '#818cf8' },
  };
  const c = configs[status] || configs.loading;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{
          background: c.dot,
          boxShadow: `0 0 6px ${c.dot}`,
          animation: status === 'active' ? 'pulse 2s infinite' : 'none',
        }}
      />
      {c.label}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PaymentQR() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const { walletBalance, setWalletBalance, currency } = useNotification();
  const user = getUser();

  const [token, setToken]               = useState(null);       // raw token string
  const [expiresAt, setExpiresAt]       = useState(null);       // Date object
  const [secondsLeft, setSecondsLeft]   = useState(60);
  const [uiStatus, setUiStatus]         = useState('loading');  // loading | active | refreshing | error
  const [errorMsg, setErrorMsg]         = useState('');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);

  const countdownRef = useRef(null);

  // ── fetch helpers ──────────────────────────────────────────────────────────

  const generateToken = useCallback(async () => {
    setUiStatus('refreshing');
    setQrImageLoaded(false);
    try {
      const res = await fetch('/api/wallet/token/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Token generation failed.');

      setToken(data.token);
      setExpiresAt(new Date(data.expiresAt));
      if (data.wallet?.balance !== undefined) {
        setWalletBalance(parseFloat(data.wallet.balance) || 0);
      }
      setUiStatus('active');
      setErrorMsg('');
    } catch (err) {
      setUiStatus('error');
      setErrorMsg(err.message);
    }
  }, [setWalletBalance]);

  const fetchActiveOrGenerate = useCallback(async () => {
    setUiStatus('loading');
    try {
      const res = await fetch('/api/wallet/token/active', {
        headers: { ...getAuthHeader() },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch token.');

      if (data.token) {
        const exp = new Date(data.expiresAt);
        const msLeft = exp - Date.now();
        // Only reuse existing token if it has more than REFRESH_THRESHOLD_MS remaining
        if (msLeft > REFRESH_THRESHOLD_MS) {
          setToken(data.token);
          setExpiresAt(exp);
          if (data.wallet?.balance !== undefined) {
            setWalletBalance(parseFloat(data.wallet.balance) || 0);
          }
          setUiStatus('active');
          setErrorMsg('');
          return;
        }
      }
      // No active token or almost expired — generate fresh
      await generateToken();
    } catch (err) {
      // Fallback: attempt generation anyway
      await generateToken();
    }
  }, [generateToken, setWalletBalance]);

  // ── mount: load token ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchActiveOrGenerate();
  }, [fetchActiveOrGenerate]);

  // ── countdown ticker ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const msLeft = expiresAt - Date.now();
      const sLeft = Math.max(0, Math.ceil(msLeft / 1000));
      setSecondsLeft(sLeft);

      // Auto-refresh 5 s before expiry
      if (msLeft <= REFRESH_THRESHOLD_MS && msLeft > 0) {
        generateToken();
      }
    };

    tick(); // immediate first tick
    countdownRef.current = setInterval(tick, 1000);

    return () => {
      clearInterval(countdownRef.current);
    };
  }, [expiresAt, generateToken]);

  // ── manual refresh ─────────────────────────────────────────────────────────
  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    setIsManualRefreshing(true);
    await generateToken();
    setIsManualRefreshing(false);
  };

  // ── derived values ─────────────────────────────────────────────────────────
  const balanceNum = walletBalance || 0;
  const qrUrl = token ? buildQrUrl(token) : null;

  // Truncated token for display (first 8 + … + last 8 chars)
  const tokenDisplay = token
    ? `${token.slice(0, 8)}…${token.slice(-8)}`
    : '—';

  // ── background ─────────────────────────────────────────────────────────────
  const bg = isDarkMode
    ? 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(168,85,247,0.07) 0%, transparent 50%), #030712'
    : 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(168,85,247,0.04) 0%, transparent 50%), #f1f5f9';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: bg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >


      {/* ── Header bar ── */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 max-w-md mx-auto w-full">
        <button
          onClick={() => navigate('/customer/dashboard')}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer bg-transparent border-none"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ShieldCheck size={14} className="text-indigo-400" />
          Secure Pay
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-start px-5 pb-12 max-w-md mx-auto w-full">

        {/* Wallet balance chip */}
        <div
          className="mb-6 flex items-center gap-2.5 px-5 py-3 rounded-2xl border"
          style={{
            background: isDarkMode ? 'rgba(168,85,247,0.07)' : 'rgba(168,85,247,0.05)',
            border: isDarkMode ? '1px solid rgba(168,85,247,0.2)' : '1px solid rgba(168,85,247,0.15)',
          }}
        >
          <Wallet size={16} className="text-purple-400 flex-shrink-0" />
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-500 uppercase tracking-widest font-semibold">Available Balance</p>
            <p className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
              {currency} {balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* QR Card */}
        <div
          className="w-full rounded-3xl p-8 flex flex-col items-center border"
          style={{
            background: isDarkMode
              ? 'linear-gradient(145deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.01) 100%)'
              : 'rgba(255,255,255,0.85)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: isDarkMode
              ? '0 32px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset'
              : '0 20px 60px rgba(0,0,0,0.08)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mb-1">Payment Token</p>
          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-6 text-center">
            {user.fullName ? `${user.fullName.split(' ')[0]}'s Wallet` : 'My Wallet'}
          </p>

          {/* QR + countdown ring container */}
          <div
            className="relative flex items-center justify-center mb-6"
            style={{ width: 326, height: 326 }}
          >
            {/* QR white box — padding prevents the QR modules from being clipped by border-radius */}
            <div
              className="absolute rounded-2xl flex items-center justify-center"
              style={{
                width: 200,
                height: 200,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white',
                border: isDarkMode ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.06)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                padding: 10,
              }}
            >
              {uiStatus === 'loading' || uiStatus === 'refreshing' ? (
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500"
                    style={{ animation: 'spin 0.8s linear infinite' }}
                  />
                  <p className="text-[10px] text-slate-400 font-medium">
                    {uiStatus === 'loading' ? 'Loading…' : 'Refreshing…'}
                  </p>
                </div>
              ) : uiStatus === 'error' ? (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <AlertTriangle size={28} className="text-red-400" />
                  <p className="text-[10px] text-red-400 font-medium">{errorMsg || 'Failed to load'}</p>
                </div>
              ) : (
                <>
                  {/* Real scannable QR rendered via qrserver.com */}
                  {!qrImageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white rounded-2xl">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-indigo-300 border-t-indigo-600"
                        style={{ animation: 'spin 0.8s linear infinite' }}
                      />
                    </div>
                  )}
                  <img
                    key={token}
                    src={qrUrl}
                    alt="Payment QR code"
                    width={180}
                    height={180}
                    onLoad={() => setQrImageLoaded(true)}
                    style={{
                      display: 'block',
                      opacity: qrImageLoaded ? 1 : 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  />
                </>
              )}
            </div>

            {/* Ring renders AFTER the QR so it paints on top — ring diameter (286px) is larger than QR (220px) */}
            {uiStatus === 'active' && (
              <CountdownRing secondsLeft={secondsLeft} totalSeconds={60} />
            )}
          </div>

          {/* Status pill */}
          <StatusPill status={uiStatus} />

          {/* Countdown text */}
          {uiStatus === 'active' && (
            <p className="mt-3 text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
              {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
            </p>
          )}

          {/* Token preview string */}
          {token && (
            <p
              className="mt-2 text-[10px] font-mono tracking-wider text-center"
              style={{ color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.25)' }}
            >
              {tokenDisplay}
            </p>
          )}

          {/* Divider */}
          <div
            className="w-full my-5"
            style={{ borderTop: isDarkMode ? '1px dashed rgba(255,255,255,0.07)' : '1px dashed rgba(0,0,0,0.08)' }}
          />

          {/* Instructions */}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed mb-5">
            Show this QR to the vendor at their stall.<br />
            The code is <span className="font-semibold text-slate-700 dark:text-slate-300">single-use</span> and expires every{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">60 seconds</span>.
          </p>

          {/* Manual refresh button */}
          <button
            id="manual-refresh-qr-btn"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || uiStatus === 'loading'}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer w-full justify-center"
            style={{
              background: isDarkMode ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
              border: isDarkMode ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(99,102,241,0.18)',
              color: isDarkMode ? '#818cf8' : '#4f46e5',
              opacity: isManualRefreshing ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!isManualRefreshing) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <RefreshCw
              size={13}
              style={{ animation: isManualRefreshing ? 'spin 0.8s linear infinite' : 'none' }}
            />
            {isManualRefreshing ? 'Generating new token…' : 'Refresh Token Now'}
          </button>
        </div>

        {/* Security note */}
        <div
          className="mt-5 w-full rounded-2xl px-5 py-4 flex items-start gap-3"
          style={{
            background: isDarkMode ? 'rgba(99,102,241,0.05)' : 'rgba(99,102,241,0.04)',
            border: isDarkMode ? '1px solid rgba(99,102,241,0.12)' : '1px solid rgba(99,102,241,0.1)',
          }}
        >
          <Zap size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Each QR token is a unique cryptographic string generated server-side.
            Once scanned and debited, the token is permanently invalidated — preventing double charges.
          </p>
        </div>
      </div>

      {/* Spinner keyframe — injected once */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
