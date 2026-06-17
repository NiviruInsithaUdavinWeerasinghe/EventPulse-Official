import React from 'react';

export default function Navbar({ currentPage, onNavigate }) {
  return (
    <header className="flex justify-between items-center py-6 border-b border-white/5">
      {/* Logo */}
      <div
        className="flex items-center gap-2 cursor-pointer gradient-text-brand text-2xl font-extrabold"
        onClick={() => onNavigate('landing')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="logoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818cf8"/><stop offset="1" stopColor="#c084fc"/>
            </linearGradient>
          </defs>
        </svg>
        EventPulse
      </div>

      {/* Nav links */}
      <nav className="flex items-center gap-8">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}
          className={`text-sm font-medium transition-colors duration-200 no-underline ${
            currentPage === 'landing' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-50'
          }`}
        >
          Home
        </a>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate('events'); }}
          className={`text-sm font-medium transition-colors duration-200 no-underline ${
            currentPage === 'events' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-50'
          }`}
        >
          Events
        </a>
        <button
          id="create-event-nav-btn"
          onClick={() => onNavigate('create-event')}
          className={`px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all duration-200 cursor-pointer font-[inherit] ${
            currentPage === 'create-event'
              ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
              : 'bg-white/[0.03] border-white/10 text-slate-50 hover:bg-white/[0.08] hover:border-white/20'
          }`}
        >
          Create Event
        </button>
      </nav>
    </header>
  );
}
