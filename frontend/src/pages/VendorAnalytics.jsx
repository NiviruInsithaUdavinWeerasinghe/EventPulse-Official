import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  TrendingUp, 
  Percent, 
  ShoppingBag, 
  Calendar, 
  Copy, 
  Check, 
  RefreshCw, 
  Clock, 
  AlertCircle,
  Sparkles,
  Inbox
} from 'lucide-react';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function VendorAnalytics() {
  const navigate = useNavigate();
  
  // State variables
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [summary, setSummary] = useState({
    grossSales: 0,
    platformFee: 0,
    netEarnings: 0,
    totalSales: 0
  });
  const [timeline, setTimeline] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [newSaleHighlightId, setNewSaleHighlightId] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch Events list for the filter dropdown
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/events');
        const data = await res.json();
        if (data.success) {
          setEvents(data.data);
        }
      } catch (err) {
        console.error('Failed to load events filter:', err);
      }
    };
    fetchEvents();
  }, []);

  // Fetch performance data from API
  const fetchPerformanceData = async (eventIdFilter) => {
    setLoading(true);
    setError('');
    try {
      const url = eventIdFilter 
        ? `/api/vendors/sales-performance?eventId=${eventIdFilter}`
        : '/api/vendors/sales-performance';
      
      const res = await fetch(url, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to load performance metrics.');
      } else {
        setSummary(data.summary);
        setTimeline(data.timeline);
        setChartData(data.chartData);
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Failed to retrieve analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when filter selection changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPerformanceData(selectedEventId);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedEventId]);

  // Establish WebSocket connection for real-time sales stream
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.hostname}:5000/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'CONNECTED' || data.type === 'AUTHENTICATED') {
          setWsConnected(true);
        } else if (data.type === 'VENDOR_SALE_SUCCESS') {
          const newSale = data.sale;
          
          // Trigger toast notification
          setToastMessage(`New sale of LKR ${newSale.grossAmount.toLocaleString()} received!`);
          setShowToast(true);
          setTimeout(() => setShowToast(false), 4000);

          // Highlight the new sale row/card
          setNewSaleHighlightId(newSale.transactionId);
          setTimeout(() => setNewSaleHighlightId(null), 3000);

          // If the page is currently filtered for a different event, don't show or accumulate this live sale
          if (selectedEventId && newSale.eventId !== selectedEventId) {
            return;
          }

          // Update timeline chronologically (newest first)
          setTimeline(prev => [newSale, ...prev]);

          // Update summary metrics
          setSummary(prev => {
            const nextGross = prev.grossSales + newSale.grossAmount;
            const nextFee = prev.platformFee + newSale.platformSplit;
            const nextNet = prev.netEarnings + newSale.netAmount;
            return {
              grossSales: parseFloat(nextGross.toFixed(2)),
              platformFee: parseFloat(nextFee.toFixed(2)),
              netEarnings: parseFloat(nextNet.toFixed(2)),
              totalSales: prev.totalSales + 1
            };
          });

          // Update chart data
          setChartData(prev => {
            const lastPoint = prev[prev.length - 1];
            const cumulativeBase = lastPoint ? lastPoint.cumulativeNet : 0;
            const newCumulative = parseFloat((cumulativeBase + newSale.netAmount).toFixed(2));
            
            return [
              ...prev,
              {
                timestamp: newSale.timestamp,
                grossAmount: newSale.grossAmount,
                netAmount: newSale.netAmount,
                cumulativeNet: newCumulative
              }
            ];
          });
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    ws.onerror = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [selectedEventId]);

  // Copy helper function for transaction ID
  const handleCopyId = (txId) => {
    navigator.clipboard.writeText(txId);
    setCopiedId(txId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to format date strings
  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return {
      date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  // SVG Chart rendering math
  const renderSVGChart = () => {
    if (!chartData || chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-slate-500">
          <Clock className="w-8 h-8 mb-2 opacity-30 animate-pulse text-indigo-400" />
          <p className="text-xs font-semibold">Waiting for sales stream to initialize chart...</p>
        </div>
      );
    }

    const width = 500;
    const height = 180;
    const padding = { top: 20, right: 20, bottom: 25, left: 55 };

    const maxVal = Math.max(...chartData.map(d => d.cumulativeNet), 100);
    const minVal = 0;
    const valRange = maxVal - minVal;

    const points = chartData.map((d, i) => {
      const x = padding.left + (i * (width - padding.left - padding.right) / Math.max(chartData.length - 1, 1));
      const y = height - padding.bottom - ((d.cumulativeNet - minVal) / valRange * (height - padding.top - padding.bottom));
      return { x, y, val: d.cumulativeNet };
    });

    const { linePath, fillPath } = (() => {
      if (points.length === 1) {
        const p = points[0];
        const lp = `M ${padding.left} ${p.y} L ${width - padding.right} ${p.y}`;
        const fp = `M ${padding.left} ${p.y} L ${width - padding.right} ${p.y} L ${width - padding.right} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
        return { linePath: lp, fillPath: fp };
      } else {
        const lp = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
        const fp = `${lp} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
        return { linePath: lp, fillPath: fp };
      }
    })();

    return (
      <div className="w-full relative h-[200px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full text-slate-400 overflow-visible">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding.left} y1={padding.top} x2={width - padding.right} y2={padding.top} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={padding.left} y1={(padding.top + height - padding.bottom) / 2} x2={width - padding.right} y2={(padding.top + height - padding.bottom) / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
          <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} stroke="rgba(255,255,255,0.1)" />

          {/* Y Axis Labels */}
          <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-500">
            LKR {maxVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
          <text x={padding.left - 8} y={(padding.top + height - padding.bottom) / 2 + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-500">
            LKR {(maxVal / 2).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </text>
          <text x={padding.left - 8} y={height - padding.bottom + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-500">
            LKR 0
          </text>

          {/* Paths */}
          {chartData.length > 0 && (
            <>
              <path d={fillPath} fill="url(#chartGradient)" />
              <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Dot Markers */}
          {points.map((p, idx) => (
            <circle 
              key={idx} 
              cx={p.x} 
              cy={p.y} 
              r={idx === points.length - 1 ? "4.5" : "2.5"} 
              fill={idx === points.length - 1 ? "#10b981" : "#030712"} 
              stroke="#10b981" 
              strokeWidth="2" 
              className={idx === points.length - 1 ? "animate-pulse" : ""}
            />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans">
      
      {/* ── Real-Time Toast Notification ──────────────────── */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 border border-emerald-400 text-white px-5 py-4 rounded-2xl shadow-2xl transition-all duration-300 animate-bounce">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider opacity-90">Sale Confirmed</p>
            <p className="text-sm font-semibold">{toastMessage}</p>
          </div>
        </div>
      )}

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10">
        
        {/* ── Header ────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5 mb-8">
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/vendor/portal')}
              className="group inline-flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition-colors mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Back to Portal
            </button>
            <h1 className="text-[1.85rem] font-black tracking-tight text-white flex items-center gap-3">
              Sales Performance Dashboard
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Monitor transaction timelines and net revenue payouts in real-time.
            </p>
          </div>

          {/* Connection status and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Live Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all ${
              wsConnected 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
              {wsConnected ? 'Live Connection Enabled' : 'Live Offline'}
            </div>

            {/* Event Filter */}
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="appearance-none bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#0f172a]">All Event Contexts</option>
                {events.map((e) => (
                  <option key={e._id} value={e._id} className="bg-[#0f172a]">{e.name}</option>
                ))}
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[8px]">▼</span>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={() => fetchPerformanceData(selectedEventId)}
              className="p-2 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.08] hover:border-white/20 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
              title="Manual Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Error Banner ──────────────────────────────────── */}
        {error && (
          <div className="mb-6 flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* ── Loading Overlay or Content ────────────────────── */}
        {loading && timeline.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-semibold">Loading sales analytics ledger...</p>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ── KPI Widgets Grid ────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Net Earnings Card */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-sm hover:border-emerald-500/20 hover:bg-emerald-950/[0.02] transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Revenue Payout</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  LKR {summary.netEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-slate-500 text-[10px] font-medium mt-1">
                  Excludes 5% platform split
                </p>
              </div>

              {/* Gross Sales Card */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-sm hover:border-indigo-500/20 hover:bg-indigo-950/[0.02] transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gross Sales Volume</span>
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  LKR {summary.grossSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-slate-500 text-[10px] font-medium mt-1">
                  Total gross scan volume
                </p>
              </div>

              {/* Platform Share Card */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-sm hover:border-amber-500/20 hover:bg-amber-950/[0.02] transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Share (5%)</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
                    <Percent className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  LKR {summary.platformFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
                <p className="text-slate-500 text-[10px] font-medium mt-1">
                  Deducted organizer commission
                </p>
              </div>

              {/* Transactions Count Card */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-sm hover:border-sky-500/20 hover:bg-sky-950/[0.02] transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Completed Sales</span>
                  <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">
                  {summary.totalSales}
                </h3>
                <p className="text-slate-500 text-[10px] font-medium mt-1">
                  Successful checkouts
                </p>
              </div>

            </div>

            {/* ── Middle Grid: Chart and Visualizations ────────── */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Cumulative Revenue Progression
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Cumulative payout trend over transaction checkpoints.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  LKR Net Scale
                </div>
              </div>
              
              {renderSVGChart()}
            </div>

            {/* ── Timeline Log Feed ────────────────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Running Sales Log Timeline
                  </h3>
                  <p className="text-slate-500 text-xs">
                    List of all successfully completed attendee transactions.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-bold">
                  Showing {timeline.length} transactions
                </span>
              </div>

              {timeline.length === 0 ? (
                <div className="bg-white/[0.01] border border-white/[0.04] rounded-2xl py-16 flex flex-col items-center justify-center text-center">
                  <Inbox className="w-12 h-12 text-slate-600 mb-4 opacity-50" />
                  <h4 className="text-slate-300 font-semibold text-sm">No Sales Recorded</h4>
                  <p className="text-slate-500 text-xs max-w-sm mt-1 leading-relaxed">
                    Once scans are processed at the POS checkouts, the transactions and earnings logs will stream here instantly in real-time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {timeline.map((tx) => {
                    const { date, time } = formatDateTime(tx.timestamp);
                    const isNewHighlight = newSaleHighlightId === tx.transactionId;

                    return (
                      <div 
                        key={tx.transactionId}
                        className={`group bg-white/[0.01] hover:bg-white/[0.03] border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-300 ${
                          isNewHighlight 
                            ? 'border-emerald-500 bg-emerald-500/[0.03] shadow-lg shadow-emerald-500/5 scale-[1.01]' 
                            : 'border-white/[0.05] hover:border-white/10'
                        }`}
                      >
                        {/* Customer & Timestamp Info */}
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isNewHighlight
                              ? 'bg-emerald-50/20 text-emerald-450 border border-emerald-500/30'
                              : 'bg-white/5 text-slate-300 border border-white/10'
                          }`}>
                            {tx.customerName ? tx.customerName.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                              {tx.customerName || 'Event Attendee'}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-slate-500 text-[10px] font-semibold mt-0.5">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {date}
                              </span>
                              <span className="w-1 h-1 rounded-full bg-slate-700" />
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {time}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Transaction ID & Platform Split breakdown */}
                        <div className="flex flex-wrap items-center gap-6">
                          
                          {/* Transaction Reference ID */}
                          <div className="space-y-1">
                            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Transaction ID</span>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                              <span className="font-mono">{tx.transactionId.substring(0, 12)}...</span>
                              <button
                                onClick={() => handleCopyId(tx.transactionId)}
                                className="text-slate-500 hover:text-white transition-colors cursor-pointer"
                                title="Copy ID"
                              >
                                {copiedId === tx.transactionId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Breakdown breakdown */}
                          <div className="flex items-center gap-6 border-l border-white/5 pl-6">
                            
                            {/* Gross Sales */}
                            <div className="text-left md:text-right space-y-0.5">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Gross</span>
                              <span className="block text-xs font-semibold text-slate-300">
                                LKR {tx.grossAmount.toLocaleString()}
                              </span>
                            </div>

                            {/* 5% Split Fee */}
                            <div className="text-left md:text-right space-y-0.5">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Split Fee (5%)</span>
                              <span className="block text-xs font-semibold text-amber-500">
                                -LKR {tx.platformSplit.toLocaleString()}
                              </span>
                            </div>

                            {/* Net Earnings */}
                            <div className="text-left md:text-right space-y-0.5">
                              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Payout</span>
                              <span className="block text-sm font-black text-emerald-400">
                                LKR {tx.netAmount.toLocaleString()}
                              </span>
                            </div>

                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

      </main>
    </div>
  );
}
