import React from 'react';
import './Navbar.css';

export default function Navbar({ currentPage, onNavigate }) {
  return (
    <header className="navbar">
      <div className="logo" onClick={() => onNavigate('landing')} style={{ cursor: 'pointer' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="url(#logoGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <defs>
            <linearGradient id="logoGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
              <stop stopColor="#818cf8"/>
              <stop offset="1" stopColor="#c084fc"/>
            </linearGradient>
          </defs>
        </svg>
        EventPulse
      </div>
      <nav className="nav-links">
        <a
          href="#"
          className={`nav-link ${currentPage === 'landing' ? 'nav-link--active' : ''}`}
          onClick={(e) => { e.preventDefault(); onNavigate('landing'); }}
        >
          Home
        </a>
        <a
          href="#"
          className={`nav-link ${currentPage === 'events' ? 'nav-link--active' : ''}`}
          onClick={(e) => { e.preventDefault(); onNavigate('events'); }}
        >
          Events
        </a>
        <button
          id="create-event-nav-btn"
          className={`btn-secondary ${currentPage === 'create-event' ? 'btn-secondary--active' : ''}`}
          onClick={() => onNavigate('create-event')}
        >
          Create Event
        </button>
      </nav>
    </header>
  );
}
