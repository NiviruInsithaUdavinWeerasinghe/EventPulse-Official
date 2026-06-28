import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, Wallet, CalendarDays, MapPin, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

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

  // Selected parameters passed via navigate state
  const { tier, price } = location.state || { tier: 'Standard', price: 5000 };

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(24750);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

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
      setError('Insufficient funds. Please top up your wallet.');
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
      
      setWalletBalance(data.walletBalance);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-500">
        <div className="w-10 h-10 border-[3px] border-indigo-500/15 border-t-indigo-500 rounded-full animate-spin" />
        <p>Loading checkout...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-[480px] mx-auto px-6 py-16 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
          <CheckCircle2 size={36} />
        </div>
        <h2 className="text-3xl font-extrabold text-white mb-2">Order Confirmed!</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Your ticket purchase has been finalized. You can access your ticket and QR code directly on your dashboard.
        </p>
        <button
          onClick={() => navigate('/customer/dashboard')}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 active:scale-[0.98] text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/10 cursor-pointer text-sm"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12">
      <h1 className="text-3xl font-extrabold text-white mb-2">Checkout</h1>
      <p className="text-slate-400 text-sm mb-10">Confirm your ticket details to finalize checkout</p>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Left Column: Checkout Summary */}
        <div className="md:col-span-3 space-y-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <h3 className="text-base font-bold text-white uppercase tracking-wider text-xs text-indigo-400">Order Details</h3>
            <div className="flex gap-4 items-center pb-4 border-b border-white/5">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                <img src={event.bannerImageUrl} alt={event.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-snug">{event.name}</p>
                <p className="text-xs text-slate-500 mt-1">{tier} Ticket</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white">LKR {price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Booking Fee</span>
                <span className="text-white">LKR 0</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/5 font-bold text-sm">
                <span className="text-slate-300">Total Price</span>
                <span className="text-indigo-400">LKR {price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 flex items-start gap-3 text-red-400 text-sm font-medium">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Column: Wallet & Confirm */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={16} className="text-purple-400" />
              <h3 className="text-sm font-bold text-slate-300">Digital Wallet</h3>
            </div>

            <div className="mb-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Available Balance</p>
              <p className="text-2xl font-extrabold text-white mt-1">LKR {walletBalance.toLocaleString()}</p>
            </div>

            <div className="border-t border-white/5 pt-4 mb-6">
              <div className="flex justify-between text-xs mb-1 text-slate-500">
                <span>Total Due</span>
                <span>LKR {price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>Remaining Balance</span>
                <span className={walletBalance - price < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  LKR {(walletBalance - price).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/10 cursor-pointer text-sm"
            >
              <CreditCard size={16} />
              {isSubmitting ? 'Confirming...' : 'Confirm & Pay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
