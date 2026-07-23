import React from 'react';
import { Trophy, CheckCircle2, Lock, Sparkles, MapPin, RotateCcw } from 'lucide-react';

export default function ScavengerProgressBar({ score = 0, maxScore = 5, codes = [], onReset }) {
  const percentage = Math.min(100, Math.round((score / (maxScore || 1)) * 100));

  return (
    <div className="w-full bg-slate-900/80 dark:bg-[#0c1222]/90 border border-slate-800 dark:border-indigo-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-xl space-y-6">
      {/* Header & Score Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="text-amber-400" size={20} />
            <h2 className="text-lg font-bold text-white tracking-tight">Scavenger Hunt Progress</h2>
          </div>
          <p className="text-xs text-slate-400">
            Explore venue zones, locate hidden QR codes, and claim your rewards!
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onReset && (
            <button
              onClick={onReset}
              title="Reset claims for demo/testing"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <RotateCcw size={13} className="text-indigo-400" />
              Reset Demo
            </button>
          )}

          <div className="text-right">
            <span className="text-2xl font-black text-white">{score}</span>
            <span className="text-sm font-semibold text-slate-400"> / {maxScore}</span>
            <p className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">Codes Claimed</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center font-extrabold text-indigo-400 text-sm">
            {percentage}%
          </div>
        </div>
      </div>

      {/* Main Progress Bar Component (SUB-3) */}
      <div className="space-y-2">
        <div className="relative w-full h-4 bg-slate-800/90 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(168,85,247,0.5)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-semibold text-slate-400 px-1">
          <span>0%</span>
          <span>50%</span>
          <span>100% {percentage === 100 ? '🎉 All Claimed!' : ''}</span>
        </div>
      </div>

      {/* Code Milestones List */}
      {codes && codes.length > 0 && (
        <div className="space-y-3 pt-2 border-t border-slate-800/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Sparkles size={14} className="text-indigo-400" />
            Venue Hunt Checklist ({codes.filter(c => c.isClaimed).length}/{codes.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {codes.map((item, idx) => (
              <div
                key={item.code || idx}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  item.isClaimed
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-white'
                    : 'bg-slate-800/30 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs ${
                      item.isClaimed
                        ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {item.isClaimed ? <CheckCircle2 size={16} /> : <Lock size={14} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${item.isClaimed ? 'text-white' : 'text-slate-300'}`}>
                      {item.title || `QR Code #${idx + 1}`}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                      <MapPin size={10} className="flex-shrink-0" />
                      {item.locationHint || 'Explore venue area'}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.isClaimed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                  }`}
                >
                  {item.isClaimed ? 'Claimed' : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
