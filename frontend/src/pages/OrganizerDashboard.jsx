import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Map, 
  Users, 
  DollarSign, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Menu, 
  X, 
  Search, 
  Bell, 
  ChevronDown, 
  CheckCircle,
  AlertCircle,
  FileText,
  User
} from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import Navbar from '../components/Navbar.jsx';

// Import sub-pages components
import MainDashboard from '../components/organizer/MainDashboard.jsx';
import EventManagement from '../components/organizer/EventManagement.jsx';
import BlueprintUploads from '../components/organizer/BlueprintUploads.jsx';
import VendorApprovals from '../components/organizer/VendorApprovals.jsx';
import SettlementAudit from '../components/organizer/SettlementAudit.jsx';
import SettingsView from '../components/organizer/SettingsView.jsx';
import SupportView from '../components/organizer/SupportView.jsx';
import CreateEvent from './CreateEvent.jsx';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const { tab, eventId } = useParams();

  // Active tab parser
  let activeTab = tab || 'dashboard';
  if (window.location.pathname.includes('/edit-event/')) {
    activeTab = 'edit-event';
  }
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const setActiveTab = (newTab) => {
    navigate(`/organizer/dashboard/${newTab}`);
  };

  // Dropdown states
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Dark/Light Mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply dark mode theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  // Adjust body background color dynamically for smooth background aesthetics
  useEffect(() => {
    const originalBg = document.body.style.background;
    const originalColor = document.body.style.color;

    document.body.style.background = isDarkMode ? '#090a0f' : '#f8fafc';
    document.body.style.color = isDarkMode ? '#f8fafc' : '#0f172a';

    return () => {
      document.body.style.background = originalBg;
      document.body.style.color = originalColor;
    };
  }, [isDarkMode]);

  // Close dropdowns on outside clicks
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsNotificationsOpen(false);
      setIsProfileOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateEvent = () => {
    navigate('/create-event');
  };

  const handleViewEvents = () => {
    navigate('/events');
  };

  // Date formatting
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Alerts mock database
  const alerts = [
    { id: 1, type: 'vendor', msg: "New vendor 'Spark Electronics' requested a stall A-12.", time: "10 mins ago", read: false },
    { id: 2, type: 'blueprint', msg: "Hall B layout updated to version 2.4.", time: "2 hours ago", read: false },
    { id: 3, type: 'audit', msg: "Tax commission checks completed for May.", time: "1 day ago", read: true },
  ];

  // Navigation items mapping
  const mainNavs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Event Management', icon: Calendar },
    { id: 'blueprints', label: 'Blueprint / Map Uploads', icon: Map },
    { id: 'approvals', label: 'Vendor Approvals', icon: Users, badge: 2 },
    { id: 'settlements', label: 'Settlement Audit Panel', icon: DollarSign },
  ];

  const utilityNavs = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  // Get active tab heading name
  const activeTabName = activeTab === 'edit-event' ? 'Edit Event Details' : ([...mainNavs, ...utilityNavs].find(n => n.id === activeTab)?.label || 'Workspace');

  // Fetch dynamic user profile from localStorage
  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem('user')) || { fullName: 'Organizer User' };
    } catch {
      return { fullName: 'Organizer User' };
    }
  };
  const profileUser = getUserData();
  const initials = profileUser.fullName ? profileUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'OU';

  // Sidebar Component Wrapper
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200/80 dark:border-zinc-900/80 text-slate-800 dark:text-zinc-400 p-5 select-none">
      
      {/* ── Brand Logo ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-2 py-4 mb-6">
        <div className="w-8 h-8 rounded-lg bg-indigo-650 flex items-center justify-center text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </div>
        <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">EventPulse</span>
      </div>

      {/* ── Organizer Profile ────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-900/80 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-xs">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{profileUser.fullName}</h4>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">Lead Coordinator</p>
        </div>
      </div>

      {/* ── Main Navigation List ─────────────────────────── */}
      <nav className="flex-1 space-y-1.5">
        {mainNavs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                isActive 
                  ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/10' 
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/80 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-150'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[9px] rounded-md ${
                  isActive ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className="h-px bg-slate-200/60 dark:bg-zinc-900/80 my-4" />

        {/* Utility items */}
        {utilityNavs.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all ${
                isActive 
                  ? 'bg-indigo-650 text-white shadow-md' 
                  : 'hover:bg-slate-100 dark:hover:bg-zinc-900/80 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-150'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Logout Trigger ───────────────────────────────── */}
      <button 
        onClick={() => setIsLogoutModalOpen(true)}
        className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-600 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 font-bold text-xs cursor-pointer transition-all border border-transparent hover:border-rose-500/10 mt-auto"
      >
        <LogOut size={16} />
        <span>Logout Session</span>
      </button>

    </div>
  );

  // Active Tab Subpage Renderer
  const renderTabContent = () => {
    switch(activeTab) {
      case 'dashboard':
        return <MainDashboard setActiveTab={setActiveTab} searchQuery={searchQuery} />;
      case 'events':
        return <EventManagement searchQuery={searchQuery} />;
      case 'create-event':
        return <CreateEvent onNavigate={(target) => navigate(`/organizer/dashboard/events`)} />;
      case 'edit-event':
        return <CreateEvent onNavigate={(target) => navigate(`/organizer/dashboard/events`)} />;
      case 'blueprints':
        return <BlueprintUploads />;
      case 'approvals':
        return <VendorApprovals />;
      case 'settlements':
        return <SettlementAudit />;
      case 'settings':
        return <SettingsView />;
      case 'help':
        return <SupportView />;
      default:
        return <MainDashboard setActiveTab={setActiveTab} searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 dark:bg-[#090a0f] dark:text-zinc-100 transition-colors duration-300 flex">
      
      {/* ── Desktop Sidebar ────────────────────────────────── */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* ── Collapsible Mobile Sidebar Drawer ────────────────── */}
      <div 
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto bg-slate-950/40 dark:bg-black/60 backdrop-blur-xs' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileSidebarOpen(false)}
      >
        <div 
          className={`w-64 max-w-[80vw] h-full transition-transform duration-300 transform ${
            isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <SidebarContent />
        </div>
      </div>

      {/* ── Main Content Area Layout ────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Unified Global Navigation Header */}
        <Navbar currentPage={`organizer-${activeTab}`} onNavigate={(page) => {
          if (page === 'landing') navigate('/');
          else if (page === 'events') navigate('/events');
        }} />

        {/* Scrollable Workspace Content Frame */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {renderTabContent()}
          </div>
        </main>

      </div>

      {/* ── Logout Confirm Modal ────────────────────────────── */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-xl p-6 text-center space-y-4 animate-slide-up">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white">Confirm Workspace Logout</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Are you sure you want to end your current session? You will be redirected to the login panel.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2.5 text-xs font-semibold border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
              >
                Keep Session
              </button>
              <button 
                onClick={handleLogout}
                className="flex-1 py-2.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer transition-colors"
              >
                Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}