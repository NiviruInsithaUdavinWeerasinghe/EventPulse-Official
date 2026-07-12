import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownLeft,
  ShieldCheck,
  ShieldAlert,
  Download,
  Search,
  ExternalLink,
  AlertTriangle,
  Loader2,
  Lock,
  ListChecks,
  RefreshCw,
  FileSpreadsheet,
  Percent,
  Landmark,
} from 'lucide-react';
import { authFetch, downloadFile, ApiAuthError } from '../../utils/api.js';

// ── Shared states ──────────────────────────────────────────────────────
function AccessDenied({ message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600">
        <Lock size={28} />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white">Access Denied</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
        {message || 'This panel is restricted to authorized event organizers.'} Redirecting to login…
      </p>
    </div>
  );
}

function LoadingState({ label }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function ErrorState({ title, message }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600">
        <AlertTriangle size={28} />
      </div>
      <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">{message}</p>
    </div>
  );
}

export default function SettlementAudit() {
  const navigate = useNavigate();
  const [activeSubTab, setActiveSubTab] = useState('ledger');
  const [exportingFull, setExportingFull] = useState(false);

  const handleExportFullLedger = async () => {
    try {
      setExportingFull(true);
      await downloadFile('/api/exports/full-ledger', `full-ledger-export-${Date.now()}.csv`);
    } catch (err) {
      if (err instanceof ApiAuthError) navigate('/login');
      else alert(err.message || 'Export failed.');
    } finally {
      setExportingFull(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Settlement Audit Panel</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Review ticket sales revenue, platform commission, and reconcile ledger integrity.</p>
        </div>
        <button
          onClick={handleExportFullLedger}
          disabled={exportingFull}
          title="Compiles the revenue ledger, event summary, and every reconciliation sheet into one CSV"
          className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-white dark:text-zinc-950 font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          {exportingFull ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
          {exportingFull ? 'Compiling…' : 'Export Full Ledger'}
        </button>
      </div>

      {/* ── Sub-tab Switcher ──────────────────────────────────── */}
      <div className="inline-flex p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl">
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'ledger'
              ? 'bg-white dark:bg-zinc-950 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          Revenue Ledger
        </button>
        <button
          onClick={() => setActiveSubTab('reconciliation')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'reconciliation'
              ? 'bg-white dark:bg-zinc-950 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          System Reconciliation
        </button>
      </div>

      {activeSubTab === 'ledger' ? <RevenueLedgerTab /> : <ReconciliationTab />}

    </div>
  );
}

// ── Tab 1: per-organizer revenue ledger (existing settlement report) ───
function RevenueLedgerTab() {
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await authFetch('/api/settlements');
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load settlement report.');
        if (!cancelled) setReport(body.data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiAuthError) {
          setError(err);
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [navigate]);

  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadFile('/api/settlements/export', `settlement-report-${Date.now()}.csv`);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        navigate('/login');
      } else {
        alert(err.message || 'Export failed.');
      }
    } finally {
      setExporting(false);
    }
  };

  if (error instanceof ApiAuthError) return <AccessDenied message={error.message} />;
  if (loading) return <LoadingState label="Loading settlement report…" />;
  if (error) return <ErrorState title="Couldn't load settlement report" message={error.message} />;

  const { summary, transactions } = report;

  const filteredTransactions = transactions.filter((txn) => {
    const matchesSearch =
      txn.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(txn.id).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || txn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">

      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs md:text-sm px-4 py-2.5 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Exporting…' : 'Export Ledger Report'}
        </button>
      </div>

      {/* ── Financial Cards Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">

        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Gross Sales Revenue</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${summary.grossRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
              <ArrowUpRight size={12} />
              {summary.ticketsSold} tickets sold
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <DollarSign size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Platform Fee ({(summary.commissionRate * 100).toFixed(0)}%)
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${summary.commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Withheld automatically at settlement
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ArrowDownLeft size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Operational Margin</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {(summary.operationalMarginRate * 100).toFixed(2)}%
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Platform fee as a share of gross revenue
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
            <Percent size={22} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Net Payout</span>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ${summary.netPayout.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <Landmark size={12} />
              Via {summary.payoutMethod} · registered on file
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={22} />
          </div>
        </div>

      </div>

      <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 -mt-2">
        <Lock size={11} />
        {summary.payoutNote}
      </p>

      {/* ── Ledger Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-zinc-900/40 p-4 border border-slate-200/80 dark:border-zinc-800/80 rounded-xl shadow-xs">

        <div className="flex flex-wrap gap-2">
          {['All', 'Active', 'Used', 'Cancelled'].map((filter) => (
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

        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search event / transaction ID..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                <th className="pb-3 px-4">Event</th>
                <th className="pb-3 px-4">Tier / Seat</th>
                <th className="pb-3 px-4">Gross Amount</th>
                <th className="pb-3 px-4">Platform Fee</th>
                <th className="pb-3 px-4">Margin</th>
                <th className="pb-3 px-4">Net Payout</th>
                <th className="pb-3 px-4">Payout Method</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-slate-300 font-medium">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((txn) => {
                  const isActive = txn.status === 'Active';
                  const isUsed = txn.status === 'Used';

                  return (
                    <tr key={txn.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                      <td className="py-3.5 pr-4">
                        <span className="font-bold text-slate-900 dark:text-white block truncate max-w-[140px]">{txn.id}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(txn.date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold truncate max-w-[160px]">{txn.event}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-500">{txn.tier} · {txn.seat}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">${txn.grossAmount.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-amber-600 font-semibold">-${txn.commission.toFixed(2)}</td>
                      <td className="py-3.5 px-4 text-violet-600 font-semibold">{(txn.operationalMarginRate * 100).toFixed(2)}%</td>
                      <td className="py-3.5 px-4 text-emerald-600 font-extrabold">${txn.netPayout.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-normal text-slate-500">{txn.payoutMethod}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' :
                          isUsed ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600' :
                          'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => txn.eventId && navigate(`/events/${txn.eventId}`)}
                          className="p-1.5 text-slate-450 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-zinc-850 rounded-lg cursor-pointer transition-colors"
                          title="View event"
                        >
                          <ExternalLink size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    No ledger entries found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ── Tab 2: full-system reconciliation across every ledger entry ────────
function ReconciliationTab() {
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authFetch('/api/reconciliation');
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load reconciliation report.');
      setReport(body.data);
    } catch (err) {
      if (err instanceof ApiAuthError) {
        setError(err);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    try {
      setExporting(true);
      await downloadFile('/api/reconciliation/export', `reconciliation-report-${Date.now()}.csv`);
    } catch (err) {
      if (err instanceof ApiAuthError) navigate('/login');
      else alert(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  if (error instanceof ApiAuthError) return <AccessDenied message={error.message} />;
  if (loading) return <LoadingState label="Running full-system reconciliation…" />;
  if (error) return <ErrorState title="Couldn't run reconciliation" message={error.message} />;

  const { generatedAt, totalLedgerEntries, integrityStatus, issueCount, checks } = report;
  const isPass = integrityStatus === 'PASS';
  const { missingEvent, missingUser } = checks.orphanedTickets;

  return (
    <div className="space-y-6">

      {/* ── Status banner ──────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl p-6 border shadow-sm ${
        isPass
          ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20'
          : 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3.5 rounded-2xl ${isPass ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
            {isPass ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white">
              {isPass ? 'All ledger entries reconciled' : `${issueCount} integrity issue${issueCount === 1 ? '' : 's'} found`}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Swept {totalLedgerEntries.toLocaleString()} ticket ledger entries across every event in the system · {new Date(generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed text-slate-700 dark:text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all"
          >
            {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {exporting ? 'Exporting…' : 'Export Issues'}
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 font-semibold text-xs px-3.5 py-2 rounded-xl cursor-pointer transition-all"
          >
            <RefreshCw size={13} />
            Re-run
          </button>
        </div>
      </div>

      {/* ── Orphaned tickets: missing event ────────────────── */}
      <ReconciliationSection
        title="Tickets referencing a deleted event"
        description="These ledger entries record revenue against an event that no longer exists in the system."
        rows={missingEvent}
        emptyLabel="No orphaned event references."
        columns={[
          { key: '_id', label: 'Ticket ID' },
          { key: 'event', label: 'Missing Event ID' },
          { key: 'tier', label: 'Tier' },
          { key: 'seat', label: 'Seat' },
          { key: 'price', label: 'Amount', render: (r) => `$${Number(r.price).toFixed(2)}` },
          { key: 'status', label: 'Status' },
        ]}
      />

      {/* ── Orphaned tickets: missing user ─────────────────── */}
      <ReconciliationSection
        title="Tickets referencing a deleted account"
        description="These ledger entries record a sale to a customer account that no longer exists."
        rows={missingUser}
        emptyLabel="No orphaned user references."
        columns={[
          { key: '_id', label: 'Ticket ID' },
          { key: 'user', label: 'Missing User ID' },
          { key: 'tier', label: 'Tier' },
          { key: 'seat', label: 'Seat' },
          { key: 'price', label: 'Amount', render: (r) => `$${Number(r.price).toFixed(2)}` },
          { key: 'status', label: 'Status' },
        ]}
      />

      {/* ── Duplicate seat bookings ─────────────────────────── */}
      <ReconciliationSection
        title="Duplicate seat bookings"
        description="More than one active/used ticket was sold for the same seat at the same event."
        rows={checks.duplicateSeatBookings}
        emptyLabel="No duplicate seat bookings."
        columns={[
          { key: 'event', label: 'Event' },
          { key: 'seat', label: 'Seat' },
          { key: 'count', label: 'Tickets Sold' },
          { key: 'ticketIds', label: 'Ticket IDs', render: (r) => r.ticketIds.join(', ') },
        ]}
      />

      {/* ── Invalid amounts ─────────────────────────────────── */}
      <ReconciliationSection
        title="Non-positive ticket amounts"
        description="Ledger entries with a price of zero or less cannot represent a legitimate sale."
        rows={checks.invalidAmountTickets}
        emptyLabel="No invalid ticket amounts."
        columns={[
          { key: '_id', label: 'Ticket ID' },
          { key: 'event', label: 'Event ID' },
          { key: 'tier', label: 'Tier' },
          { key: 'seat', label: 'Seat' },
          { key: 'price', label: 'Amount', render: (r) => `$${Number(r.price).toFixed(2)}` },
          { key: 'status', label: 'Status' },
        ]}
      />

    </div>
  );
}

function ReconciliationSection({ title, description, rows, emptyLabel, columns }) {
  const hasIssues = rows.length > 0;

  return (
    <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ListChecks size={15} className={hasIssues ? 'text-rose-600' : 'text-emerald-600'} />
            {title}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
          hasIssues ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600'
        }`}>
          {rows.length} found
        </span>
      </div>

      {hasIssues ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800 text-slate-400 font-semibold uppercase tracking-wider">
                {columns.map((col) => (
                  <th key={col.key} className="pb-3 px-4 first:pl-0">{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-700 dark:text-slate-300 font-medium">
              {rows.map((row, i) => (
                <tr key={row._id || row.ticketIds?.join('-') || i} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                  {columns.map((col) => (
                    <td key={col.key} className="py-3 px-4 first:pl-0 truncate max-w-[220px]">
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400 py-2">{emptyLabel}</p>
      )}
    </div>
  );
}
