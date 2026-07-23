import React, { useEffect, useState } from 'react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function ConfettiEffect({ active, duration = 3500, onClose }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (active) {
      const generated = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // percentage left
        delay: Math.random() * 0.8, // delay in seconds
        speed: 2 + Math.random() * 2.5, // fall duration in seconds
        size: 8 + Math.random() * 10, // size in px
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      }));
      setPieces(generated);

      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setPieces([]);
    }
  }, [active, duration, onClose]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
      {/* Dynamic Falling Confetti Particles */}
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute top-[-20px] animate-confetti-fall"
          style={{
            left: `${p.x}%`,
            width: `${p.size}px`,
            height: p.shape === 'rect' ? `${p.size * 1.6}px` : `${p.size}px`,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 10px ${p.color}aa`,
          }}
        />
      ))}

      {/* Celebratory Banner & Bounce Badge */}
      <div className="animate-celebrate-bounce pointer-events-auto bg-slate-900/90 dark:bg-slate-950/95 border border-indigo-500/40 rounded-3xl p-8 max-w-sm text-center shadow-[0_0_80px_rgba(99,102,241,0.5)] backdrop-blur-xl">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-1 flex items-center justify-center animate-pulse">
          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center text-4xl">
            🎉
          </div>
        </div>
        <h3 className="text-2xl font-extrabold text-white mb-2 tracking-tight">
          Scavenger Code Claimed!
        </h3>
        <p className="text-sm text-slate-300 mb-6 font-medium">
          Awesome job! Your game progress score has been updated.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs uppercase tracking-widest">
          +1 Point Added 🎯
        </div>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(720deg);
            opacity: 0.2;
          }
        }
        @keyframes celebrateBounce {
          0% {
            transform: scale(0.3) translateY(40px);
            opacity: 0;
          }
          50% {
            transform: scale(1.08) translateY(-10px);
            opacity: 1;
          }
          70% {
            transform: scale(0.95) translateY(5px);
          }
          100% {
            transform: scale(1) translateY(0);
          }
        }
        .animate-confetti-fall {
          animation-name: confettiFall;
          animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
          animation-iteration-count: infinite;
        }
        .animate-celebrate-bounce {
          animation: celebrateBounce 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}
