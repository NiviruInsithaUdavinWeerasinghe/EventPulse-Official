import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  CreditCard, 
  Wallet, 
  CalendarDays, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  PlusCircle, 
  ChevronRight,
  Ticket
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

function getUserData() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUserData();
  const { walletBalance, updateBalance, setWalletBalance } = useNotification();
  const { isDarkMode } = useTheme();

  // Selected parameters passed via navigate state
  const { tier, price } = location.state || { tier: 'Standard', price: 5000 };

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [purchasedTicket, setPurchasedTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Refresh user's real wallet balance from database
    updateBalance();

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/events/${id}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to load checkout details.');
        setEvent(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvent();
  }, [id, user, navigate]);

  const handlePurchase = async () => {
    if (walletBalance < price) {
      setError('Insufficient funds in your digital wallet. Please top up your wallet on your dashboard.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/events/${id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tier,
          seat: `Seat ${Math.floor(Math.random() * 150) + 1}`,
          price
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Checkout failed.');
      
      // Update real wallet balance in global context
      if (typeof data.walletBalance === 'number') {
        setWalletBalance(data.walletBalance);
      } else {
        updateBalance();
      }

      setPurchasedTicket(data.ticket);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingBalance = walletBalance - price;
  const isInsufficient = remainingBalance < 0;

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <div className="w-12 h-12 border-[3px] border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading secure checkout...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-[540px] mx-auto px-6 py-16 text-center animate-fade-in">
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400 mb-6 shadow-2xl shadow-emerald-500/20">
          <CheckCircle2 size={42} />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Order Confirmed!</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6">
          Your ticket purchase has been debited directly from your <strong className="text-slate-700 dark:text-slate-200">Digital Wallet</strong> and saved to your attendee profile.
        </p>

        {/* Ticket receipt pill */}
        <div className="p-5 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 shadow-lg mb-8 text-left space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Ticket size={16} className="text-indigo-500 dark:text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Active Pass</span>
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-1 rounded-full">
              {tier} Tier
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Event</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">{event?.name}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Allocated Seat</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">{purchasedTicket?.seat || 'Standard Entry'}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Amount Deducted</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">LKR {price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-white/5">
            <span className="text-slate-500">New Wallet Balance</span>
            <span className="font-extrabold text-slate-900 dark:text-white">LKR {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => navigate('/customer/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 cursor-pointer text-sm"
          >
            Go to My Wallet & Tickets <ChevronRight size={16} />
          </button>
          <button
            onClick={() => navigate('/events')}
            className="px-5 py-3.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 font-semibold text-sm transition-all"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto px-6 py-10">
      {/* Breadcrumb / Back button */}
      <button 
        onClick={() => navigate(`/events/${id}`)}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors mb-6 bg-transparent border-none cursor-pointer p-0"
      >
        <ArrowLeft size={14} /> Back to Event Details
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 dark:text-indigo-300 mb-2">
            <ShieldCheck size={14} /> Official EventPulse Secure Checkout
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Finalize Ticket Booking</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.03] px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/5">
          <Zap size={14} className="text-amber-500" /> Instant cashless settlement
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Summary (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div 
            className="p-6 rounded-3xl border shadow-xl space-y-5 transition-colors"
            style={{
              background: isDarkMode ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 20px 50px rgba(0, 0, 0, 0.4)' : '0 10px 30px rgba(0, 0, 0, 0.05)'
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Order Summary</h3>
            
            {/* Event preview card */}
            <div 
              className="flex gap-4 items-center p-4 rounded-2xl border transition-colors"
              style={{
                background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
              }}
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 shadow-md">
                <img src={event?.bannerImageUrl} alt={event?.name} className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full inline-block mb-1">
                  {tier} Pass
                </span>
                <p className="text-base font-extrabold text-slate-900 dark:text-white leading-snug truncate">{event?.name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> Exhibition Hall A
                  </span>
                </div>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="space-y-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex justify-between items-center py-1">
                <span>1x {tier} Admission Ticket</span>
                <span className="font-semibold text-slate-900 dark:text-white">LKR {price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Processing & Service Fee</span>
                <span className="text-emerald-500 font-bold uppercase text-[11px]">Free (LKR 0)</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/5 text-sm font-bold">
                <span className="text-slate-700 dark:text-slate-300">Total Due</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">LKR {price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/10 flex items-start gap-3 text-red-500 dark:text-red-400 text-sm font-medium">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs uppercase tracking-wider mb-0.5">Payment Notice</p>
                <p className="text-xs leading-relaxed">{error}</p>
                {isInsufficient && (
                  <button
                    onClick={() => navigate('/customer/dashboard')}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-300 underline hover:no-underline cursor-pointer bg-transparent border-none p-0"
                  >
                    Open Dashboard to Top Up Wallet <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real Digital Wallet Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div 
            className="p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-colors"
            style={{
              background: isDarkMode ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.75) 0%, rgba(10, 15, 30, 0.9) 100%)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 20px 50px rgba(0, 0, 0, 0.4)' : '0 10px 30px rgba(0, 0, 0, 0.05)'
            }}
          >
            {/* Top decorative accent glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Wallet size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Attendee Digital Wallet</h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Cashless Event Account</p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Connected
              </span>
            </div>

            {/* Wallet balance display */}
            <div 
              className="p-4 rounded-2xl border mb-5 transition-colors"
              style={{
                background: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc',
                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'
              }}
            >
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Your Available Balance</p>
              <div className="flex items-baseline justify-between">
                <p className="text-3xl font-black text-slate-900 dark:text-white">
                  LKR {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/customer/dashboard')}
                  className="text-xs font-bold text-indigo-500 dark:text-indigo-400 hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                >
                  <PlusCircle size={13} /> Top Up
                </button>
              </div>
            </div>

            {/* Ledger projection breakdown */}
            <div className="border-t border-slate-100 dark:border-white/5 pt-4 mb-6 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Ticket Price</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">LKR {price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Balance After Payment</span>
                <span className={`font-black text-sm ${isInsufficient ? 'text-red-500' : 'text-emerald-500'}`}>
                  LKR {remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handlePurchase}
              disabled={isSubmitting || isInsufficient}
              className={`w-full flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-bold transition-all duration-200 shadow-xl cursor-pointer text-sm
                ${isInsufficient
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-transparent'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-600 hover:opacity-95 active:scale-[0.98] text-white shadow-indigo-500/25'
                }`}
            >
              <CreditCard size={18} />
              {isSubmitting ? 'Processing Transaction...' : isInsufficient ? 'Insufficient Wallet Balance' : 'Confirm & Pay from Wallet'}
            </button>

            {isInsufficient && (
              <p className="text-[11px] text-center text-slate-500 mt-3">
                Need more balance? Visit your{' '}
                <Link to="/customer/dashboard" className="text-indigo-500 font-bold hover:underline">
                  Customer Dashboard
                </Link>{' '}
                to top up via mock card instantly.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

