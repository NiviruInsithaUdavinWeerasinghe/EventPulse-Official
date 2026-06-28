import React, { useState } from 'react';
import { 
  DollarSign, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShieldCheck, 
  Download, 
  Search, 
  Filter, 
  Calendar, 
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';

export default function SettlementAudit() {
  const [transactions, setTransactions] = useState([
    {
      id: "TXN-88001",
      date: "2026-06-27",
      vendor: "Spark Electronics Corp",
      event: "Global Tech Summit 2026",
      amount: 4500.00,
      fee: 225.00,
      netPayout: 4275.00,
      status: "Settled",
      channel: "Stripe Connect",
    },
    {
      id: "TXN-88002",
      date: "2026-06-26",
      vendor: "Gourmet Street Food Ltd",
      event: "National Food & Wine Expo",
      amount: 2850.00,
      fee: 142.50,
      netPayout: 2707.50,
      status: "Processing",
      channel: "Stripe Connect",
    },
    {
      id: "TXN-88003",
      date: "2026-06-25",
      vendor: "PixelCraft Design Studio",
      event: "Art & Craft Festival Autumn",
      amount: 1200.00,
      fee: 60.00,
      netPayout: 1140.00,
      status: "Settled",
      channel: "ACH Direct",
    },
    {
      id: "TXN-88004",
      date: "2026-06-24",
      vendor: "NeoWear Outfitters",
      event: "Winter Fashion Runway",
      amount: 6800.00,
      fee: 340.00,
      netPayout: 6460.00,
      status: "Pending",
      channel: "Stripe Connect",
    },
    {
      id: "TXN-88005",
      date: "2026-06-22",
      vendor: "Astra Virtual Reality",
      event: "Global Tech Summit 2026",
      amount: 9500.00,
      fee: 475.00,
      netPayout: 9025.00,
      status: "Disputed",
      channel: "Credit Card",
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const handleExport = () => {
    alert("Exporting settlement ledger sheet: Excel / CSV compilation initiated.");
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.vendor.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          txn.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          txn.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settlement Audit Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Review merchant payouts, audit tax commissions, and export payment logs.</p>
        </div>
        <button 
          onClick={handleExport}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <Download size={16} />
          Export Ledger Report
        </button>
      </div>

      {/* ── Financial Cards Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Gross Revenue Card */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Gross Sales Revenue</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${transactions.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <ArrowUpRight size={12} />
              +14.5% from last event cycle
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Expenses/Commissions Card */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Organizer Commission (5%)</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${transactions.reduce((acc, curr) => acc + curr.fee, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Calculated dynamically at checkout
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ArrowDownLeft size={22} />
          </div>
        </div>

        {/* Audit Status Card */}
        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Audits & Disputes</span>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {transactions.filter(t => t.status === "Disputed").length} Active
            </h3>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              <AlertTriangle size={12} />
              Requires immediate action
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ShieldCheck size={22} />
          </div>
        </div>

      </div>

      {/* ── Ledger Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-zinc-900/40 p-4 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl shadow-xs">
        
        {/* Ledger Filters */}
        <div className="flex flex-wrap gap-2">
          {["All", "Settled", "Processing", "Pending", "Disputed"].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Ledger Search */}
        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="Search vendor / ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

      </div>

      {/* ── Ledger Transactions Table ────────────────────────── */}
      <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">Financial Audit Log</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3 pr-4">Transaction ID</th>
                <th className="pb-3 px-4">Merchant Vendor</th>
                <th className="pb-3 px-4">Event Context</th>
                <th className="pb-3 px-4">Gross Sales</th>
                <th className="pb-3 px-4">Tax Commission</th>
                <th className="pb-3 px-4">Net Payout</th>
                <th className="pb-3 px-4">Payment Method</th>
                <th className="pb-3 px-4">Settlement</th>
                <th className="pb-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-slate-300 font-medium">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => {
                  const isSettled = txn.status === "Settled";
                  const isProcessing = txn.status === "Processing";
                  const isPending = txn.status === "Pending";
                  const isDisputed = txn.status === "Disputed";

                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                      <td className="py-3.5 pr-4">
                        <span className="font-bold text-slate-900 dark:text-white block">{txn.id}</span>
                        <span className="text-[10px] text-slate-400 font-normal">Date: {txn.date}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold">{txn.vendor}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-500 truncate max-w-[150px]">{txn.event}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${txn.amount.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-amber-600 font-semibold">-${txn.fee.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-extrabold">${txn.netPayout.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-450">{txn.channel}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isSettled ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' :
                          isProcessing ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' :
                          isPending ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' :
                          'bg-rose-50 dark:bg-rose-500/10 text-rose-600 animate-pulse'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button 
                          onClick={() => alert(`Auditing transaction ledger entry: ${txn.id}`)}
                          className="p-1.5 text-slate-450 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg cursor-pointer transition-colors"
                          title="Open full audit record"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">
                    No ledger entries found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description tag statement */}
      <div className="text-center pt-8 pb-4">
        <p className="text-orange-500 font-extrabold text-2xl tracking-wide uppercase animate-pulse">
          will give a purpose for this section later
        </p>
      </div>

    </div>
  );
}
