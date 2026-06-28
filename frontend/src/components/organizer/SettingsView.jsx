import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  Bell, 
  Shield, 
  Save, 
  Building, 
  Globe, 
  Lock,
  CheckCircle2
} from 'lucide-react';

export default function SettingsView() {
  const [profile, setProfile] = useState({
    name: "Alex Mercer",
    role: "Lead Exhibition Coordinator",
    email: "alex.mercer@eventpulse.com",
    phone: "+1 (555) 382-9012",
    company: "EventPulse Events Inc.",
    website: "https://eventpulse.com",
  });

  const [notifications, setNotifications] = useState({
    vendorRegister: true,
    blueprintUpdate: true,
    settlementAudit: false,
    securityAlert: true,
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Workspace Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Configure your personal organizer settings, notification rules, and security preferences.</p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          Settings successfully updated and saved.
        </div>
      )}

      {/* ── Settings Form ───────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Card */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
            <User size={18} className="text-indigo-500" />
            Organizer Profile Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Full Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                value={profile.name}
                onChange={e => setProfile({...profile, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Organizer Title / Role</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                value={profile.role}
                onChange={e => setProfile({...profile, role: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Work Email Address</label>
              <input 
                type="email" 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                value={profile.email}
                onChange={e => setProfile({...profile, email: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Telephone Contact</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                value={profile.phone}
                onChange={e => setProfile({...profile, phone: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Company Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                value={profile.company}
                onChange={e => setProfile({...profile, company: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Website URL</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500"
                value={profile.website}
                onChange={e => setProfile({...profile, website: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Notifications Checkbox Card */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
            <Bell size={18} className="text-amber-500" />
            Alerts & Notification Rules
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="mt-1 peer shrink-0 appearance-none w-4 h-4 border border-slate-350 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 checked:bg-indigo-650 checked:border-indigo-650 focus:outline-none"
                checked={notifications.vendorRegister}
                onChange={e => setNotifications({...notifications, vendorRegister: e.target.checked})}
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 transition-colors">Vendor Registration Requests</span>
                <span className="text-slate-500">Receive alert when a vendor submits registration for stalls approval.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="mt-1 peer shrink-0 appearance-none w-4 h-4 border border-slate-350 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 checked:bg-indigo-650 checked:border-indigo-650 focus:outline-none"
                checked={notifications.blueprintUpdate}
                onChange={e => setNotifications({...notifications, blueprintUpdate: e.target.checked})}
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 transition-colors">Blueprint / Floorplan Logs</span>
                <span className="text-slate-500">Alert me when other co-organizers update or edit the map vectors.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                className="mt-1 peer shrink-0 appearance-none w-4 h-4 border border-slate-350 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 checked:bg-indigo-650 checked:border-indigo-650 focus:outline-none"
                checked={notifications.settlementAudit}
                onChange={e => setNotifications({...notifications, settlementAudit: e.target.checked})}
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-600 transition-colors">Financial Settlements Ledger Updates</span>
                <span className="text-slate-500">Get summaries of transactions payout and tax commissions audits.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Security Settings Card */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm space-y-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3">
            <Shield size={18} className="text-rose-500" />
            Security & Authentication
          </h3>
          
          <div className="space-y-4">
            <button 
              type="button" 
              onClick={() => alert("Change Password modal trigger")}
              className="inline-flex items-center gap-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-800 dark:text-slate-200 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
            >
              <Lock size={14} />
              Change Credentials Password
            </button>
            <p className="text-slate-400 dark:text-slate-500 text-[10px]">Two-Factor auth keys can be managed inside organization profile settings.</p>
          </div>
        </div>

        {/* Actions footer */}
        <div className="flex justify-end gap-3 pt-4">
          <button 
            type="submit"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-5 py-3 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
          >
            <Save size={16} />
            Save Profile Config
          </button>
        </div>

      </form>

      {/* Description tag statement */}
      <div className="text-center pt-8 pb-4">
        <p className="text-orange-500 font-extrabold text-2xl tracking-wide uppercase animate-pulse">
          will give a purpose for this section later
        </p>
      </div>

    </div>
  );
}
