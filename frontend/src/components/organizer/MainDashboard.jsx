import React from 'react';
import { 
  Calendar, 
  Users, 
  Map, 
  DollarSign, 
  Plus, 
  Upload, 
  CheckSquare, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

export default function MainDashboard({ setActiveTab, searchQuery }) {
  // Stats cards data
  const stats = [
    {
      title: "Total Events",
      value: "14",
      change: "+2 this month",
      changeType: "positive",
      icon: Calendar,
      color: "indigo",
      desc: "Active and upcoming events scheduled",
    },
    {
      title: "Pending Approvals",
      value: "6",
      change: "+3 new today",
      changeType: "alert",
      icon: Users,
      color: "emerald",
      desc: "Vendor applications awaiting audit",
    },
    {
      title: "Uploaded Blueprints",
      value: "8",
      change: "All systems validated",
      changeType: "neutral",
      icon: Map,
      color: "amber",
      desc: "Interactive stall maps registered",
    },
    {
      title: "Settlement Reports",
      value: "$54,250",
      change: "+12.4% vs last event",
      changeType: "positive",
      icon: DollarSign,
      color: "rose",
      desc: "Audited merchant sales & payouts",
    },
  ];

  // Activities list
  const activities = [
    {
      id: 1,
      title: "Vendor registration submitted",
      user: "Gourmet Street Food Corp",
      time: "10 mins ago",
      status: "pending",
      badge: "Approvals",
    },
    {
      id: 2,
      title: "Blueprint layout draft updated",
      user: "Hall B - Winter Fest v2.4",
      time: "2 hours ago",
      status: "info",
      badge: "Blueprints",
    },
    {
      id: 3,
      title: "New Event published & tickets live",
      user: "Global Tech Summit 2026",
      time: "1 day ago",
      status: "success",
      badge: "Events",
    },
    {
      id: 4,
      title: "Settlement audit finalized",
      user: "Payout to PixelCraft Studio",
      time: "2 days ago",
      status: "success",
      badge: "Settlements",
    },
  ];

  // Sample Events
  const events = [
    {
      id: "ev-1",
      name: "Global Tech Summit 2026",
      venue: "Metro Convention Hall A",
      date: "Oct 15, 2026",
      status: "Live",
      color: "emerald",
    },
    {
      id: "ev-2",
      name: "National Food & Wine Expo",
      venue: "Pavilion 4 & 5",
      date: "Nov 02, 2026",
      status: "Scheduled",
      color: "indigo",
    },
    {
      id: "ev-3",
      name: "Art & Craft Festival Autumn",
      venue: "Open Plaza Gardens",
      date: "Dec 12, 2026",
      status: "Draft",
      color: "amber",
    },
    {
      id: "ev-4",
      name: "Winter Fashion Runway",
      venue: "Grand Ballroom, Ritz",
      date: "Jan 18, 2027",
      status: "Scheduled",
      color: "indigo",
    },
  ];

  // Filter events based on search query
  const filteredEvents = events.filter(event => 
    event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.venue.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ── Welcome Banner ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-100 dark:border-indigo-950/40 bg-gradient-to-r from-indigo-50 via-purple-50 to-white dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-zinc-950 p-8 shadow-sm">
        <div className="absolute right-0 top-0 -mr-6 -mt-6 w-48 h-48 rounded-full bg-indigo-200/20 dark:bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 -mb-10 w-36 h-36 rounded-full bg-purple-200/20 dark:bg-purple-500/10 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Organizer Workspace Active
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Welcome back, Organizer 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed mb-6">
            Manage your events, vendor credentials, venue interactive blueprint maps, and audit financial settlements all from one integrated dashboard.
          </p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setActiveTab('events')} 
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Plus size={16} />
              Create Event
            </button>
            <button 
              onClick={() => setActiveTab('blueprints')} 
              className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-800 font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Upload size={16} />
              Upload Floorplan
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isPositive = stat.changeType === 'positive';
          const isAlert = stat.changeType === 'alert';

          const colorTheme = {
            indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
            emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
            rose: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
          }[stat.color];

          const hoverBorder = {
            indigo: 'hover:border-indigo-500/30',
            emerald: 'hover:border-emerald-500/30',
            amber: 'hover:border-amber-500/30',
            rose: 'hover:border-rose-500/30',
          }[stat.color];

          return (
            <div 
              key={idx}
              className={`group bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 transition-all duration-300 ${hoverBorder} hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-black/20 hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl border ${colorTheme}`}>
                  <Icon size={22} />
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isPositive 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                    : isAlert
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{stat.title}</p>
              <h3 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">{stat.value}</h3>
              <p className="text-slate-400 dark:text-slate-500 text-[0.78rem]">{stat.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ── Quick Actions Section ────────────────────────── */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
          <span>Quick Console Actions</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Create New Event", tab: "events", icon: Plus, color: "indigo", bg: "from-indigo-500/10 to-indigo-500/5", border: "border-indigo-500/20 hover:border-indigo-500/40 text-indigo-600 dark:text-indigo-400" },
            { title: "Upload Blueprint Map", tab: "blueprints", icon: Upload, color: "amber", bg: "from-amber-500/10 to-amber-500/5", border: "border-amber-500/20 hover:border-amber-500/40 text-amber-600 dark:text-amber-400" },
            { title: "Review Vendor Requests", tab: "approvals", icon: Users, color: "emerald", bg: "from-emerald-500/10 to-emerald-500/5", border: "border-emerald-500/20 hover:border-emerald-500/40 text-emerald-600 dark:text-emerald-400" },
            { title: "Open Settlement Audit", tab: "settlements", icon: TrendingUp, color: "rose", bg: "from-rose-500/10 to-rose-500/5", border: "border-rose-500/20 hover:border-rose-500/40 text-rose-600 dark:text-rose-400" },
          ].map((act, idx) => {
            const Icon = act.icon;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(act.tab)}
                className={`flex items-center justify-between p-5 rounded-2xl bg-gradient-to-br ${act.bg} border ${act.border} hover:shadow-md transition-all active:scale-[0.98] cursor-pointer text-left w-full group`}
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:underline">{act.title}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs">Access panel dashboard</p>
                </div>
                <div className={`p-2 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200/50 dark:border-zinc-800/80 group-hover:scale-110 transition-transform ${act.text}`}>
                  <Icon size={18} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Content Grid (Activity + Events) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Upcoming Events (Span 2) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Active & Scheduled Events</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Overview of active exhibition registries</p>
            </div>
            <button 
              onClick={() => setActiveTab('events')}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              View All
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Event Details</th>
                  <th className="pb-3 px-4">Venue location</th>
                  <th className="pb-3 px-4">Timeline</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                {filteredEvents.length > 0 ? (
                  filteredEvents.map((evt) => (
                    <tr key={evt.id} className="group hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                      <td className="py-3.5 pr-4">
                        <span className="font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{evt.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">ID: {evt.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-normal text-slate-500 dark:text-slate-400">{evt.venue}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-500 dark:text-slate-400">{evt.date}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          evt.status === 'Live' 
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                            : evt.status === 'Scheduled' 
                            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            evt.status === 'Live' ? 'bg-emerald-500' : evt.status === 'Scheduled' ? 'bg-indigo-500' : 'bg-amber-500'
                          }`} />
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button 
                          onClick={() => setActiveTab('events')}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400 dark:text-slate-500">
                      No events found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Recent Activity</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Real-time coordinator updates</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 cursor-pointer">
              <MoreVertical size={14} />
            </button>
          </div>

          <div className="relative flex-1">
            {/* Timeline line */}
            <div className="absolute left-[13px] top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-zinc-800" />
            
            <div className="space-y-6 relative z-10">
              {activities.map((act) => {
                const statusColor = {
                  pending: 'bg-amber-500 ring-amber-100 dark:ring-amber-500/20',
                  info: 'bg-indigo-500 ring-indigo-100 dark:ring-indigo-500/20',
                  success: 'bg-emerald-500 ring-emerald-100 dark:ring-emerald-500/20',
                }[act.status];

                const badgeColor = {
                  Approvals: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  Blueprints: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  Events: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
                  Settlements: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400',
                }[act.badge];

                return (
                  <div key={act.id} className="flex gap-4 items-start text-xs">
                    <div className={`w-2.5 h-2.5 rounded-full ${statusColor} ring-4 mt-1.5 shrink-0`} />
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{act.title}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0">{act.time}</span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 leading-normal">{act.user}</p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${badgeColor}`}>
                        {act.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
