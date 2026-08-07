import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../../utils/api.js';
import {
  Trophy,
  Calendar,
  AlertCircle,
  ChevronDown,
  Loader2,
  Vote as VoteIcon
} from 'lucide-react';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

const POLL_INTERVAL_MS = 10000;

// Draws the numeric vote count directly at the end of each bar so the count
// is always visible, not just on hover — the tooltip callback below still
// covers the accessible/hover case, this is the always-on printed label.
const voteCountLabelPlugin = {
  id: 'voteCountLabel',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    const meta = chart.getDatasetMeta(0);
    const values = chart.data.datasets[0].data;
    const isDark = document.documentElement.classList.contains('dark');

    ctx.save();
    ctx.font = '700 11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    meta.data.forEach((bar, index) => {
      const value = values[index];
      const pos = bar.tooltipPosition();
      ctx.fillText(`${value.toLocaleString()} votes`, pos.x + 10, pos.y);
    });

    ctx.restore();
  },
};

export default function VoteLeaderboard() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [leaderboard, setLeaderboard] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Fetch events list on mount
  useEffect(() => {
    async function fetchEvents() {
      try {
        setLoadingEvents(true);
        const res = await authFetch('/api/events');
        if (!res.ok) throw new Error('Failed to fetch events.');
        const json = await res.json();

        if (json.success && json.data.length > 0) {
          setEvents(json.data);
          setSelectedEventId(json.data[0]._id);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Could not load events list. Please try again later.');
      } finally {
        setLoadingEvents(false);
      }
    }

    fetchEvents();
  }, []);

  // Fetch voting categories whenever the selected event changes
  useEffect(() => {
    if (!selectedEventId) return;

    async function fetchCategories() {
      try {
        setLoadingCategories(true);
        setError(null);
        const res = await authFetch(`/api/vote/categories/${selectedEventId}`);
        if (!res.ok) throw new Error('Failed to fetch voting categories.');
        const json = await res.json();

        if (json.success) {
          setCategories(json.data);
          setSelectedCategory(json.data.length > 0 ? json.data[0] : '');
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('Could not load voting categories for this event.');
      } finally {
        setLoadingCategories(false);
      }
    }

    fetchCategories();
  }, [selectedEventId]);

  // Poll the aggregation endpoint every 10s for the selected event/category.
  // Only the very first fetch toggles the loading spinner — background polls
  // stay silent so the chart update is the only visible change on screen.
  useEffect(() => {
    if (!selectedEventId || !selectedCategory) {
      setLeaderboard([]);
      return;
    }

    let cancelled = false;

    async function fetchLeaderboard(isInitial) {
      try {
        if (isInitial) setLoadingData(true);
        const res = await authFetch(
          `/api/vote/leaderboard/${selectedEventId}/${encodeURIComponent(selectedCategory)}`
        );
        if (!res.ok) throw new Error('Failed to fetch leaderboard.');
        const json = await res.json();
        if (cancelled) return;

        if (json.success) {
          setLeaderboard(json.data);
          setTotalVotes(json.totalVotes);
          setLastUpdated(new Date());
          setError(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching leaderboard:', err);
        if (isInitial) setError('Could not load the leaderboard for this category.');
      } finally {
        if (!cancelled && isInitial) setLoadingData(false);
      }
    }

    fetchLeaderboard(true);
    const intervalId = setInterval(() => fetchLeaderboard(false), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedEventId, selectedCategory]);

  // Render/update the bar chart. Updates the existing instance's data in
  // place (chart.update()) rather than destroying/recreating it, so Chart.js
  // animates the bar-height change smoothly instead of a hard redraw.
  useEffect(() => {
    if (!chartRef.current || leaderboard.length === 0) return;

    // Rank #1 is called out with a trophy + bold numbering; the rest follow
    // sequentially underneath so reading order matches vote order top-to-bottom.
    const labels = leaderboard.map((c, i) => (i === 0 ? `🏆 1. ${c.name}` : `${i + 1}. ${c.name}`));
    const votes = leaderboard.map((c) => c.voteCount);
    const colors = leaderboard.map((_, i) =>
      i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#c2703d' : 'rgba(99, 102, 241, 0.75)'
    );
    // Leave headroom past the longest bar so the printed vote-count label
    // (drawn by voteCountLabelPlugin) never gets clipped by the canvas edge.
    const suggestedMax = Math.ceil(Math.max(1, ...votes) * 1.25);

    if (chartInstance.current) {
      chartInstance.current.data.labels = labels;
      chartInstance.current.data.datasets[0].data = votes;
      chartInstance.current.data.datasets[0].backgroundColor = colors;
      chartInstance.current.options.scales.x.suggestedMax = suggestedMax;
      chartInstance.current.update();
      return;
    }

    const ctx = chartRef.current.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(63, 63, 70, 0.3)' : 'rgba(226, 232, 240, 0.8)';
    const textColor = isDark ? '#a1a1aa' : '#64748b';

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Votes',
            data: votes,
            backgroundColor: colors,
            borderRadius: 8,
            maxBarThickness: 36,
          },
        ],
      },
      plugins: [voteCountLabelPlugin],
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 700,
          easing: 'easeOutQuart',
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(9, 10, 15, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: '#3f3f46',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: false,
            callbacks: {
              label: (context) => `${context.parsed.x.toLocaleString()} votes`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax,
            grid: { color: gridColor, drawBorder: false },
            ticks: { color: textColor, precision: 0 },
          },
          y: {
            grid: { display: false, drawBorder: false },
            ticks: { color: textColor, font: { size: 11, weight: '700' } },
          },
        },
      },
    });
  }, [leaderboard]);

  // Destroy the chart instance on unmount only
  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, []);

  if (loadingEvents) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
        <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">Loading events metadata...</p>
      </div>
    );
  }

  const leadingCandidate = leaderboard[0];

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-zinc-900/80 pb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy size={22} className="text-indigo-650 dark:text-indigo-400" />
            Live Vote Leaderboard
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">
            Public voting results, updated automatically — no manual counting required
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Event Selector */}
          {events.length > 0 && (
            <div className="relative min-w-[220px]">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-zinc-200 outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none shadow-xs"
              >
                {events.map((evt) => (
                  <option key={evt._id} value={evt._id}>
                    {evt.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>
          )}

          {/* Category Selector */}
          {categories.length > 0 && (
            <div className="relative min-w-[220px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-zinc-200 outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer appearance-none shadow-xs"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown size={16} />
              </div>
            </div>
          )}
        </div>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl text-center shadow-xs">
          <Calendar size={48} className="text-slate-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No events found</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-xs">
            Create an event in the Event Management panel first before viewing voting results.
          </p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-bold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : loadingCategories ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-6 h-6 text-indigo-650 animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl text-center shadow-xs">
          <VoteIcon size={48} className="text-slate-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No voting categories yet</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-xs">
            Add candidates to a voting category for this event to see live results here.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Leading Candidate</p>
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Trophy size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white truncate">
                {loadingData ? '...' : leadingCandidate ? leadingCandidate.name : 'N/A'}
              </h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-1.5">Currently ranked #1 in this category</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Votes Cast</p>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <VoteIcon size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {loadingData ? '...' : totalVotes.toLocaleString()}
              </h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-1.5">Across all candidates in this category</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Live Status</p>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <span className="block w-4.5 h-4.5 rounded-full bg-indigo-500 animate-pulse" />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Auto-refreshing
              </h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-1.5">
                {lastUpdated
                  ? `Last updated ${lastUpdated.toLocaleTimeString()} · every 10s`
                  : 'Refreshes every 10 seconds'}
              </p>
            </div>
          </div>

          {/* ── Leaderboard Chart Container ──────────────────────── */}
          <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col min-h-[460px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedCategory}</h3>
                <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-0.5">Ranked by public vote count</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350">Live</span>
              </div>
            </div>

            <div className="flex-1 relative w-full h-[320px]">
              {loadingData ? (
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/20 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-400 dark:text-zinc-500">
                  No candidates in this category yet.
                </div>
              ) : null}

              <canvas ref={chartRef} className="w-full h-full" />
            </div>
          </div>
        </>
      )}

    </div>
  );
}
