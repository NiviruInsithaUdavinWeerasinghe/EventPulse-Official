import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Calendar } from 'lucide-react';

const API_BASE = '/api';

// --- Decode JWT role from localStorage --------------------------------------
function getRoleFromToken() {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
    return payload.role || null;
  } catch {
    return null;
  }
}

// --- Category colour map (EP-22: Visual Block Distinction) ------------------
const CATEGORY_STYLES = {
  'Cybersecurity':           { fill: 'rgba(6,   182, 212, 0.18)', stroke: '#06b6d4' },
  'Biotechnology':           { fill: 'rgba(132, 204,  22, 0.18)', stroke: '#84cc16' },
  'Artificial Intelligence': { fill: 'rgba(139,  92, 246, 0.2)',  stroke: '#8b5cf6' },
  'Clean Energy':            { fill: 'rgba(234, 179,   8, 0.18)', stroke: '#eab308' },
  'Robotics':                { fill: 'rgba(239,  68,  68, 0.2)',  stroke: '#ef4444' },
  'Hardware':                { fill: 'rgba(99,  102, 241, 0.2)',  stroke: '#6366f1' },
  'Presentation Area':       { fill: 'rgba(245, 158,  11, 0.18)', stroke: '#f59e0b' },
  'Refreshments':            { fill: 'rgba(16,  185, 129, 0.18)', stroke: '#10b981' },
  'Restrooms':               { fill: 'rgba(20,  184, 166, 0.18)', stroke: '#14b8a6' },
};
const DEFAULT_ZONE_STYLE = { fill: 'rgba(37, 99, 235, 0.2)', stroke: '#3b82f6' };

