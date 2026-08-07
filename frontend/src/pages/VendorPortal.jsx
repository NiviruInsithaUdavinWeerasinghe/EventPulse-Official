import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, AlertCircle, CheckCircle, RefreshCw, Wallet, Plus, X, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// --- Top Up Modal Component --------------------------------------------------
function TopUpModal({ isOpen, onClose, onTopUpSuccess }) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleTopUp = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid amount greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({ amount: val, paymentToken: 'mock_vendor_token' }),
      });
      const data = await res.json();
      if (data.success) {
        onTopUpSuccess(parseFloat(data.wallet.balance));
        setAmount('');
        onClose();
      } else {
        setError(data.message || 'Top up failed.');
      }
    } catch {
      setError('A network error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0f19] p-6 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-base font-bold text-white mb-1">Top Up Wallet</h3>
        <p className="text-slate-500 text-xs mb-4">Add digital credits to your vendor wallet profile.</p>

        <form onSubmit={handleTopUp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (LKR)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            Confirm Top Up
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VendorPortal() {
  const navigate = useNavigate();
  
  // --- States ----------------------------------------------------------------
  const [approvedEvent, setApprovedEvent] = useState(null); // { id, name, stallId }
  const [promoText, setPromoText] = useState('');
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' }

  // Wallet Specific States
  const [walletBalance, setWalletBalance] = useState(0.00);
  const [transactions, setTransactions] = useState([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const navCards = [
    {
      icon: '🗺️',
      title: 'Event registration & stall selection',
      desc: 'Browse upcoming events, register your presence, and choose your stall position on the interactive floorplan.',
      label: 'Go to events',
      route: '/events',
      color: 'indigo',
    },
    {
      icon: '🏢',
      title: 'Business profile',
      desc: 'Edit your store details, upload branding assets, update contact info, and manage your public vendor listing.',
      label: 'Edit profile',
      route: '/business/profile',
      color: 'indigo',
    },
    {
      icon: '💳',
      title: 'Checkout system (POS)',
      desc: 'Process transactions, apply discounts, manage your item catalogue, and handle payments at the point of sale.',
      label: 'Open POS',
      route: '/vendor/pos',
      color: 'emerald',
    },
    {
      icon: '📈',
      title: 'Sales performance timeline',
      desc: 'Review your revenue history, track stall performance over time, and export reports across past events.',
      label: 'View analytics',
      route: '/vendor/analytics',
      color: 'amber',
    },
    {
      icon: '📢',
      title: 'Proximity Ad Campaigns',
      desc: 'Create real-time geofenced advertisement campaigns to target attendees near your stall location.',
      label: 'Manage Ads',
      route: '/vendor/ads',
      color: 'indigo',
    },
  ];

  const iconStyles = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber:   'bg-amber-500/10  border-amber-500/20',
  };

  const arrowStyles = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
  };

  // --- Fetch Approved Event & Wallet Balance/History -------------------------
  const fetchWalletDetails = async () => {
    try {
      // 1. Initialize/Fetch Wallet Balance
      const initRes = await fetch('/api/wallet/init', {
        method: 'POST',
        headers: getAuthHeader(),
      });
      const initData = await initRes.json();
      if (initData.success && initData.wallet) {
        setWalletBalance(parseFloat(initData.wallet.balance));
      }

      // 2. Fetch Wallet History
      const histRes = await fetch('/api/wallet/history', {
        headers: getAuthHeader(),
      });
      const histData = await histRes.json();
      
      // Look up 'transactions' from backend response
      const histList = histData.transactions || histData.data || [];
      setTransactions(histList.slice(0, 5)); // Keep latest 5 txs
    } catch (err) {
      console.error('Error fetching wallet details:', err);
    } finally {
      setIsLoadingWallet(false);
    }
  };

  useEffect(() => {
    async function fetchVendorDetails() {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const vendorId = user.id || user._id;

        const res = await fetch(`/api/vendors/applications/vendor/${vendorId}`, {
          headers: getAuthHeader(),
        });
        const data = await res.json();
        
        if (data.success && data.data && data.data.length > 0) {
          const approved = data.data.find(app => app.status === 'Approved');
          if (approved && approved.eventId) {
            setApprovedEvent({
              id: approved.eventId._id,
              name: approved.eventId.name,
              stallId: approved.requestedStall,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching vendor application details:', err);
      } finally {
        setIsLoadingEvent(false);
      }
    }
    fetchVendorDetails();
    fetchWalletDetails();
  }, []);

  // --- Handle Flash Sale Submit ----------------------------------------------
  const handleLaunchFlashSale = async (e) => {
    e.preventDefault();
    if (!approvedEvent) return;
    if (!promoText.trim()) {
      setMessage({ text: 'Please enter a promotion message.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/flash-sales/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          eventId: approvedEvent.id,
          promoText: promoText.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({
          text: 'Flash sale broadcasted successfully! LKR 250.00 debited from your wallet.',
          type: 'success',
        });
        setPromoText('');
        fetchWalletDetails(); // Refresh wallet balance/history
      } else {
        setMessage({
          text: data.message || 'Failed to initiate flash sale.',
          type: 'error',
        });
      }
    } catch (err) {
      setMessage({ text: 'A network error occurred. Please try again.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100">
      {/* ── Main ───────────────────────────────────────── */}
      <main className="max-w-[860px] mx-auto px-6 py-10 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-[1.75rem] font-bold text-slate-50 mb-1.5 flex items-center gap-3">
              Welcome back 👋
            </h1>
            <p className="text-slate-550 text-[0.95rem]">
              Manage your event presence, stalls, and sales all from one place.
            </p>
          </div>
          {/* Approval status badge */}
          <div className="self-start sm:self-center flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Approved Stall Vendor
          </div>
        </div>

        {/* ── ROW 1: Navigation Cards Grid (Full Width) ─────────────────────── */}
        <div className="grid grid-cols-3 gap-4 max-[1024px]:grid-cols-2 max-[600px]:grid-cols-1">
          {navCards.map(({ icon, title, desc, label, route, color }) => (
            <div
              key={title}
              onClick={() => navigate(route)}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg mb-4 ${iconStyles[color]}`}>
                {icon}
              </div>
              <h3 className="text-sm font-semibold text-slate-50 mb-1">{title}</h3>
              <p className="text-slate-550 text-[0.78rem] leading-relaxed line-clamp-2">{desc}</p>
              <p className={`mt-4 text-[0.74rem] font-semibold tracking-wide ${arrowStyles[color]}`}>
                {label} →
              </p>
            </div>
          ))}
        </div>

        {/* ── ROW 2: Flash Sale Form (Left 2/3) & Wallet Stack (Right 1/3) ── */}
        <div className="grid grid-cols-3 gap-6 max-[1024px]:grid-cols-1 items-start">
          
          {/* Flash Sale Broadcast Form (Left 2/3) */}
          <div className="col-span-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 space-y-6 max-[1024px]:col-span-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-50">Flash Sale Broadcast Manager</h3>
                <p className="text-slate-550 text-xs mt-0.5">
                  Broadcast a 15-minute high-priority promo countdown alert banner to all active attendees.
                </p>
              </div>
            </div>

            {isLoadingEvent ? (
              <div className="flex items-center justify-center py-6 text-slate-550 text-sm gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading active event configuration...
              </div>
            ) : approvedEvent ? (
              <form onSubmit={handleLaunchFlashSale} className="space-y-4">
                {/* Event Context Info */}
                <div className="grid grid-cols-2 gap-3 bg-white/[0.01] border border-white/5 rounded-xl p-4 text-xs">
                  <div>
                    <span className="text-slate-550 block uppercase font-mono tracking-widest text-[9px]">Active Event</span>
                    <span className="font-semibold text-slate-200 mt-1 block">{approvedEvent.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-550 block uppercase font-mono tracking-widest text-[9px]">Stall ID / Floorplan Position</span>
                    <span className="font-semibold text-slate-200 mt-1 block uppercase">{approvedEvent.stallId}</span>
                  </div>
                </div>

                {/* Promo input */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-400">Promo Broadcast Text</label>
                    <span className={`text-[10px] font-mono ${140 - promoText.length < 20 ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                      {140 - promoText.length} characters remaining
                    </span>
                  </div>
                  <textarea
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value.slice(0, 140))}
                    placeholder="e.g. 50% OFF all burgers at Stall FS1 for the next 15 minutes! Use code BURGER50 at checkout."
                    rows="3"
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 transition resize-none"
                    maxLength={140}
                  />
                </div>

                {/* Fee notice */}
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-3 text-[11px] text-slate-400 flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-px" />
                  <p>
                    Broadcasting will debit a flat fee of <strong className="text-indigo-300">LKR 250.00</strong> from your vendor account wallet. Make sure your wallet is active and funded.
                  </p>
                </div>

                {/* Feedback messages */}
                {message && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    message.type === 'success' 
                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                      : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
                  }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                    <span className="leading-snug">{message.text}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !promoText.trim()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {isSubmitting ? 'Processing Transaction...' : 'Purchase & Broadcast Flash Sale (LKR 250.00)'}
                </button>
              </form>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-xs text-amber-400 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">No active approved event found.</p>
                  <p className="mt-0.5 text-slate-550">
                    To broadcast a flash sale, you must first register for an event and select an approved stall.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT COLUMN (1/3 Width): Digital Wallet Stack ───────────────── */}
          <div className="col-span-1 space-y-6 max-[1024px]:col-span-3">
            
            {/* Vendor Secure Wallet Panel (Balance & Top-Up Combined) */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Digital Wallet</span>
                </div>

                {isLoadingWallet ? (
                  <div className="py-4 text-xs text-slate-550 flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading wallet...
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-555 uppercase tracking-widest font-mono">Available Balance</span>
                    <p className="text-2xl font-black text-white tracking-tight">
                      LKR {walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/5 my-1" />

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-405">Top Up Wallet</span>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const amountInput = e.target.elements.topupAmount;
                  const val = parseFloat(amountInput.value);
                  if (isNaN(val) || val <= 0) return;
                  
                  try {
                    const res = await fetch('/api/wallet/topup', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
                      body: JSON.stringify({ amount: val, paymentToken: 'mock_vendor_token' }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      amountInput.value = '';
                      fetchWalletDetails();
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Amount (LKR)</label>
                    <input
                      type="number"
                      name="topupAmount"
                      placeholder="e.g. 500"
                      className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Confirm Top Up
                  </button>
                </form>
              </div>
            </div>

            {/* Wallet Transaction History Panel */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Wallet History</span>
                <Clock className="w-3.5 h-3.5 text-slate-500" />
              </div>

              {isLoadingWallet ? (
                <div className="py-6 text-center text-xs text-slate-550 flex items-center justify-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading logs...
                </div>
              ) : transactions.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {transactions.map((tx) => {
                    const isDeposit = tx.transactionType === 'Credit' || tx.type === 'deposit' || tx.type === 'topup';
                    const amountVal = parseFloat(tx.amount?.toString() || '0');
                    
                    return (
                      <div key={tx._id || tx.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.01] border border-white/5 text-[11px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            isDeposit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {isDeposit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownLeft className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 capitalize">{tx.description || tx.transactionType || tx.type}</p>
                            <p className="text-[9px] text-slate-550 font-mono mt-0.5">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <span className={`font-bold ${isDeposit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isDeposit ? '+' : '-'} LKR {amountVal.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-[11px] text-slate-600">
                  No recent wallet transactions.
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}