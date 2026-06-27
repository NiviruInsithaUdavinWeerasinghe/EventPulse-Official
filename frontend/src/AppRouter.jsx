import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import App from './App.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import MapViewer from './pages/MapViewer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';

// ── Role-based route guard ───────────────────────────────
// Reads token + user from localStorage; redirects to /login when missing.
// When allowedRoles is provided it also checks the stored role.
function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;

  if (allowedRoles && allowedRoles.length > 0) {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      const role = stored.role || 'customer';
      if (!allowedRoles.includes(role)) return <Navigate to="/login" replace />;
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

// ── Smart /dashboard redirect based on stored role ───────
function DashboardRedirect() {
  try {
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const role = stored.role || 'customer';
    if (role === 'customer')  return <Navigate to="/customer/dashboard" replace />;
    if (role === 'organizer') return <Navigate to="/organizer/dashboard" replace />;
    if (role === 'vendor')    return <Navigate to="/vendor/dashboard" replace />;
  } catch { /* fall-through */ }
  return <Navigate to="/" replace />;
}

// Wrapper for login/register — centred on a dark full-page layout
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
      {/* Auth pages */}
      <Route path="/login"    element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />

      {/* Smart redirect based on role */}
      <Route path="/dashboard" element={<DashboardRedirect />} />

      {/* ── Customer portal ── */}
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Organizer / vendor dashboards (placeholders — wired up in future subtasks) */}
      <Route path="/organizer/dashboard" element={<ProtectedRoute allowedRoles={['organizer']}><div className="min-h-screen flex items-center justify-center text-white">Organizer Dashboard — coming soon</div></ProtectedRoute>} />
      <Route path="/vendor/dashboard"    element={<ProtectedRoute allowedRoles={['vendor']}><div className="min-h-screen flex items-center justify-center text-white">Vendor Dashboard — coming soon</div></ProtectedRoute>} />

      {/* All public pages live at / */}
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}

