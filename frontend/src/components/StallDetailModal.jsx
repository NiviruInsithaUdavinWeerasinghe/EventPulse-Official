import { X, Tag, Calendar, Store, Send } from 'lucide-react';

/**
 * StallDetailModal — EP-43
 * Non-obtrusive modal card shown when a user taps a hall block / stall on the map.
 *
 * Role-conditional layout:
 *  - customer → shows vendor description + product tags
 *  - vendor (viewing a vacant stall) → shows "Request Booking" action button
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - stall: {
 *      officialName: string,
 *      scheduledTheme: string,
 *      description?: string,
 *      tags?: string[],
 *      isVacant?: boolean,
 *    }
 *  - userRole: 'customer' | 'vendor' | 'organizer'
 *  - onRequestBooking?: () => void
 */
export default function StallDetailModal({ isOpen, onClose, stall, userRole, onRequestBooking }) {
  if (!isOpen || !stall) return null;

  const isVendorBookingView = userRole === 'vendor' && stall.isVacant;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-[#030712]/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-[#0b0f19] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-white/[0.06]">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-300 shrink-0">
              <Store size={15} />
            </span>
            {stall.isVacant ? (
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Vacant
              </span>
            ) : (
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                Occupied
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-slate-50 leading-snug pr-6">
            {stall.officialName}
          </h3>
          {stall.scheduledTheme && (
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
              <Calendar size={13} />
              <span>{stall.scheduledTheme}</span>
            </div>
          )}
        </div>

        {/* Body — role-conditional */}
        <div className="px-5 py-4">
          {isVendorBookingView ? (
            // ── Vendor viewing a vacant stall ──
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-400 leading-relaxed">
                This stall is currently available. Submit a booking request to reserve it for your business.
              </p>
              <button
                onClick={onRequestBooking}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Send size={15} />
                Request Booking
              </button>
            </div>
          ) : (
            // ── Customer (or default) view ──
            <div className="flex flex-col gap-4">
              {stall.description ? (
                <p className="text-sm text-slate-400 leading-relaxed">
                  {stall.description}
                </p>
              ) : (
                <p className="text-sm text-slate-600 italic">
                  No description provided for this stall yet.
                </p>
              )}

              {stall.tags && stall.tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-[0.7rem] font-semibold text-slate-600 uppercase tracking-widest">
                    <Tag size={12} />
                    <span>Products & Services</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {stall.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1">
          <button
            onClick={onClose}
            className="w-full text-center text-xs font-medium text-slate-600 hover:text-slate-400 transition-colors py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}