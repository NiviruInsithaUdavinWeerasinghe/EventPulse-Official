import React, { useState, useEffect, useRef } from 'react';
import { authFetch } from '../../utils/api.js';
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  Loader2 
} from 'lucide-react';
import { Chart, registerables } from 'chart.js';

// Register all Chart.js components
Chart.register(...registerables);

export default function AnalyticsView() {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    peakCount: 0,
    peakHour: 'N/A',
    totalPings: 0,
    avgActive: 0
  });

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
          setSelectedEventId(json.data[0]._id); // Select first event by default
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

  // Fetch analytics data when selected event changes
  useEffect(() => {
    if (!selectedEventId) return;

    async function fetchAnalytics() {
      try {
        setLoadingData(true);
        setError(null);
        const res = await authFetch(`/api/events/${selectedEventId}/peak-hours`);
        if (!res.ok) throw new Error('Failed to fetch peak visitor data.');
        const json = await res.json();

        if (json.success) {
          const data = json.data;
          setAnalyticsData(data);

          // Calculate summary stats
          let maxCount = 0;
          let peakTime = 'N/A';
          let sumCount = 0;

          data.forEach(item => {
            sumCount += item.count;
            if (item.count > maxCount) {
              maxCount = item.count;
              peakTime = item.timeString;
            }
          });

          const avgActive = data.length > 0 ? Math.round(sumCount / data.length) : 0;

          setSummaryStats({
            peakCount: maxCount,
            peakHour: peakTime,
            totalPings: sumCount,
            avgActive
          });
        }
      } catch (err) {
        console.error('Error fetching peak visitor hours:', err);
        setError('Could not load analytics data for the selected event.');
      } finally {
        setLoadingData(false);
      }
    }

    fetchAnalytics();
  }, [selectedEventId]);

  // Render chart
  useEffect(() => {
    if (!chartRef.current || analyticsData.length === 0) return;

    // Destroy existing chart instance if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');

    // Create gradient fill for chart line
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)'); // indigo-500 with opacity
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.0)'); // purple-500 transparent

    // Determine grid color based on dark mode class
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(63, 63, 70, 0.3)' : 'rgba(226, 232, 240, 0.8)';
    const textColor = isDark ? '#a1a1aa' : '#64748b';

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: analyticsData.map(item => item.timeString),
        datasets: [{
          label: 'Active Users',
          data: analyticsData.map(item => item.count),
          borderColor: '#6366f1', // Indigo border
          borderWidth: 3,
          backgroundColor: gradient,
          fill: true,
          tension: 0.4, // smooth curve
          pointBackgroundColor: '#818cf8',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 8,
          pointHoverBackgroundColor: '#4f46e5',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true,
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(9, 10, 15, 0.95)',
            titleColor: '#ffffff',
            bodyColor: '#e2e8f0',
            borderColor: '#3f3f46',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 12,
            displayColors: false,
            callbacks: {
              // Custom tooltip matching requirement: 'Time: 14:00 | Active Users: 1,204'
              title: () => '', // Remove default title
              label: function(context) {
                const item = analyticsData[context.dataIndex];
                return `Time: ${item.formatted24h} | Active Users: ${context.parsed.y.toLocaleString()}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: {
                size: 11,
                weight: '600'
              },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 12
            }
          },
          y: {
            grid: {
              color: gridColor,
              drawBorder: false
            },
            ticks: {
              color: textColor,
              font: {
                size: 11,
                weight: '600'
              },
              precision: 0,
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            min: 0
          }
        }
      }
    });

    // Cleanup chart on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [analyticsData]);

  // Loading events state
  if (loadingEvents) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
        <p className="text-slate-500 dark:text-zinc-400 text-sm font-semibold">Loading events metadata...</p>
      </div>
    );
  }

  const selectedEvent = events.find(e => e._id === selectedEventId);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-zinc-900/80 pb-6">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={22} className="text-indigo-650 dark:text-indigo-400" />
            Crowd Traffic Analytics
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1">
            View visitor peak hours and unique active attendees throughout the exhibition
          </p>
        </div>

        {/* Event Selector Dropdown */}
        {events.length > 0 && (
          <div className="relative min-w-[240px]">
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
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl text-center shadow-xs">
          <Calendar size={48} className="text-slate-300 dark:text-zinc-700 mb-4" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">No events found</h3>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 max-w-xs">
            Create an event in the Event Management panel first before viewing visitor analytics.
          </p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/50 text-rose-700 dark:text-rose-400 rounded-2xl text-xs font-bold">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* ── Analytics Overview Cards ─────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Peak Active Hours</p>
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Clock size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {loadingData ? '...' : summaryStats.peakHour}
              </h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-1.5">Hour of the day with maximum unique attendee presence</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Peak Visitor Count</p>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Users size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {loadingData ? '...' : `${summaryStats.peakCount.toLocaleString()} Users`}
              </h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-1.5">Maximum concurrent users active inside the venue</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Average Hourly Users</p>
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <TrendingUp size={18} />
                </div>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {loadingData ? '...' : `${summaryStats.avgActive.toLocaleString()} Users`}
              </h3>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-1.5">Average active attendee presence normalized over 24h</p>
            </div>

          </div>

          {/* ── Main Chart Container ─────────────────────────────── */}
          <div className="bg-white dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm flex flex-col min-h-[460px] relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hourly Visitor Traffic Trend</h3>
                <p className="text-slate-400 dark:text-zinc-500 text-[10px] mt-0.5">Line representation of unique visitor presence</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350">Active Users</span>
              </div>
            </div>

            <div className="flex-1 relative w-full h-[320px]">
              {loadingData ? (
                <div className="absolute inset-0 bg-white/50 dark:bg-zinc-950/20 backdrop-blur-xs flex items-center justify-center z-10">
                  <Loader2 className="w-8 h-8 text-indigo-650 animate-spin" />
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