export default function MapViewer({ eventId: propEventId }) {
  const { eventId: paramEventId } = useParams();
  const eventId = propEventId || paramEventId;
  const navigate = useNavigate();

  const userRole = useMemo(() => getRoleFromToken(), []);
  // isEditorMode kept so teammates can plug in without restructuring
  const isEditorMode = userRole === 'vendor'; // eslint-disable-line no-unused-vars

  // --- Data States ----------------------------------------------------------
  const [event, setEvent]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  // EP-22: Polygon selector — tracks the currently highlighted zone
  const [selectedStall, setSelectedStall] = useState(null);

  // --- SVG States -----------------------------------------------------------
  const [clientSvgContent, setClientSvgContent] = useState(null);
  const [svgDimensions, setSvgDimensions]       = useState({ w: 1000, h: 600 });

  // --- Fetch Event ----------------------------------------------------------
  const fetchEvent = async () => {
    try {
      const res  = await fetch(`${API_BASE}/events/${eventId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Event not found.');
      setEvent(data.data);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchEvent();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pre-process SVG (EP-22: inject selectable-shape class on every polygon)
  const processSvgText = useCallback((text) => {
    try {
      const cleaned = text.replace(/<\?xml.*?\?>/gi, '').trim();
      const parser  = new DOMParser();
      const doc     = parser.parseFromString(cleaned, 'image/svg+xml');
      const svg     = doc.querySelector('svg');

      if (svg) {
        let viewBoxWidth = 1000, viewBoxHeight = 600;
        const viewBox = svg.getAttribute('viewBox');
        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/).map(Number);
          if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
            viewBoxWidth = parts[2]; viewBoxHeight = parts[3];
          }
        } else {
          const w = parseFloat(svg.getAttribute('width'));
          const h = parseFloat(svg.getAttribute('height'));
          if (w > 0 && h > 0) { viewBoxWidth = w; viewBoxHeight = h; }
        }

        const svgArea = viewBoxWidth * viewBoxHeight;
        const shapes  = doc.querySelectorAll('path, rect, polygon, circle, ellipse');

        shapes.forEach((shape, index) => {
          if (!shape.getAttribute('id')) shape.setAttribute('id', `vector-shape-${index}`);

          const tagName = shape.tagName.toLowerCase();
          let shapeArea = svgArea;
          if (tagName === 'rect') {
            shapeArea = parseFloat(shape.getAttribute('width') || 0) *
                        parseFloat(shape.getAttribute('height') || 0);
          } else if (tagName === 'circle') {
            const r = parseFloat(shape.getAttribute('r') || 0);
            shapeArea = Math.PI * r * r;
          }
          if (tagName === 'rect' && shapeArea > svgArea * 0.8) return;

          // EP-22: every interactive polygon gets this class
          shape.classList.add('selectable-shape');
        });

        setSvgDimensions({ w: viewBoxWidth, h: viewBoxHeight });
        setClientSvgContent(new XMLSerializer().serializeToString(doc));
      } else {
        setClientSvgContent(cleaned);
      }
      setIsLoading(false);
    } catch (err) {
      console.error('SVG pre-processing error:', err);
      setClientSvgContent(text);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!event) return;
    const isSvg =
      event.floorMapUrl &&
      (event.floorMapUrl.toLowerCase().endsWith('.svg') || event.floorMapFileType === 'svg');
    if (!isSvg) { setIsLoading(false); return; }
    if (event.rawSvgContent) {
      processSvgText(event.rawSvgContent);
    } else {
      fetch(event.floorMapUrl)
        .then(r => r.text())
        .then(processSvgText)
        .catch(() => setIsLoading(false));
    }
  }, [event, processSvgText]);

  // --- Zone colour + selection styles (EP-22: Visual Block Distinction) ------
  const attendeeStyles = useMemo(() => {
    if (!event?.zones) return '';
    let css = '';

    event.zones.forEach(stall => {
      const { fill, stroke } = CATEGORY_STYLES[stall.category] || DEFAULT_ZONE_STYLE;
      css += `
        #blueprint-wrapper [id="${stall.id}" i] {
          fill: ${fill} !important;
          stroke: ${stroke} !important;
          stroke-width: 2px !important;
          cursor: pointer !important;
          transition: fill 0.15s ease, stroke 0.15s ease !important;
        }
        #blueprint-wrapper [id="${stall.id}" i]:hover {
          fill: rgba(255, 255, 255, 0.12) !important;
          stroke: rgba(255, 255, 255, 0.5) !important;
        }
      `;
    });

    // EP-22: Selected polygon highlight
    if (selectedStall) {
      css += `
        #blueprint-wrapper [id="${selectedStall.id}" i],
        #blueprint-wrapper [id="${selectedStall.id}" i]:hover {
          fill:   rgba(234, 88, 12, 0.45) !important;
          stroke: #ea580c !important;
          stroke-width: 3.5px !important;
          filter: drop-shadow(0 0 6px rgba(234, 88, 12, 0.4)) !important;
        }
      `;
    }

    return css;
  }, [event, selectedStall]);

  // --- Shape click handler (EP-22: Interactive Polygon Selector) ------------
  // Sachin (EP-42) will extend this with a richer handler for the info card.
  const handleMapClick = useCallback((e) => {
    const target  = e.target;
    const tagName = target.tagName?.toLowerCase?.() || '';
    const isSvgShape = ['path', 'rect', 'polygon', 'circle', 'ellipse'].includes(tagName);

    if (!isSvgShape) { setSelectedStall(null); return; }

    const shapeId = target.getAttribute('id') || '';

    const zone = event?.zones?.find(z => z.id && z.id.toLowerCase() === shapeId.toLowerCase())
      ?? event?.zones?.find(z => z.id && shapeId.toLowerCase().includes(z.id.toLowerCase()));

    if (zone) { setSelectedStall(zone); return; }

    setSelectedStall({
      id: shapeId,
      name: `Space ${shapeId.replace(/^vector-shape-/, '#').replace(/^shape-/, '#')}`,
      category: 'Untagged',
    });
  }, [event]);

  // --- Helpers --------------------------------------------------------------
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 h-[calc(100vh-80px)] text-slate-500">
        <div className="w-10 h-10 border-[3px] border-indigo-500/15 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm">Loading floor map...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center gap-5 h-[calc(100vh-80px)] text-slate-500">
        <span className="text-5xl">warning</span>
        <p className="text-red-400 font-semibold">{error || 'Failed to load event data.'}</p>
        <button
          onClick={() => navigate('/events')}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer text-xs"
        >
          Back to Events List
        </button>
      </div>
    );
  }

  const isSvgMap =
    event.floorMapUrl &&
    (event.floorMapUrl.toLowerCase().endsWith('.svg') || event.floorMapFileType === 'svg');

  return (
    <div className="flex flex-col h-screen bg-[#030712] text-slate-100 font-sans">

      {attendeeStyles && <style dangerouslySetInnerHTML={{ __html: attendeeStyles }} />}

      <header className="h-14 shrink-0 bg-[#0b0f19]/90 backdrop-blur-md border-b border-white/5 px-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            Back
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div>
            <h1 className="text-sm font-bold text-slate-50 leading-none">{event.name}</h1>
            {formatDate(event.date) && (
              <p className="text-[0.65rem] text-rose-400 font-semibold mt-0.5">
                {formatDate(event.date)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* EP-23 (Hirantha): zoom badge goes here */}
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[0.65rem] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase">
            Interactive Plan Mode
          </span>
          <a
            href={event.floorMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-400/50 px-3 py-1.5 rounded-lg transition-all"
          >
            Open Original <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* EP-22: Map canvas — SVG renderer + polygon click selector */}
        {/* EP-23 (Hirantha): wrap inner div with transform-based zoom/pan */}
        <div className="flex-1 overflow-auto relative map-grid-bg">
          <div className="min-h-full min-w-full flex items-center justify-center p-6">
            {isSvgMap && clientSvgContent ? (
              <div
                id="blueprint-wrapper"
                className="attendee-svg-container"
                dangerouslySetInnerHTML={{ __html: clientSvgContent }}
                onClick={handleMapClick}
                style={{ lineHeight: 0, userSelect: 'none', cursor: 'default' }}
              />
            ) : (
              <img
                src={event.floorMapUrl}
                alt={`${event.name} floor map`}
                className="block max-w-full pointer-events-none rounded-lg"
                draggable={false}
              />
            )}
          </div>

          {/* EP-22: Map Legend */}
          {event?.zones?.length > 0 && (() => {
            const used = [...new Map(
              event.zones
                .filter(z => z.category)
                .map(z => [z.category, (CATEGORY_STYLES[z.category] || DEFAULT_ZONE_STYLE).stroke])
            ).entries()];
            if (used.length === 0) return null;
            return (
              <div className="absolute bottom-5 left-5 flex flex-col gap-1.5 z-20 text-[0.65rem] text-slate-400 bg-[#0b0f19]/80 border border-white/8 backdrop-blur-md rounded-xl px-3 py-2.5">
                <p className="font-bold text-[0.6rem] text-slate-600 uppercase tracking-widest mb-0.5">
                  Map Legend
                </p>
                {used.map(([category, color]) => (
                  <div key={category} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: 0.85 }} />
                    <span>{category}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* EP-23 (Hirantha): zoom control buttons go here */}
        </div>

        {/* Right Sidebar */}
        <aside className="w-[280px] shrink-0 bg-[#0b0f19]/95 border-l border-white/5 overflow-y-auto p-5 flex flex-col gap-4">

          {/* EP-39/86 (Gajindu): editor panel goes here (isEditorMode === true) */}
          {/* EP-42/43 (Sachin & Mesanda): stall info card goes here */}

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-50">Map Controls</h2>
            <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[0.62rem] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
              View
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[0.65rem] font-semibold text-slate-600 uppercase tracking-widest">Event</p>
            <p className="text-sm text-slate-200 leading-relaxed">{event.name}</p>
          </div>

          {event.description && (
            <div className="flex flex-col gap-1">
              <p className="text-[0.65rem] font-semibold text-slate-600 uppercase tracking-widest">Description</p>
              <p className="text-xs text-slate-400 leading-relaxed">{event.description}</p>
            </div>
          )}

          {formatDate(event.date) && (
            <div className="flex flex-col gap-1">
              <p className="text-[0.65rem] font-semibold text-slate-600 uppercase tracking-widest">Date</p>
              <p className="text-sm text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                {formatDate(event.date)}
              </p>
            </div>
          )}

          <div className="h-px bg-white/5" />

          <p className="text-[0.7rem] text-slate-500 leading-relaxed">
            Click any highlighted zone on the floor plan to select it.
            {event?.zones?.length > 0
              ? ` ${event.zones.length} zone${event.zones.length > 1 ? 's' : ''} mapped.`
              : ' No zones mapped yet.'}
          </p>

        </aside>
      </div>
    </div>
  );
}
