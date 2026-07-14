import { useState, useEffect, useCallback } from 'react';
import { MapPin, Trash2, Radio, Loader2, Plus, X, Target, AlertCircle } from 'lucide-react';

/**
 * EP-126: Vendor Ad Dashboard UI
 * Lets a vendor create, view, toggle, and delete location-based ads
 * that trigger for attendees within a set GPS radius of their stall.
 */
export default function VendorAdDashboard() {
  const [ads, setAds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [toast, setToast] = useState(null);

  // The vendor's approved stall — pulled automatically, no manual eventId needed
  const [approvedStall, setApprovedStall] = useState(null);
  const [isLoadingStall, setIsLoadingStall] = useState(true);

  const [form, setForm] = useState({
    title: '',
    message: '',
    latitude: '',
    longitude: '',
    radiusMeters: 50,
  });

  const loggedInUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Find the vendor's approved stall application to get a real eventId ────
  const fetchApprovedStall = useCallback(async () => {
    if (!loggedInUser.id) return;
    try {
      const res = await fetch(`/api/vendors/applications/vendor/${loggedInUser.id}`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        const approved = data.data.find((app) => app.status === 'Approved');
        setApprovedStall(approved || null);
      }
    } catch (err) {
      console.error('Error fetching vendor stall:', err);
    } finally {
      setIsLoadingStall(false);
    }
  }, [loggedInUser.id]);

  const fetchAds = useCallback(async () => {
    if (!loggedInUser.id) return;
    try {
      const res = await fetch(`/api/vendor-ads/vendor/${loggedInUser.id}`);
      const data = await res.json();
      if (data.success) setAds(data.data);
    } catch (err) {
      console.error('Error fetching ads:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loggedInUser.id]);

  useEffect(() => {
    fetchApprovedStall();
    fetchAds();
  }, [fetchApprovedStall, fetchAds]);

  // EP-126: Capture the vendor's current GPS position as the ad's geofence anchor
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported on this device.', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setIsLocating(false);
      },
      () => {
        showToast('Could not get your location. Check browser permissions.', 'error');
        setIsLocating(false);
      }
    );
  };

  const handleCreateAd = async (e) => {
    e.preventDefault();
    if (!form.latitude || !form.longitude) {
      showToast('Set your stall location before saving.', 'error');
      return;
    }
    if (!approvedStall) {
      showToast('You need an approved stall before creating ads.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/vendor-ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: approvedStall.eventId?._id || approvedStall.eventId,
          vendorId: loggedInUser.id,
          stallId: approvedStall.requestedStall,
          title: form.title,
          message: form.message,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude),
          radiusMeters: Number(form.radiusMeters),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Ad created! It will trigger for attendees nearby.');
        setForm({ title: '', message: '', latitude: '', longitude: '', radiusMeters: 50 });
        setIsFormOpen(false);
        fetchAds();
      } else {
        showToast(data.message || 'Failed to create ad.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error creating ad.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (ad) => {
    try {
      await fetch(`/api/vendor-ads/${ad._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ad.isActive }),
      });
      fetchAds();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAd = async (id) => {
    try {
      await fetch(`/api/vendor-ads/${id}`, { method: 'DELETE' });
      showToast('Ad deleted.');
      fetchAds();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] p-6">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Radio className="w-6 h-6 text-indigo-400" />
              Proximity Ads
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create location-based promotions that notify attendees when they're near your stall.
            </p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            disabled={isLoadingStall || !approvedStall}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            New Ad
          </button>
        </div>

        {/* Warning if no approved stall yet */}
        {!isLoadingStall && !approvedStall && (
          <div className="flex items-start gap-3 p-4 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              You need an approved stall application before creating proximity ads. Apply for a stall on the event map first.
            </p>
          </div>
        )}

        {/* Ad list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading ads...
          </div>
        ) : ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-600 border border-white/[0.06] rounded-2xl bg-white/[0.02]">
            <Target className="w-8 h-8 opacity-40" />
            <p className="text-sm">No proximity ads yet. Create your first one!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {ads.map((ad) => (
              <div
                key={ad._id}
                className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        ad.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                          : 'bg-slate-500/15 text-slate-500 border border-slate-500/25'
                      }`}
                    >
                      {ad.isActive ? 'Active' : 'Paused'}
                    </span>
                    <span className="text-[0.65rem] text-slate-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {ad.radiusMeters}m radius
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100">{ad.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{ad.message}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActive(ad)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-white/10 text-slate-300 hover:bg-white/[0.06] transition cursor-pointer"
                  >
                    {ad.isActive ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    onClick={() => deleteAd(ad._id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Ad Modal */}
      {isFormOpen && (
        <div
          className="fixed inset-0 bg-[#030712]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="bg-[#0b0f19] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">New Proximity Ad</h2>
            {approvedStall && (
              <p className="text-xs text-slate-500 mb-4">
                For stall <span className="text-indigo-400 font-semibold">{approvedStall.requestedStall}</span>
              </p>
            )}

            <form onSubmit={handleCreateAd} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Ad Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. 20% Off Today Only!"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Message</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Come say hi and grab a discount at our stall!"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Stall Location</label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isLocating}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-white/[0.03] border border-white/[0.08] rounded-lg text-sm text-indigo-300 hover:bg-white/[0.06] transition cursor-pointer disabled:opacity-50"
                >
                  {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                  {isLocating ? 'Getting location...' : form.latitude ? 'Location set ✓' : 'Use my current location'}
                </button>
                {form.latitude && (
                  <p className="text-[0.65rem] text-slate-600 mt-1 font-mono">
                    {form.latitude}, {form.longitude}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Trigger Radius: {form.radiusMeters}m
                </label>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={form.radiusMeters}
                  onChange={(e) => setForm({ ...form, radiusMeters: e.target.value })}
                  className="w-full accent-indigo-500"
                />
                <div className="flex justify-between text-[0.6rem] text-slate-600 mt-1">
                  <span>5m (very close)</span>
                  <span>500m (wide area)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 mt-1"
              >
                {isSaving ? 'Saving...' : 'Create Ad'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border z-[100] ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/30 text-rose-100'
              : 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}