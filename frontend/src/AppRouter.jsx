import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import App from './App.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import MapViewer from './pages/MapViewer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import VendorPortal from './pages/VendorPortal.jsx';
import CustomerList from './pages/CustomerList.jsx';
import ProfileUpdateForm from './components/ProfileUpdateForm.jsx';

// ─── Helper: decode JWT role from localStorage ──────────────────────────────
function getRoleFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check token hasn't expired
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      return null;
    }
    return payload.role || null;
  } catch {
    return null;
  }
}

// ─── Protected Route: redirects to /login if not authenticated ──────────────
function ProtectedRoute({ children, allowedRoles }) {
  const role = getRoleFromToken();

  if (!role) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to their correct dashboard if they hit the wrong route
    if (role === 'organizer') return <Navigate to="/organizer/dashboard" replace />;
    if (role === 'vendor')    return <Navigate to="/vendor/portal" replace />;
    return <Navigate to="/customer/list" replace />;
  }

  return children;
}

// ─── Role-based redirect after login ────────────────────────────────────────
function RoleRedirect() {
  const role = getRoleFromToken();
  if (!role)                  return <Navigate to="/login" replace />;
  if (role === 'organizer')   return <Navigate to="/organizer/dashboard" replace />;
  if (role === 'vendor')      return <Navigate to="/vendor/portal" replace />;
  return <Navigate to="/customer/list" replace />;
}

// ─── Auth layout wrapper ─────────────────────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-6">
      {children}
    </div>
  );
}

// ─── Main app with state-based page router ───────────────────────────────────
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

// ─── Main Router ─────────────────────────────────────────────────────────────
export default function AppRouter() {
  return (
    <Routes>

      {/* Auth pages */}
      <Route path="/login"    element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />

      {/* Role-based redirect after login */}
      <Route path="/dashboard" element={<RoleRedirect />} />

      {/* Organizer routes */}
      <Route path="/organizer/dashboard" element={
        <ProtectedRoute allowedRoles={['organizer']}>
          <OrganizerDashboard />
        </ProtectedRoute>
      } />

      {/* Vendor routes */}
      <Route path="/vendor/portal" element={
        <ProtectedRoute allowedRoles={['vendor']}>
          <VendorPortal />
        </ProtectedRoute>
      } />

      {/* Customer routes */}
      <Route path="/customer/list" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerList />
        </ProtectedRoute>
      } />

      {/* EP-33: Profile update form */}
      <Route path="/business/profile" element={
        <ProtectedRoute allowedRoles={['organizer', 'vendor', 'customer']}>
          <ProfileUpdateForm />
        </ProtectedRoute>
      } />

      {/* All landing/event pages */}
      <Route path="/*" element={<MainApp />} />

    </Routes>
  );
}