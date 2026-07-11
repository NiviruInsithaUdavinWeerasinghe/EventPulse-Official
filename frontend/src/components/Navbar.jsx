import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

function getRoleFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return payload.role || null;
  } catch {
    return null;
  }
}

function getUserData() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export default function Navbar({ currentPage, onNavigate }) {
  const navigate = useNavigate();
  const role = getRoleFromToken();
  const user = getUserData();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDarkMode, toggleDarkMode } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setDropdownOpen(false);
    navigate('/login');
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define theme colors (unified style for all roles and pages)
  const getRoleTheme = () => {
    return {
      headerBorder: 'border-white/5 bg-[#030712]/70',
      logoText: 'text-white',
      logoFill: '#818cf8',
      buttonBg: 'bg-white/[0.03] border-white/10 text-slate-50 hover:bg-white/[0.08] hover:border-white/20'
    };
  };

  const theme = getRoleTheme();
  const firstLetter = user && user.fullName ? user.fullName[0].toUpperCase() : 'U';

  return (
    <header className={`border-b backdrop-blur-md sticky top-0 z-40 transition-colors duration-300 ${theme.headerBorder}`}>
      <div className="w-full max-w-[1200px] mx-auto px-6 flex justify-between items-center py-5">
        {/* Logo */}
        <div
          className={`flex items-center gap-2.5 cursor-pointer text-2xl font-extrabold tracking-tight ${theme.logoText}`}
          onClick={() => onNavigate('landing')}
        >
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/10"
            style={{ background: theme.logoFill }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span>EventPulse</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-8">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}
            className={`text-sm font-semibold transition-colors duration-200 no-underline ${
              currentPage === 'landing' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-50'
            }`}
          >
            Home
          </a>
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onNavigate('events'); }}
            className={`text-sm font-semibold transition-colors duration-200 no-underline ${
              currentPage === 'events' ? 'text-slate-50' : 'text-slate-400 hover:text-slate-50'
            }`}
          >
            Events
          </a>
          {role === 'customer' && (
            <Link
              to="/customer/dashboard"
              className="text-sm font-semibold text-slate-400 hover:text-slate-50 transition-colors duration-200 no-underline"
            >
              My Wallet
            </Link>
          )}
          {role === 'vendor' && (
            <Link
              to="/vendor/portal"
              className="text-sm font-semibold text-slate-400 hover:text-slate-50 transition-colors duration-200 no-underline"
            >
              Portal
            </Link>
          )}
          {role === 'organizer' && (
            <Link
              to="/organizer/dashboard"
              className="text-sm font-semibold text-slate-400 hover:text-slate-50 transition-colors duration-200 no-underline"
            >
              Console
            </Link>
          )}
          <ThemeToggle isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
          {role ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200 cursor-pointer text-slate-300 hover:text-white"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                  {firstLetter}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user?.fullName?.split(' ')[0] || 'Account'}</span>
                <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2.5 window-dropdown w-60 rounded-2xl border border-white/10 bg-[#0b0f19] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-fade-in z-50">
                  <div className="border-b border-white/5 pb-3 mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Logged in as</p>
                    <p className="text-sm font-bold text-white truncate">{user?.fullName || 'User'}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-white/[0.02]">
                      <span className="text-slate-500 font-medium">Role</span>
                      <span className="font-semibold text-indigo-400 uppercase tracking-wider text-[10px] bg-indigo-500/10 px-2 py-0.5 rounded">{role}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/[0.04] transition-all no-underline"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all text-left bg-transparent border-none cursor-pointer font-[inherit]"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="text-sm font-semibold text-slate-400 hover:text-slate-50 transition-colors duration-200 no-underline"
            >
              Login
            </Link>
          )}
          {role === 'organizer' && (
            <button
              id="create-event-nav-btn"
              onClick={() => navigate('/organizer/dashboard/create-event')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-lg border transition-all duration-200 cursor-pointer font-[inherit] ${theme.buttonBg}`}
            >
              Create Event
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
