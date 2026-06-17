import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import App from './App.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import MapViewer from './pages/MapViewer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Wrapper for Evan's login/register — centred on a dark full-page layout
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-6">
      {children}
    </div>
  );
}

// Main app with our state-based page router
function MainApp() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const navigate = (page, eventId = null) => {
    setCurrentPage(page);
    if (eventId) setSelectedEventId(eventId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isMapViewer = currentPage === 'map-viewer';

  const renderPage = () => {
    switch (currentPage) {
      case 'events':
        return <EventsPage onNavigate={navigate} />;
      case 'create-event':
        return <CreateEvent onNavigate={navigate} />;
      case 'map-viewer':
        return <MapViewer eventId={selectedEventId} onNavigate={navigate} />;
      default:
        return <App onNavigate={navigate} />;
    }
  };

  return (
    <div>
      {!isMapViewer && (
        <div className="max-w-[1200px] mx-auto px-6">
          <Navbar currentPage={currentPage} onNavigate={navigate} />
        </div>
      )}
      {isMapViewer
        ? <MapViewer eventId={selectedEventId} onNavigate={navigate} />
        : renderPage()
      }
    </div>
  );
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Evan's auth pages */}
      <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />

      {/* After login, Evan navigates to /dashboard — redirect to landing for now */}
      <Route path="/dashboard" element={<Navigate to="/" replace />} />

      {/* All our pages live at / */}
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}
