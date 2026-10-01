import React from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { Trophy, CheckCircle2, Lock, Sparkles, MapPin, RotateCcw } from 'lucide-react';

export default function ScavengerProgressBar({ score = 0, maxScore = 5, codes = [], onReset }) {
  const { isDarkMode } = useTheme();
  const percentage = Math.min(100, Math.round((score / (maxScore || 1)) * 100));

  return (
    <div 
      className="w-full rounded-3xl p-6 sm:p-8 backdrop-blur-xl border space-y-6 transition-all"
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
      {/* Header & Score Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: isDarkMode ? 'rgba(245,158,11,0.15)' : '#fef3c7',
                border: '1px solid rgba(245,158,11,0.25)',
              }}
            >
              <Trophy className="text-amber-500 dark:text-amber-400" size={17} />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Scavenger Hunt Live Progress
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Explore venue zones, locate hidden QR codes, and claim your rewards!
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              title="Reset claims for demo/testing"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw size={13} className="text-indigo-500 dark:text-indigo-400" />
              Reset Demo
            </button>
          )}

          <div className="text-right">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{score}</span>
            <span className="text-sm font-semibold text-slate-400"> / {maxScore}</span>
            <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-500 dark:text-indigo-400">Codes Claimed</p>
          </div>
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-extrabold text-indigo-500 dark:text-indigo-400 text-sm"
            style={{
              background: isDarkMode ? 'rgba(99,102,241,0.15)' : '#e0e7ff',
              border: '1px solid rgba(99,102,241,0.25)',
            }}
          >
            {percentage}%
          </div>
        </div>
      </div>

      {/* Main Progress Bar Component (SUB-3) */}
      <div className="space-y-2">
        <div 
          className="relative w-full h-3.5 rounded-full overflow-hidden p-0.5 border"
          style={{
            background: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : '#f1f5f9',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(168,85,247,0.4)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1">
          <span>0%</span>
          <span>50%</span>
          <span className="font-bold text-indigo-500 dark:text-indigo-400">
            100% {percentage === 100 ? '🎉 All Claimed!' : ''}
          </span>
        </div>
      </div>

      {/* Code Milestones List */}
      {codes && codes.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
            Venue Hunt Checklist ({codes.filter(c => c.isClaimed).length}/{codes.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {codes.map((item, idx) => (
              <div
                key={item.code || idx}
                className="p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3"
                style={{
                  background: item.isClaimed
                    ? (isDarkMode ? 'rgba(99,102,241,0.08)' : '#eef2ff')
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.02)' : '#f8fafc'),
                  borderColor: item.isClaimed
                    ? (isDarkMode ? 'rgba(99,102,241,0.25)' : '#c7d2fe')
                    : (isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0'),
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                      item.isClaimed
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {item.isClaimed ? <CheckCircle2 size={16} /> : <Lock size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${item.isClaimed ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                      {item.title || `QR Code #${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate mt-0.5">
                      <MapPin size={10} className="flex-shrink-0 text-indigo-500 dark:text-indigo-400" />
                      {item.locationHint || 'Explore venue area'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full flex-shrink-0 ${
                    item.isClaimed
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25'
                      : 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300/40 dark:border-slate-700'
                  }`}
                >
                  {item.isClaimed ? 'Claimed' : 'Locked'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

