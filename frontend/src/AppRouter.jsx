import { useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate as useRouteNavigator } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import { useTheme } from './context/ThemeContext.jsx';
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
import WalletActivated from './pages/WalletActivated.jsx';
import PaymentQR from './pages/PaymentQR.jsx';
import VendorPOS from './pages/VendorPOS.jsx';

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
  const { isDarkMode } = useTheme();
  return (
    <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#030712] text-white' 
        : 'bg-[#f8fafc] text-slate-900'
    }`}>
      {children}
    </div>
  );
}

// ─── Layout wrapper with Navbar ─────────────────────────────────────────────
function MainLayout({ children, currentPage, onNavigate }) {
  return (
    <div>
      <Navbar currentPage={currentPage} onNavigate={onNavigate} />
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
      <Route path="/organizer/dashboard/:tab" element={
        <ProtectedRoute allowedRoles={['organizer']}>
          <OrganizerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/organizer/dashboard/edit-event/:eventId" element={
        <ProtectedRoute allowedRoles={['organizer']}>
          <OrganizerDashboard />
        </ProtectedRoute>
      } />

      {/* Vendor routes (EP-76) */}
      <Route path="/vendor/portal" element={
        <ProtectedRoute allowedRoles={['vendor']}>
          <MainLayout currentPage="vendor-portal" onNavigate={handleNavigate}>
            <VendorPortal />
          </MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/vendor/pos" element={
        <ProtectedRoute allowedRoles={['vendor']}>
          <VendorPOS />
        </ProtectedRoute>
      } />

      {/* Customer routes */}
      <Route path="/customer/dashboard" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <MainLayout currentPage="customer-dashboard" onNavigate={handleNavigate}>
            <CustomerDashboard />
          </MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/customer/list" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <CustomerList />
        </ProtectedRoute>
      } />

      {/* Wallet activation confirmation — customer only */}
      <Route path="/customer/wallet-activated" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <WalletActivated />
        </ProtectedRoute>
      } />

      {/* US-403 / EP-62 — Payment QR token display (customer only) */}
      <Route path="/customer/wallet/pay" element={
        <ProtectedRoute allowedRoles={['customer']}>
          <PaymentQR />
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
