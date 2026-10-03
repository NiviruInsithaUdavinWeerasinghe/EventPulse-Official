import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Plus, 
  Trash2, 
  QrCode, 
  Download, 
  Printer, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  RefreshCw,
  X,
  ExternalLink,
  Gift
} from 'lucide-react';

export default function ScavengerQuestManager() {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    locationHint: '',
    code: '',
    points: 1
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch organizer codes
  const fetchCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/scavenger/admin/codes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCodes(data.codes || []);
      }
    } catch (err) {
      console.error('Failed to load scavenger codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  // Handle quest creation
  const handleCreateQuest = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.title.trim()) {
      setErrorMsg('Quest title is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/scavenger/admin/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMsg('Scavenger quest created successfully!');
        setFormData({ title: '', locationHint: '', code: '', points: 1 });
        setIsCreateModalOpen(false);
        fetchCodes();
      } else {
        setErrorMsg(data.message || 'Failed to create quest code.');
      }
    } catch (err) {
      console.error('Error creating quest:', err);
      setErrorMsg('Network error. Failed to create quest.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle delete
  const handleDeleteCode = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete quest checkpoint: "${title}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/scavenger/admin/codes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setCodes(prev => prev.filter(c => c._id !== id));
      }
    } catch (err) {
      console.error('Error deleting quest:', err);
    }
  };

  // Helper for QR code image URL
  const getQrUrl = (codeText, size = 300) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=15&data=${encodeURIComponent(codeText)}`;
  };

  // Print QR sticker
  const handlePrint = (item) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EventPulse QR Sticker - ${item.title}</title>
          <style>
            body {
              font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fff;
              color: #0f172a;
              text-align: center;
              padding: 20px;
            }
            .card {
              border: 3px dashed #6366f1;
              border-radius: 28px;
              padding: 36px 48px;
              max-width: 420px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            .badge {
              background: #eef2ff;
              color: #4f46e5;
              padding: 6px 14px;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              display: inline-block;
              margin-bottom: 12px;
            }
            h1 {
              font-size: 24px;
              font-weight: 800;
              margin: 0 0 6px 0;
            }
            p.hint {
              color: #64748b;
              font-size: 13px;
              margin: 0 0 20px 0;
            }
            img {
              width: 240px;
              height: 240px;
              border-radius: 16px;
              border: 1px solid #e2e8f0;
            }
            .code-text {
              margin-top: 16px;
              font-family: monospace;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 2px;
              color: #475569;
              background: #f8fafc;
              padding: 8px 14px;
              border-radius: 8px;
              display: inline-block;
            }
            .footer {
              margin-top: 20px;
              font-size: 11px;
              color: #94a3b8;
              font-weight: 600;
            }
            @media print {
              body { padding: 0; }
              .card { box-shadow: none; border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">EventPulse Scavenger Quest</div>
            <h1>${item.title}</h1>
            <p class="hint">Location: ${item.locationHint || 'Venue Area'}</p>
            <img src="${getQrUrl(item.code, 400)}" alt="${item.code}" />
            <div class="code-text">${item.code}</div>
            <div class="footer">Scan using EventPulse Attendee Console • Reward: +${item.points || 1} Point</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Top Bar Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-500/20">
              EPC-05 Engagement Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Scavenger Quest & QR Code Generator 🗺️
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
            Generate, customize, and print verified physical QR checkpoint markers for attendee venue hunts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCodes}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer border-none"
          >
            <Plus size={16} />
            Create Quest QR
          </button>
        </div>
      </div>

      {/* ── Summary Metrics ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Checkpoints</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <Compass size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {codes.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active hidden venue markers</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Total Scans Recorded</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {codes.reduce((acc, curr) => acc + (curr.totalScans || 0), 0)}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified attendee scans in database</p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Quest Target</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            6 Checkpoints
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Unlocks LKR 500 Food Court voucher reward</p>
        </div>
      </div>

      {/* ── Organizer Prize Desk Voucher Redemption Station ──────── */}
      <OrganizerVoucherRedemptionStation onRedeemSuccess={fetchCodes} />

      {/* ── Checkpoints Grid / Card Table ─────────────────────── */}
      <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Quest Checkpoints</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Click any card to preview or print high-resolution sticker QR codes</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
            {codes.length} Registered Checkpoints
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-indigo-500" />
            Loading scavenger checkpoints...
          </div>
        ) : codes.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <QrCode size={40} className="mx-auto text-slate-300 dark:text-zinc-600" />
            <p className="text-sm font-semibold">No quest checkpoints found.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              Create Your First Quest QR
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {codes.map((item, idx) => (
              <div
                key={item._id || item.code}
                className="group relative rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 p-5 bg-slate-50/50 dark:bg-zinc-950/40 hover:border-indigo-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-400">
                      Checkpoint #{idx + 1}
                    </span>
                    <button
                      onClick={() => handleDeleteCode(item._id, item.title)}
                      title="Delete checkpoint"
                      className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer border-none bg-transparent"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-1 font-medium line-clamp-1">
                    <MapPin size={13} className="text-indigo-500 shrink-0" />
                    {item.locationHint || 'Venue area'}
                  </p>

                  {/* QR Image Thumbnail preview */}
                  <div 
                    onClick={() => setSelectedQrCode(item)}
                    className="my-4 mx-auto w-36 h-36 rounded-xl bg-white p-2.5 border border-slate-200 dark:border-zinc-700 flex items-center justify-center cursor-pointer shadow-xs group-hover:scale-105 transition-transform"
                  >
                    <img 
                      src={getQrUrl(item.code, 180)} 
                      alt={item.code} 
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="text-center">
                    <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-3 py-1 rounded-md border border-slate-200 dark:border-zinc-800">
                      {item.code}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500 dark:text-zinc-400">
                    Scans: <span className="font-bold text-slate-900 dark:text-white">{item.totalScans || 0}</span>
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrint(item)}
                      title="Print physical sticker"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] transition-all cursor-pointer border-none"
                    >
                      <Printer size={13} /> Print
                    </button>
                    <button
                      onClick={() => setSelectedQrCode(item)}
                      title="View full size"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-[11px] transition-all cursor-pointer border-none"
                    >
                      <QrCode size={13} /> View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Create New Quest Checkpoint ────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl p-6 sm:p-8 space-y-6 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Plus size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Quest Checkpoint</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateQuest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Checkpoint Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP Lounge Secret Banner"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Location Hint (Displayed to Attendees)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Behind the main coffee stall in Hall B"
                  value={formData.locationHint}
                  onChange={e => setFormData({ ...formData, locationHint: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Custom Code Token (Leave blank to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. HUNT_HALL_B_STALL_4"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Attendees will scan the QR code containing this token.</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 cursor-pointer border-none disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: High-Res QR View & Download ────────────────── */}
      {selectedQrCode && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setSelectedQrCode(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl p-7 text-center space-y-5 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 rounded-full">
                Physical Sticker QR
              </span>
              <button
                onClick={() => setSelectedQrCode(null)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedQrCode.title}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{selectedQrCode.locationHint || 'Venue area'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-md inline-block">
              <img 
                src={getQrUrl(selectedQrCode.code, 260)} 
                alt={selectedQrCode.code} 
                className="w-56 h-56 object-contain block mx-auto"
              />
            </div>

            <div className="font-mono text-xs font-bold text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-950 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-zinc-800">
              {selectedQrCode.code}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handlePrint(selectedQrCode)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all cursor-pointer border-none shadow-md shadow-indigo-600/20"
              >
                <Printer size={14} /> Print Sticker
              </button>
              <a
                href={getQrUrl(selectedQrCode.code, 600)}
                download={`Scavenger_QR_${selectedQrCode.code}.png`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs transition-all no-underline border border-slate-200 dark:border-zinc-700"
              >
                <Download size={14} /> Download PNG
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Organizer Help Desk Voucher Redemption Sub-component ────────────
function OrganizerVoucherRedemptionStation({ onRedeemSuccess }) {
  const [voucherInput, setVoucherInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState(null); // { success: boolean, message: string, voucher?: any }

  const handleRedeemVoucher = async (e) => {
    e.preventDefault();
    if (!voucherInput.trim()) return;

    try {
      setIsRedeeming(true);
      setRedeemResult(null);

      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/scavenger/admin/redeem-voucher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ voucherCode: voucherInput.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRedeemResult({
          success: true,
          message: data.message,
          voucher: data.voucher
        });
        setVoucherInput('');
        if (onRedeemSuccess) onRedeemSuccess();
      } else {
        setRedeemResult({
          success: false,
          message: data.message || 'Failed to redeem voucher'
        });
      }
    } catch (err) {
      setRedeemResult({
        success: false,
        message: 'Network error connecting to prize desk service.'
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Gift size={20} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
              Organizer Prize Desk & Vendor Subsidy Audit 🎟️
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Verify attendee 16-character quest vouchers for physical prize pickup or review vendor food subsidies (LKR 500.00/each).
            </p>
          </div>
        </div>
        <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 self-start sm:self-auto">
          Help Desk Terminal
        </span>
      </div>

      <form onSubmit={handleRedeemVoucher} className="flex flex-col sm:flex-row items-stretch gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={voucherInput}
            onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
            placeholder="Enter attendee voucher code (e.g. 8A3F1B0C4D5E6F7A)"
            maxLength={24}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 font-mono text-xs sm:text-sm font-bold tracking-wider text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
          />
        </div>
        <button
          type="submit"
          disabled={isRedeeming || !voucherInput.trim()}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/20 border-none shrink-0"
        >
          {isRedeeming ? 'Verifying...' : 'Verify & Redeem Voucher'}
        </button>
      </form>

      {redeemResult && (
        <div 
          className={`p-4 rounded-2xl border text-xs flex items-start gap-3 animate-fade-in ${
            redeemResult.success 
              ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="shrink-0 mt-0.5">
            {redeemResult.success ? <CheckCircle2 size={16} /> : <X size={16} />}
          </div>
          <div className="flex-1">
            <p className="font-bold">{redeemResult.message}</p>
            {redeemResult.voucher && (
              <p className="text-[11px] opacity-80 mt-1">
                Issued to: <span className="font-semibold">{redeemResult.voucher.user?.fullName || 'Attendee'}</span> ({redeemResult.voucher.user?.email || 'N/A'}) • Face Value: LKR {redeemResult.voucher.faceValue || 500}.00
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
