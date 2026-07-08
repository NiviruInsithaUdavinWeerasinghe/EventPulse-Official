import { useNavigate } from 'react-router-dom';

export default function VendorPortal() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const navCards = [
    {
      icon: '🗺️',
      title: 'Event registration & stall selection',
      desc: 'Browse upcoming events, register your presence, and choose your stall position on the interactive floorplan.',
      label: 'Go to events',
      route: '/events',
      color: 'indigo',
    },
    {
      icon: '🏢',
      title: 'Business profile',
      desc: 'Edit your store details, upload branding assets, update contact info, and manage your public vendor listing.',
      label: 'Edit profile',
      route: '/business/profile',
      color: 'indigo',
    },
    {
      icon: '💳',
      title: 'Checkout system (POS)',
      desc: 'Process transactions, apply discounts, manage your item catalogue, and handle payments at the point of sale.',
      label: 'Open POS',
      route: '/vendor/pos',
      color: 'emerald',
    },
    {
      icon: '📈',
      title: 'Sales performance timeline',
      desc: 'Review your revenue history, track stall performance over time, and export reports across past events.',
      label: 'View analytics',
      route: '/vendor/analytics',
      color: 'amber',
    },
  ];

  const iconStyles = {
    indigo: 'bg-indigo-500/10 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber:   'bg-amber-500/10  border-amber-500/20',
  };

  const arrowStyles = {
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
  };

  return (
    <div className="min-h-screen bg-[#030712]">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06] bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-lg">
            🏪
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100 leading-none mb-0.5">Vendor Portal</p>
            <p className="text-xs text-slate-500">EventPulse Stall Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Approval status badge */}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Approved
          </div>
          <button
            onClick={handleLogout}
            className="bg-transparent border border-red-500/30 text-red-400 px-3.5 py-1.5 rounded-lg text-xs font-medium hover:border-red-400 hover:text-red-300 transition-all"
          >
            Logout
          </button>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────── */}
      <main className="max-w-[860px] mx-auto px-6 py-10">
        <div className="mb-10">
          <h1 className="text-[1.75rem] font-bold text-slate-50 mb-1.5">Welcome back 👋</h1>
          <p className="text-slate-500 text-[0.95rem]">
            Manage your event presence, stalls, and sales all from one place.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-[600px]:grid-cols-1">
          {navCards.map(({ icon, title, desc, label, route, color }) => (
            <div
              key={title}
              onClick={() => navigate(route)}
              className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-7 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/30"
            >
              <div className={`w-11 h-11 rounded-xl border flex items-center justify-center text-xl mb-4 ${iconStyles[color]}`}>
                {icon}
              </div>
              <h3 className="text-[1rem] font-semibold text-slate-50 mb-1.5">{title}</h3>
              <p className="text-slate-500 text-[0.82rem] leading-relaxed">{desc}</p>
              <p className={`mt-5 text-[0.78rem] font-semibold tracking-wide ${arrowStyles[color]}`}>
                {label} →
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}