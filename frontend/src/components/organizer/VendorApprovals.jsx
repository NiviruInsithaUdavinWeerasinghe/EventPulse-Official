import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Check, 
  X, 
  Search, 
  Calendar, 
  Briefcase, 
  Eye, 
  Mail, 
  Phone, 
  FileText,
  AlertCircle
} from 'lucide-react';

export default function VendorApprovals() {
  const [vendors, setVendors] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        setEvents(data.data);
        setSelectedEventId(data.data[0]._id);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setIsLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!selectedEventId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/events/applications/event/${selectedEventId}`);
      const data = await res.json();
      if (data.success) {
        const mapped = data.data.map(app => ({
          id: app._id,
          name: app.businessName,
          businessType: app.businessType,
          email: app.email,
          phone: app.phone,
          submittedDate: new Date(app.createdAt || app.submittedDate).toLocaleDateString('en-US'),
          status: app.status,
          description: app.description,
          requestedStall: app.requestedStall,
        }));
        setVendors(mapped);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [selectedEventId]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/events/applications/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVendors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
        if (selectedVendor && selectedVendor.id === id) {
          setSelectedVendor(prev => ({ ...prev, status: newStatus }));
        }
      } else {
        alert(data.message || 'Failed to update application status.');
      }
    } catch (err) {
      console.error('Status change error:', err);
      alert('Network error updating status.');
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          vendor.businessType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          vendor.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeTab === "All" || vendor.status === activeTab;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-zinc-850 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Vendor Approvals</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Review, audit, and approve or reject vendor credentials and stall reservation requests.</p>
        </div>
        
        {events.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">Select Event:</span>
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {events.map(ev => (
                <option key={ev._id} value={ev._id}>{ev.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Tabs & Search bar ────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-zinc-900/40 p-4 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl shadow-xs">
        
        {/* Tab Filters */}
        <div className="flex flex-wrap gap-2">
          {["All", "Pending", "Approved", "Rejected"].map((tab) => {
            const count = tab === "All" 
              ? vendors.length 
              : vendors.filter(v => v.status === tab).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span>{tab}</span>
                <span className={`inline-block px-1.5 py-0.2 text-[10px] rounded-md ${
                  activeTab === tab 
                    ? 'bg-white/20 text-white dark:bg-zinc-900 dark:text-zinc-100' 
                    : 'bg-slate-200 text-slate-700 dark:bg-zinc-900 dark:text-slate-350'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Local Search input */}
        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search vendor / type..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

      </div>

      {/* ── Vendors Grid List ────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <div className="w-8 h-8 border-[3px] border-indigo-500/15 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold">Loading applications...</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 bg-white dark:bg-[#090a0f]/20 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
          <AlertCircle size={28} className="text-slate-400 dark:text-zinc-650 mb-3 animate-pulse" />
          <p className="text-sm font-semibold">No vendor applications found.</p>
          <p className="text-xs text-slate-400 mt-1">There are no applications matching this status filter or event.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredVendors.map((vendor) => {
            const isPending = vendor.status === "Pending";
            const isApproved = vendor.status === "Approved";
            const isRejected = vendor.status === "Rejected";

            return (
              <div 
                key={vendor.id} 
                className={`bg-white dark:bg-zinc-900/40 border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                  isPending 
                    ? 'border-slate-200 dark:border-zinc-850 hover:border-slate-300 dark:hover:border-zinc-750' 
                    : isApproved 
                    ? 'border-emerald-500/10 dark:border-emerald-500/20 bg-emerald-500/[0.01]' 
                    : 'border-rose-500/10 dark:border-rose-500/20 bg-rose-500/[0.01]'
                }`}
              >
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">{vendor.id.substring(vendor.id.length - 6).toUpperCase()}</span>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{vendor.name}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      isPending 
                        ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10' 
                        : isApproved 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                        : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/10'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isPending ? 'bg-amber-500' : isApproved ? 'bg-emerald-500' : 'bg-rose-500'
                      }`} />
                      {vendor.status}
                    </span>
                  </div>

                  {/* Subinfo */}
                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4">
                    <div className="flex items-center gap-2">
                      <Briefcase size={13} className="text-slate-400" />
                      <span>{vendor.businessType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-slate-400" />
                      <span>Submitted: {vendor.submittedDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText size={13} className="text-slate-400" />
                      <span>Requested Booth: <strong className="text-slate-800 dark:text-slate-200">{vendor.requestedStall}</strong></span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-zinc-950 p-3 rounded-lg border border-slate-100 dark:border-zinc-850/50 mb-6 truncate max-w-full">
                    {vendor.description}
                  </p>
                </div>

                {/* Actions panel */}
                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-zinc-800 mt-auto">
                  <button 
                    onClick={() => setSelectedVendor(vendor)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs py-2 rounded-lg cursor-pointer transition-all"
                  >
                    <Eye size={13} />
                    View Details
                  </button>

                  {isPending && (
                    <>
                      <button 
                        onClick={() => handleStatusChange(vendor.id, "Approved")}
                        className="p-2 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                        title="Approve registration"
                      >
                        <Check size={14} />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(vendor.id, "Rejected")}
                        className="p-2 text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
                        title="Reject registration"
                      >
                        <X size={14} />
                      </button>
                    </>
                  )}

                  {!isPending && (
                    <button 
                      onClick={() => handleStatusChange(vendor.id, "Pending")}
                      className="px-2.5 py-2 text-xs font-semibold border border-slate-200 dark:border-zinc-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded-lg cursor-pointer transition-all"
                    >
                      Reset Status
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Vendor Details Modal ────────────────────────────── */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 block">VENDOR APPLICATION</span>
                <h3 className="font-extrabold text-slate-950 dark:text-white text-base">{selectedVendor.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedVendor(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 uppercase">Category</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedVendor.businessType}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 uppercase">Submissions Date</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedVendor.submittedDate}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 uppercase">Requested Stall Location</span>
                  <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedVendor.requestedStall}</span>
                </div>
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 uppercase">Audits Status</span>
                  <span className={`inline-block font-extrabold px-2 py-0.5 rounded-full ${
                    selectedVendor.status === "Pending" ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' :
                    selectedVendor.status === "Approved" ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' :
                    'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                  }`}>{selectedVendor.status}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-3">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Contact Information</span>
                <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    <a href={`mailto:${selectedVendor.email}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">{selectedVendor.email}</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-slate-400" />
                    <span>{selectedVendor.phone}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-2">
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Business Description</span>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-100 dark:border-zinc-850/60">
                  {selectedVendor.description}
                </p>
              </div>
            </div>

            {/* Actions footer */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-zinc-950/60 border-t border-slate-100 dark:border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedVendor(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Close
              </button>
              
              {selectedVendor.status === "Pending" && (
                <>
                  <button 
                    onClick={() => { handleStatusChange(selectedVendor.id, "Rejected"); }}
                    className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
                  >
                    Reject Application
                  </button>
                  <button 
                    onClick={() => { handleStatusChange(selectedVendor.id, "Approved"); }}
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                  >
                    Approve Application
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Description tag statement */}
      <div className="text-center pt-8 pb-4">
        <p className="text-orange-500 font-extrabold text-2xl tracking-wide uppercase animate-pulse">
          for the vendor accounts to be verified when they're registering for an event created by the organizer
        </p>
      </div>

    </div>
  );
}
