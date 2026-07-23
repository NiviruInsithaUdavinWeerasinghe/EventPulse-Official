import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import ScavengerScanner from '../components/ScavengerScanner.jsx';
import ScavengerProgressBar from '../components/ScavengerProgressBar.jsx';
import ConfettiEffect from '../components/ConfettiEffect.jsx';
import { Compass, Trophy, QrCode, ArrowLeft, RefreshCw, Sparkles, MapPin } from 'lucide-react';

export default function ScavengerHunt() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(5);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState('scanner'); // 'scanner' | 'progress'

  // Load progress from backend
  const fetchProgress = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/scavenger/progress', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setScore(data.score);
        setMaxScore(data.maxScore || 5);
        setCodes(data.codes || []);
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

  return (
    <div
      className="min-h-screen text-slate-900 dark:text-white py-8 px-4 sm:px-6"
      style={{
        background: isDarkMode
          ? 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%), #030712'
          : 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%), #f8fafc',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Full-Screen Celebratory Confetti & Bounce Component (SUB-3) */}
      <ConfettiEffect
        active={showConfetti}
        duration={4000}
        onClose={() => setShowConfetti(false)}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/customer/dashboard')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors mb-2 cursor-pointer bg-transparent border-none"
            >
              <ArrowLeft size={14} /> Back to Customer Dashboard
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              Event Scavenger Hunt 🗺️
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Scan hidden QR codes around venue zones to automatically update your game score!
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'scanner'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode size={15} />
              QR Scanner
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'progress'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy size={15} />
              Dashboard ({score}/{maxScore})
            </button>
          </div>
        </div>

        {/* Gamification Progress Bar Component (SUB-3) */}
        <ScavengerProgressBar score={score} maxScore={maxScore} codes={codes} onReset={handleReset} />

        {/* Main Tab Content */}
        {activeTab === 'scanner' ? (
          <div className="space-y-6">
            <ScavengerScanner onScanSuccess={handleScanSuccess} />
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Compass className="text-indigo-400" size={18} />
                Venue Code Locations & Hints
              </h3>
              <button
                onClick={fetchProgress}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer bg-transparent border-none"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="space-y-3">
              {codes.map((item, idx) => (
                <div
                  key={item.code || idx}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    item.isClaimed
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center font-extrabold text-sm ${
                        item.isClaimed
                          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="text-indigo-400" />
                        {item.locationHint}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">Code: {item.code}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        item.isClaimed
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {item.isClaimed ? 'Claimed (+1 Pt)' : 'Unclaimed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
