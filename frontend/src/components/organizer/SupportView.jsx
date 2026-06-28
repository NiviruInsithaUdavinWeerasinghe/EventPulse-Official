import React, { useState } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  FileText, 
  MessageSquare, 
  LifeBuoy,
  CheckCircle2
} from 'lucide-react';

export default function SupportView() {
  const faqs = [
    {
      q: "How do I configure interactive stalls in uploaded blueprints?",
      a: "Once you upload an SVG file in the Blueprint Uploads tab, click on 'Edit Map Layout'. This opens the layout mapper. You can click on paths or shapes to define them as coordinate stalls, assign booth numbers, set pricing, and open them for vendor reservations.",
    },
    {
      q: "How do I audit tax commissions and outbound settlements?",
      a: "The Settlement Audit Panel maps all processed sales transactions. We deduct a configurable 5% platform commission at the checkout. Outbound payouts are processed automatically via Stripe Connect. If a transaction is disputed, click the 'Audit' action to review vendor POS receipt details.",
    },
    {
      q: "How long does vendor registration review take?",
      a: "Vendor approvals are organizer-controlled. Incoming requests appear under 'Vendor Approvals'. You can review their profiles, check requested stalls, and approve or reject them. Approved vendors receive automated email alerts to access the POS checkout portal.",
    },
    {
      q: "Can I assign multiple blueprint floorplans to a single event?",
      a: "Currently, each event campaign maps to a single layout diagram blueprint. If your exhibition spans multiple halls, you can set up distinct event entities (e.g., 'Hall A Expo', 'Hall B Expo') and map their coordinates separately.",
    },
  ];

  const [expandedIndex, setExpandedIndex] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ticketStatus, setTicketStatus] = useState(false);

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!subject || !message) return;
    setTicketStatus(true);
    setSubject("");
    setMessage("");
    setTimeout(() => setTicketStatus(false), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Help & Support</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Find answers in our documentation or submit a direct inquiry ticket to our support specialists.</p>
      </div>

      {ticketStatus && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 size={16} />
          Inquiry ticket submitted successfully! A support representative will email you shortly.
        </div>
      )}

      {/* ── Content Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FAQs Panel (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-2">
            <HelpCircle size={18} className="text-indigo-500" />
            Frequently Asked Questions
          </h3>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div 
                  key={idx}
                  className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs hover:border-slate-350 dark:hover:border-zinc-700 transition-colors"
                >
                  <button
                    onClick={() => toggleExpand(idx)}
                    className="w-full flex items-center justify-between p-5 text-left text-slate-900 dark:text-slate-200 font-bold text-xs md:text-sm cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-450" /> : <ChevronDown size={16} className="text-slate-450" />}
                  </button>
                  {isExpanded && (
                    <p className="px-5 pb-5 pt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-zinc-800/60">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Support Inquiry Form */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-zinc-800 pb-3 mb-4">
              <MessageSquare size={18} className="text-amber-500" />
              Contact Support
            </h3>
            
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inquiry Subject</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Map uploads error code"
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Inquiry Message</label>
                <textarea 
                  required
                  rows="4"
                  placeholder="Provide detailed logs or steps to replicate the issue..."
                  className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-slate-950 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>

              <button 
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm py-2.5 px-4 rounded-xl shadow-xs cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
              >
                <Send size={14} />
                Submit Support Ticket
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 text-[11px] font-semibold text-slate-500">
            <span className="block text-slate-400 uppercase">SUPPORT RESOURCES</span>
            <div className="flex flex-col gap-2 mt-2">
              <a href="#docs" className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                <FileText size={12} />
                Access Developer API Docs
              </a>
              <a href="#kb" className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline">
                <LifeBuoy size={12} />
                Browse Knowledge Base
              </a>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
