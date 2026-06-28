import { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate as useRouteNavigator } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import App from './App.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import MapViewer from './pages/MapViewer.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
// From main (EP-76, EP-33)
import OrganizerDashboard from './pages/OrganizerDashboard.jsx';
import VendorPortal from './pages/VendorPortal.jsx';
import CustomerList from './pages/CustomerList.jsx';
import ProfileUpdateForm from './components/ProfileUpdateForm.jsx';
// US-105-SUB-12: full customer portal home
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import EventDetails from './pages/EventDetails.jsx';
import Checkout from './pages/Checkout.jsx';

// ─── Helper: decode JWT role from localStorage ──────────────────────────────
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

// ─── Protected Route: redirects to /login if not authenticated ──────────────
function ProtectedRoute({ children, allowedRoles }) {
  const role = getRoleFromToken();

  if (!role) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'organizer') return <Navigate to="/organizer/dashboard" replace />;
    if (role === 'vendor')    return <Navigate to="/vendor/portal" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }

  return children;
}

// ─── Role-based redirect after login ────────────────────────────────────────
function RoleRedirect() {
  const role = getRoleFromToken();
  if (!role)                  return <Navigate to="/login" replace />;
  if (role === 'organizer')   return <Navigate to="/organizer/dashboard" replace />;
  if (role === 'vendor')      return <Navigate to="/vendor/portal" replace />;
  return <Navigate to="/customer/dashboard" replace />;
}

// ─── Auth layout wrapper ─────────────────────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] p-6">
      {children}
    </div>
  );
}

// ─── Layout wrapper with Navbar ─────────────────────────────────────────────
function MainLayout({ children, currentPage, onNavigate }) {
  return (
    <div>
      <div className="max-w-[1200px] mx-auto px-6">
        <Navbar currentPage={currentPage} onNavigate={onNavigate} />
      </div>
      {children}
    </div>
  );
}

// ─── Main Router ─────────────────────────────────────────────────────────────
export default function AppRouter() {
  const navigate = useRouteNavigator();
  const location = useLocation();

  const handleNavigate = (page, eventId = null) => {
    if (page === 'landing') {
      navigate('/');
    } else if (page === 'events') {
      navigate('/events');
    } else if (page === 'create-event') {
      navigate('/create-event');
    } else if (page === 'map-viewer' && eventId) {
      navigate(`/map-viewer/${eventId}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageKey = () => {
    const path = location.pathname;
    if (path === '/') return 'landing';
    if (path.startsWith('/events')) return 'events';
    if (path === '/create-event') return 'create-event';
    if (path.startsWith('/map-viewer')) return 'map-viewer';
    return '';
  };

  return (
    <Routes>
      {/* Auth pages */}
      <Route path="/login"    element={<AuthLayout><Login /></AuthLayout>} />
      <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />

      {/* Role-based redirect after login — /dashboard acts as a smart dispatcher */}
      <Route path="/dashboard" element={<RoleRedirect />} />

      {/* Organizer routes (EP-76) */}
      <Route path="/organizer/dashboard" element={
        <ProtectedRoute allowedRoles={['organizer']}>
          <OrganizerDashboard />
        </ProtectedRoute>
      } />

      {/* Vendor routes (EP-76) */}
      <Route path="/vendor/portal" element={
        <ProtectedRoute allowedRoles={['vendor']}>
          <VendorPortal />
        </ProtectedRoute>
      } />

      {/* Customer routes */}
      <Route path="/customer/dashboard" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/customer/list" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerList />
        </ProtectedRoute>
      } />

      {/* EP-33: Business profile update form */}
      <Route path="/business/profile" element={
        <ProtectedRoute allowedRoles={['organizer', 'vendor', 'customer']}>
          <ProfileUpdateForm />
        </ProtectedRoute>
      } />

      {/* Main Pages with Navbar and clean routing URL structures */}
      <Route path="/" element={
        <MainLayout currentPage={getPageKey()} onNavigate={handleNavigate}>
          <App onNavigate={handleNavigate} />
        </MainLayout>
      } />

      <Route path="/events" exact element={
        <MainLayout currentPage={getPageKey()} onNavigate={handleNavigate}>
          <EventsPage onNavigate={handleNavigate} />
        </MainLayout>
      } />

      <Route path="/events/:id" exact element={
        <MainLayout currentPage={getPageKey()} onNavigate={handleNavigate}>
          <EventDetails />
        </MainLayout>
      } />

      <Route path="/events/:id/checkout" exact element={
        <ProtectedRoute allowedRoles={['customer']}>
          <MainLayout currentPage={getPageKey()} onNavigate={handleNavigate}>
            <Checkout />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/create-event" element={
        <ProtectedRoute allowedRoles={['organizer']}>
          <MainLayout currentPage={getPageKey()} onNavigate={handleNavigate}>
            <CreateEvent onNavigate={handleNavigate} />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/map-viewer/:eventId" element={
        <MapViewerWrapper onNavigate={handleNavigate} />
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Wrapper for MapViewer to parse params correctly
import { useParams } from 'react-router-dom';
function MapViewerWrapper({ onNavigate }) {
  const { eventId } = useParams();
  return <MapViewer eventId={eventId} onNavigate={onNavigate} />;
}
