import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import ScavengerScanner from '../components/ScavengerScanner.jsx';
import ScavengerProgressBar from '../components/ScavengerProgressBar.jsx';
import ConfettiEffect from '../components/ConfettiEffect.jsx';
import { Compass, Trophy, QrCode, ArrowLeft, RefreshCw, Sparkles, MapPin, CheckCircle2, Award, Medal, Gift, Lock, EyeOff } from 'lucide-react';

export default function ScavengerHunt() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(6);
  const [questTarget, setQuestTarget] = useState(6);
  const [voucher, setVoucher] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'progress' | 'leaderboard'

  // Load progress and leaderboard from backend
  const fetchProgress = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const [progRes, leadRes] = await Promise.all([
        fetch('/api/scavenger/progress', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/scavenger/leaderboard')
      ]);

      if (progRes.ok) {
        const data = await progRes.json();
        if (data.success) {
          setScore(data.score);
          setMaxScore(data.maxScore || 6);
          setQuestTarget(data.questTarget || 6);
          setCodes(data.codes || []);
          setVoucher(data.voucher || null);
        }
      }

      if (leadRes.ok) {
        const leadData = await leadRes.json();
        if (leadData.success) {
          setLeaderboard(leadData.leaderboard || []);
        }
      }
    } catch (err) {
      console.error('Error loading scavenger progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  // Callback when a 200 Success scan occurs (SUB-3)
  const handleScanSuccess = (resData) => {
    if (resData.score !== undefined) {
      setScore(resData.score);
    }
    if (resData.maxScore !== undefined) {
      setMaxScore(resData.maxScore);
    }
    // Programmatically trigger full-screen celebratory confetti & bounce animation
    setShowConfetti(true);
    // Refresh progress data so checklist and progress bar update
    fetchProgress();
  };

  // Reset user's progress for demo/testing purposes
  const handleReset = async () => {
    if (!window.confirm('Reset all claimed scavenger hunt codes for demo testing?')) return;
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch('/api/scavenger/reset', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScore(0);
        setShowConfetti(false);
        fetchProgress();
      }
    } catch (err) {
      console.error('Error resetting scavenger progress:', err);
    }
  };

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
      {/* Full-Screen Celebratory Confetti & Bounce Component (SUB-3) */}
      <ConfettiEffect
        active={showConfetti}
        duration={4000}
        onClose={() => setShowConfetti(false)}
      />

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => navigate('/customer/dashboard')}
                className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-widest uppercase text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 hover:bg-indigo-500/20 transition-all cursor-pointer"
              >
                <ArrowLeft size={12} /> Attendee Console
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">•</span>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Interactive Venue Quest
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight flex items-center gap-3">
              Event Scavenger Hunt 🗺️
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl font-normal">
              Locate and scan secret QR markers placed across halls to earn points, complete quests, and unlock free food court rewards!
            </p>
          </div>

          <div 
            className="flex items-center gap-2 p-1.5 rounded-2xl border shrink-0 backdrop-blur-xl"
            style={{
              background: isDarkMode ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 4px 16px rgba(0, 0, 0, 0.04)',
            }}
          >
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                activeTab === 'scanner'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
              }`}
            >
              <QrCode size={15} />
              Live Scanner
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                activeTab === 'progress'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
              }`}
            >
              <Trophy size={15} />
              Quest Log ({score}/{maxScore})
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border-none ${
                activeTab === 'leaderboard'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
              }`}
            >
              <Medal size={15} />
              Leaderboard (Top 10)
            </button>
          </div>
        </div>

        {/* Main Tab Content */}
        {activeTab === 'scanner' && (
          <div className="space-y-6 animate-fade-in">
            {/* Gamification Progress Bar Component */}
            <ScavengerProgressBar score={score} targetGoal={questTarget} totalVenueCodes={codes.length} codes={codes} onReset={handleReset} voucher={voucher} />

            {/* Voucher Alert Banner if 6 codes claimed */}
            {voucher && (
              <div 
                className="p-5 sm:p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
                style={{
                  background: isDarkMode 
                    ? (voucher.status === 'Redeemed'
                        ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.6) 100%)'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)')
                    : (voucher.status === 'Redeemed' ? '#f8fafc' : '#fffbeb'),
                  borderColor: isDarkMode 
                    ? (voucher.status === 'Redeemed' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(245, 158, 11, 0.3)')
                    : (voucher.status === 'Redeemed' ? '#e2e8f0' : '#fde68a'),
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 ${
                    voucher.status === 'Redeemed'
                      ? 'bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                      : 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  }`}>
                    {voucher.status === 'Redeemed' ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Gift size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold uppercase tracking-widest ${
                        voucher.status === 'Redeemed'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}>
                        {voucher.status === 'Redeemed' ? '✓ Voucher Redeemed at Food Court' : '🎉 Quest Reward Unlocked'}
                      </span>
                      {voucher.status === 'Redeemed' && (
                        <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                          Claimed
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Free Food Court Voucher (LKR {voucher.faceValue || 500}.00)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Code: <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{voucher.code}</span> • {voucher.status === 'Redeemed' ? `Redeemed on ${new Date(voucher.redeemedAt || Date.now()).toLocaleDateString()}` : 'Subsidized by Event Organizer'}
                    </p>
                  </div>
                </div>
                <Link
                  to="/customer/dashboard"
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 no-underline ${
                    voucher.status === 'Redeemed'
                      ? 'bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-110 shadow-md shadow-amber-500/20'
                  }`}
                >
                  View in My Vouchers →
                </Link>
              </div>
            )}

            <ScavengerScanner onScanSuccess={handleScanSuccess} codes={codes} />
          </div>
        )}

        {activeTab === 'progress' && (
          <div 
            className="rounded-3xl p-6 sm:p-8 backdrop-blur-xl border space-y-6 transition-all"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 15, 30, 0.85) 100%)' 
                : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              boxShadow: isDarkMode 
                ? '0 16px 40px -10px rgba(0,0,0,0.5)' 
                : '0 10px 30px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isDarkMode ? 'rgba(99,102,241,0.15)' : '#e0e7ff',
                    border: '1px solid rgba(99,102,241,0.25)',
                  }}
                >
                  <Compass className="text-indigo-500 dark:text-indigo-400" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Venue Code Locations & Hints ({codes.filter(c => c.isClaimed).length}/{codes.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Find any {questTarget} checkpoints across the venue floor to claim the food court reward
                  </p>
                </div>
              </div>
              <button
                onClick={fetchProgress}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition-all cursor-pointer border border-indigo-500/20 bg-transparent"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Hints
              </button>
            </div>

            <div className="space-y-3">
              {codes.map((item, idx) => (
                <div
                  key={item.code || idx}
                  className="p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{
                    background: item.isClaimed
                      ? (isDarkMode ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
                    borderColor: item.isClaimed
                      ? (isDarkMode ? 'rgba(16, 185, 129, 0.25)' : '#bbf7d0')
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0'),
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform ${
                        item.isClaimed
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                          : 'bg-slate-200/80 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {item.isClaimed ? <CheckCircle2 size={20} /> : <Lock size={18} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {item.isClaimed ? item.title : `Secret Checkpoint #${idx + 1}`}
                        {item.isClaimed ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Discovered
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            Hidden Mystery
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 font-medium">
                        <MapPin size={13} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                        {item.isClaimed ? item.locationHint : 'Hidden in a secret corner of the venue. Explore the halls to find it!'}
                      </p>
                      <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block mt-1">
                        Token: {item.isClaimed ? <span className="font-bold">{item.code}</span> : <span className="tracking-widest font-bold">••••••••••••</span>}
                      </span>
                    </div>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider ${
                        item.isClaimed
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {item.isClaimed ? (
                        <>
                          <Award size={13} /> Claimed (+1 Point)
                        </>
                      ) : (
                        <>
                          <EyeOff size={13} /> Undiscovered
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Top 10 Speed Leaderboard Tab ─────────────────── */}
        {activeTab === 'leaderboard' && (
          <div 
            className="rounded-3xl p-6 sm:p-8 backdrop-blur-xl border space-y-6 transition-all"
            style={{
              background: isDarkMode 
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.7) 0%, rgba(10, 15, 30, 0.85) 100%)' 
                : '#ffffff',
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
              boxShadow: isDarkMode 
                ? '0 16px 40px -10px rgba(0,0,0,0.5)' 
                : '0 10px 30px -5px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: isDarkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                    border: '1px solid rgba(245,158,11,0.25)',
                  }}
                >
                  <Trophy className="text-amber-500" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Top 10 Fast-Finishers Leaderboard 🏆
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live rankings of attendees discovering secret checkpoints across EventPulse
                  </p>
                </div>
              </div>
              <button
                onClick={fetchProgress}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-all cursor-pointer border border-amber-500/20 bg-transparent"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Rankings
              </button>
            </div>

            <div className="space-y-2.5">
              {leaderboard.length > 0 ? (
                leaderboard.map((user, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <div
                      key={user.id || idx}
                      className="p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all"
                      style={{
                        background: idx === 0 
                          ? (isDarkMode ? 'rgba(245, 158, 11, 0.08)' : '#fefce8')
                          : (isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
                        borderColor: idx === 0
                          ? (isDarkMode ? 'rgba(245, 158, 11, 0.25)' : '#fef08a')
                          : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0')
                      }}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div 
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            idx === 0 
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                              : idx === 1
                              ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-white'
                              : idx === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                            {user.scans} / {questTarget} checkpoints claimed
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 block">
                          {user.score} Pts
                        </span>
                        {user.hasCompletedQuest && (
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Quest Winner 🎉
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No attendees have claimed checkpoints yet. Be the first to rank!
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

