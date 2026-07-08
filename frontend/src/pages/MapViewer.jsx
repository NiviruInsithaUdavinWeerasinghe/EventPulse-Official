import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ExternalLink, Calendar, Plus, Minus, RefreshCw, Trash2, Layers, Sparkles, MapPin, Tag, X, Bath, HeartPulse, DoorOpen, Flame } from 'lucide-react';
import { createPortal } from 'react-dom';

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

const CATEGORY_ICON_MAP = {
  'Restrooms':         { Icon: Bath,       color: '#0d9488' },
  'First Aid':         { Icon: HeartPulse, color: '#e53e3e' },
  'Exit':              { Icon: DoorOpen,   color: '#276749' },
  'Fire Extinguisher': { Icon: Flame,      color: '#c05621' },
};

const LS_ZOOM_KEY = 'ep-map-zoom';
const DEFAULT_ZOOM = 1.25;
const getInitialScale = () => {
  try {
    const saved = parseFloat(localStorage.getItem(LS_ZOOM_KEY));
    if (!isNaN(saved) && saved >= 0.3 && saved <= 5) return saved;
  } catch (_) {}
  return DEFAULT_ZOOM;
};

export default function MapViewer({ eventId: propEventId }) {
  const { eventId: paramEventId } = useParams();
  const eventId = propEventId || paramEventId;
  const navigate = useNavigate();

  const userRole = useMemo(() => getRoleFromToken(), []);
  // isEditorMode kept so teammates can plug in without restructuring
  const isEditorMode = userRole === 'vendor'; // eslint-disable-line no-unused-vars

  // ─── Editor States (EP-39 / EP-86) ────────────────────────────────────────
  const [selectedShapes, setSelectedShapes] = useState([]); // [{ id, center }]
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [batchTagData, setBatchTagData]     = useState({ prefix: '', startNum: '1', commonTitle: 'Booth', category: 'Cybersecurity' });
  const [singleTagData, setSingleTagData]   = useState({ id: '', name: '', category: 'Cybersecurity' });
  const [isSaving, setIsSaving]             = useState(false);

  // ─── Toast (shared utility — keep if not already present) ─────────────────
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = 'error') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  // --- Data States ----------------------------------------------------------
  const [event, setEvent]         = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState('');

  // EP-22: Polygon selector — tracks the currently highlighted zone
  const [selectedStall, setSelectedStall] = useState(null);

  // --- SVG States -----------------------------------------------------------
  const [clientSvgContent, setClientSvgContent] = useState(null);
  const [svgDimensions, setSvgDimensions]       = useState({ w: 1000, h: 600 });

  // ─── Pan / Zoom States (EP-23) ─────────────────────────────────────────────
  const [scale, setScale] = useState(getInitialScale);
  const [pan, setPan]     = useState({ x: 0, y: 0 });
  const [zoomInput, setZoomInput]       = useState('');
  const [isEditingZoom, setIsEditingZoom] = useState(false);
  const [touchStartDist, setTouchStartDist]   = useState(0);
  const [touchStartScale, setTouchStartScale] = useState(1);

  // ─── Draggable icon positions (keyed by category, persisted per event) ─────
  const [iconPositions, setIconPositions] = useState({});

  // Live refs — kept in sync synchronously to avoid stale-closure glitches
  const scaleRef        = useRef(getInitialScale());
  const panRef          = useRef({ x: 0, y: 0 });
  const dragStartRef    = useRef(null);    // { clientX, clientY, panX, panY, target }
  const isDragActiveRef = useRef(false);   // true once movement exceeds 4 px threshold
  const containerRef    = useRef(null);
  const centeredRef     = useRef(false);
  const iconDragRef     = useRef(null);    // { zoneId, startSvgX, startSvgY, startCx, startCy }

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

  // Load only explicitly saved icon positions for this event from localStorage
  useEffect(() => {
    if (!eventId) return;
    const stored = {};
    Object.keys(CATEGORY_ICON_MAP).forEach(cat => {
      try {
        const saved = localStorage.getItem(`ep-icon-${eventId}-${cat}`);
        if (saved) stored[cat] = JSON.parse(saved);
      } catch { /* ignore */ }
    });
    setIconPositions(stored);
  }, [eventId]);

  // Reset centered state on event change
  useEffect(() => {
    centeredRef.current = false;
  }, [eventId]);

  // ─── Center map once SVG content + container are ready ────────────────────
  useEffect(() => {
    if (!clientSvgContent || centeredRef.current) return;
    const raf = requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const targetScale = scaleRef.current;
      const centeredPan = {
        x: (cw - svgDimensions.w * targetScale) / 2,
        y: (ch - svgDimensions.h * targetScale) / 2,
      };
      panRef.current   = centeredPan;
      scaleRef.current = targetScale;
      setPan(centeredPan);
      setScale(targetScale);
      centeredRef.current = true;
    });
    return () => cancelAnimationFrame(raf);
  }, [clientSvgContent, svgDimensions]);

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

  // Orange highlight for all shapes currently in the editor selection
  const selectedShapesStyles = useMemo(() => {
    if (selectedShapes.length === 0) return '';
    return selectedShapes.map(shape => `
      #blueprint-wrapper #${shape.id} {
        fill: rgba(234, 88, 12, 0.45) !important;
        stroke: #ea580c !important;
        stroke-width: 3.5px !important;
      }
      #blueprint-wrapper #${shape.id}:hover {
        fill: rgba(234, 88, 12, 0.45) !important;
        stroke: #ea580c !important;
        stroke-width: 3.5px !important;
      }
    `).join('\n');
  }, [selectedShapes]);

  // Call this from handleMouseUp when isEditorMode === true and click is detected
  function handleEditorShapeClick(target) {
    const tagName  = target.tagName?.toLowerCase?.() || '';
    const isSvgShape = ['path', 'rect', 'polygon', 'circle', 'ellipse'].includes(tagName);
    if (!isSvgShape) return;

    const shapeId = target.getAttribute('id') || '';
    const wrapper = document.getElementById('blueprint-wrapper');
    const wrapperSvg = wrapper?.querySelector('svg');
    let center = { x: 500, y: 300 };
    if (wrapperSvg && target.getBBox) {
      try {
        const bbox = target.getBBox();
        center = { x: Math.round(bbox.x + bbox.width / 2), y: Math.round(bbox.y + bbox.height / 2) };
      } catch {
        // ignore
      }
    }
    setSelectedShapes(prev => {
      const exists = prev.find(s => s.id.toLowerCase() === shapeId.toLowerCase());
      if (exists) return prev.filter(s => s.id.toLowerCase() !== shapeId.toLowerCase());
      return [...prev, { id: shapeId, center }];
    });
  }

  const handleOpenTagModal = useCallback(() => {
    if (event?.zones && selectedShapes.length > 0) {
      if (selectedShapes.length === 1) {
        const existing = event.zones.find(z =>
          z.id.toLowerCase() === selectedShapes[0].id.toLowerCase()
        );
        setSingleTagData(
          existing
            ? { id: existing.id, name: existing.name, category: existing.category }
            : { id: '', name: '', category: singleTagData.category }
        );
      } else {
        const existingMatches = selectedShapes
          .map(s => event.zones.find(z => z.id.toLowerCase() === s.id.toLowerCase()))
          .filter(Boolean);
        if (existingMatches.length > 0) {
          const parsed = existingMatches
            .map(z => { const m = z.id.match(/^([A-Za-z\-_]+)(\d+)$/i); return m ? { zone: z, prefix: m[1].toUpperCase(), num: parseInt(m[2], 10) } : null; })
            .filter(Boolean);
          if (parsed.length > 0) {
            parsed.sort((a, b) => a.num - b.num);
            const { zone, prefix, num } = parsed[0];
            const commonTitle = zone.name.replace(new RegExp(`\\s*${zone.id}\\s*$`, 'i'), '').trim() || batchTagData.commonTitle;
            setBatchTagData({ prefix, startNum: String(num), commonTitle, category: zone.category || batchTagData.category });
          }
        }
      }
    }
    setIsModalOpen(true);
  }, [event, selectedShapes, batchTagData, singleTagData.category]);

  const handleBatchSaveZones = async (e) => {
    e.preventDefault();
    if (selectedShapes.length === 0) return;

    // ── SINGLE shape ──────────────────────────────────────────────────────
    if (selectedShapes.length === 1) {
      const shape    = selectedShapes[0];
      const seqId    = singleTagData.id.trim().toUpperCase();
      const name     = singleTagData.name.trim();
      const category = singleTagData.category;
      if (!seqId || !name) return;

      setIsSaving(true);
      let updatedZones = event.zones ? [...event.zones] : [];
      const el = document.getElementById(shape.id);
      if (el) { el.setAttribute('id', seqId); el.setAttribute('name', name); el.setAttribute('category', category); }

      const completedZone = { id: seqId, name, category, center: shape.center };
      const existsIndex = updatedZones.findIndex(z => z.id.toUpperCase() === shape.id.toUpperCase());
      if (existsIndex > -1) updatedZones[existsIndex] = completedZone;
      else updatedZones.push(completedZone);

      const wrapper = document.getElementById('blueprint-wrapper');
      try {
        const res = await fetch(`/api/events/${eventId}/zones`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ zones: updatedZones, rawSvgContent: wrapper?.innerHTML || null })
        });
        if (res.ok) {
          await fetchEvent(); setSelectedShapes([]); setIsModalOpen(false);
          addToast(`Zone ${seqId} saved.`, 'success');
        } else { const errData = await res.json(); addToast(`Failed to save: ${errData.message || 'Unknown error'}`); }
      } catch (err) { console.error(err); addToast('Network error — zone could not be saved.'); }
      finally { setIsSaving(false); }
      return;
    }

    // ── BATCH ─────────────────────────────────────────────────────────────
    const prefix = batchTagData.prefix.toUpperCase();
    let startNum = parseInt(batchTagData.startNum, 10);
    if (isNaN(startNum)) startNum = 1;

    // Conflict check: block if more than 1 selected shape is already a saved zone
    const conflictIds = selectedShapes
      .map(shape => event.zones?.find(z => z.id.toLowerCase() === shape.id.toLowerCase())?.id)
      .filter(Boolean);
    if (conflictIds.length > 1) {
      addToast(`ID conflict: ${conflictIds.join(', ')} are already saved zones. Use a different prefix or start number.`, 'error');
      return;
    }

    setIsSaving(true);
    let updatedZones = event.zones ? [...event.zones] : [];

    selectedShapes.forEach((shape, index) => {
      const seqId = `${prefix}${startNum + index}`;
      const name  = `${batchTagData.commonTitle} ${seqId}`;
      const category = batchTagData.category;
      const el = document.getElementById(shape.id);
      if (el) { el.setAttribute('id', seqId); el.setAttribute('name', name); el.setAttribute('category', category); }
      const completedZone = { id: seqId, name, category, center: shape.center };
      const existsIndex = updatedZones.findIndex(z => z.id.toUpperCase() === shape.id.toUpperCase());
      if (existsIndex > -1) updatedZones[existsIndex] = completedZone;
      else updatedZones.push(completedZone);
    });

    const wrapper = document.getElementById('blueprint-wrapper');
    try {
      const res = await fetch(`/api/events/${eventId}/zones`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: updatedZones, rawSvgContent: wrapper?.innerHTML || null })
      });
      if (res.ok) {
        await fetchEvent(); setSelectedShapes([]); setIsModalOpen(false);
        addToast(`${selectedShapes.length} zone${selectedShapes.length > 1 ? 's' : ''} saved successfully.`, 'success');
      } else { const errData = await res.json(); addToast(`Failed to save: ${errData.message || 'Unknown error'}`); }
    } catch (err) { console.error(err); addToast('Network error — zones could not be saved.'); }
    finally { setIsSaving(false); }
  };

  const handleDeleteZone = async (zoneId) => {
    const el = document.getElementById(zoneId);
    // eslint-disable-next-line react-hooks/purity
    if (el) el.setAttribute('id', `shape-${Math.floor(1000 + Math.random() * 9000)}`);
    const updatedZones = event.zones.filter(z => z.id !== zoneId);
    const wrapper = document.getElementById('blueprint-wrapper');
    try {
      const res = await fetch(`/api/events/${eventId}/zones`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zones: updatedZones, rawSvgContent: wrapper?.innerHTML || null })
      });
      if (res.ok) await fetchEvent();
    } catch (err) { console.error(err); }
  };

  // EP-42: Enhanced shape click — triggers informational callback for zones
  const handleMapClick = useCallback((e) => {
    const target  = e.target;
    if (!target) return;
    const tagName    = target.tagName?.toLowerCase?.() || '';
    const isSvgShape = ['path', 'rect', 'polygon', 'circle', 'ellipse'].includes(tagName);

    // Click on canvas background (non-shape) → dismiss any open card
    if (!isSvgShape) {
      setSelectedStall(null);
      return;
    }

    const rawId = target.getAttribute('id') || '';

    // 1. Exact ID match against saved zones
    const exactZone = event?.zones?.find(
      z => z.id && z.id.toLowerCase() === rawId.toLowerCase()
    );

    if (exactZone) {
      setSelectedStall({
        id:       exactZone.id,
        name:     exactZone.name || exactZone.id,
        category: exactZone.category || 'Uncategorised',
        center:   exactZone.center || null,
      });
      return;
    }

    // 2. Partial match (handles minor ID prefix/suffix variations)
    const partialZone = event?.zones?.find(
      z => z.id && rawId.toLowerCase().includes(z.id.toLowerCase())
    );

    if (partialZone) {
      setSelectedStall({
        id:       partialZone.id,
        name:     partialZone.name || partialZone.id,
        category: partialZone.category || 'Uncategorised',
        center:   partialZone.center || null,
      });
      return;
    }

    // 3. Untagged / unknown shape — still provide visual feedback
    setSelectedStall({
      id:       rawId,
      name:     `Space ${rawId.replace(/^vector-shape-/, '#').replace(/^shape-/, '#')}`,
      category: 'Untagged Space',
      center:   null,
    });
  }, [event]);

  // --- Helpers --------------------------------------------------------------
  // ─── Zoom helpers — all use refs, no stale-closure issues ─────────────────
  const applyZoom = useCallback((newScale, originX, originY) => {
    const clamped = Math.min(Math.max(newScale, 0.3), 5);
    const ratio   = clamped / scaleRef.current;
    const newPan  = {
      x: originX - ratio * (originX - panRef.current.x),
      y: originY - ratio * (originY - panRef.current.y),
    };
    scaleRef.current = clamped;
    panRef.current   = newPan;
    setScale(clamped);
    setPan(newPan);
    try { localStorage.setItem(LS_ZOOM_KEY, clamped.toFixed(4)); } catch { /* ignore */ }
  }, []);

  const zoomAtCenter = useCallback((factor) => {
    const c = containerRef.current;
    if (!c) return;
    applyZoom(scaleRef.current * factor, c.clientWidth / 2, c.clientHeight / 2);
  }, [applyZoom]);

  const handleZoomIn  = useCallback(() => zoomAtCenter(1.15),     [zoomAtCenter]);
  const handleZoomOut = useCallback(() => zoomAtCenter(1 / 1.15), [zoomAtCenter]);

  const handleResetZoom = useCallback(() => {
    if (!containerRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const newPan = {
      x: (cw - svgDimensions.w * DEFAULT_ZOOM) / 2,
      y: (ch - svgDimensions.h * DEFAULT_ZOOM) / 2,
    };
    scaleRef.current = DEFAULT_ZOOM;
    panRef.current   = newPan;
    setScale(DEFAULT_ZOOM);
    setPan(newPan);
    try { localStorage.setItem(LS_ZOOM_KEY, DEFAULT_ZOOM.toFixed(4)); } catch { /* ignore */ }
  }, [svgDimensions]);

  const applyZoomInput = useCallback(() => {
    const pct = parseInt(zoomInput, 10);
    if (!isNaN(pct) && pct > 0) {
      const c = containerRef.current;
      if (c) applyZoom(pct / 100, c.clientWidth / 2, c.clientHeight / 2);
    }
    setIsEditingZoom(false);
    setZoomInput('');
  }, [zoomInput, applyZoom]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    dragStartRef.current = {
      clientX: e.clientX, clientY: e.clientY,
      panX: panRef.current.x, panY: panRef.current.y,
      target: e.target,
    };
    isDragActiveRef.current = false;
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    // ── Icon drag takes priority over map pan ──────────────────────────────
    if (iconDragRef.current) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const svgX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
        const svgY = (e.clientY - rect.top  - panRef.current.y) / scaleRef.current;
        const { zoneId, startSvgX, startSvgY, startCx, startCy } = iconDragRef.current;
        setIconPositions(prev => ({
          ...prev,
          [zoneId]: { x: startCx + svgX - startSvgX, y: startCy + svgY - startSvgY },
        }));
      }
      return;
    }
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    if (!isDragActiveRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4))
      isDragActiveRef.current = true;
    if (isDragActiveRef.current) {
      const newPan = { x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy };
      panRef.current = newPan;
      setPan(newPan);
    }
  };

  const handleMouseUp = () => {
    if (iconDragRef.current) {
      const { zoneId } = iconDragRef.current;
      const pos = iconPositions[zoneId];
      if (pos && eventId) {
        try { localStorage.setItem(`ep-icon-${eventId}-${zoneId}`, JSON.stringify(pos)); } catch { /* ignore */ }
      }
      iconDragRef.current = null;
      return;
    }
    if (!dragStartRef.current) return;
    if (!isDragActiveRef.current) {
      // Short click — delegate to shape-selection logic
      const target = dragStartRef.current.target;
      const tagName = target.tagName?.toLowerCase?.() || '';
      const isSvgShape = ['path', 'rect', 'polygon', 'circle', 'ellipse'].includes(tagName);
      if (isSvgShape) {
        if (isEditorMode) {
          handleEditorShapeClick(target);
        } else {
          // Call handleMapClick from Niviru's code (or Sachin's handler)
          handleMapClick({ target });
        }
      }
    }
    dragStartRef.current  = null;
    isDragActiveRef.current = false;
  };

  const handleMouseLeave = () => {
    iconDragRef.current = null;
    if (isDragActiveRef.current) {
      dragStartRef.current  = null;
      isDragActiveRef.current = false;
    }
  };

  // Cursor-relative wheel zoom — must use passive: false to call preventDefault
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect   = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta  = e.deltaY < 0 ? 1.1 : 0.9;
    applyZoom(scaleRef.current * delta, mouseX, mouseY);
  }, [applyZoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel, isLoading]); // re-attach after loading so ref is populated

  const getTouchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setTouchStartDist(getTouchDist(e.touches));
      setTouchStartScale(scaleRef.current);
      dragStartRef.current = null;
    } else if (e.touches.length === 1) {
      dragStartRef.current = {
        clientX: e.touches[0].clientX, clientY: e.touches[0].clientY,
        panX: panRef.current.x, panY: panRef.current.y,
        target: e.target,
      };
      isDragActiveRef.current = false;
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && touchStartDist > 0) {
      const newDist  = getTouchDist(e.touches);
      const newScale = Math.min(Math.max(touchStartScale * (newDist / touchStartDist), 0.3), 5);
      scaleRef.current = newScale;
      setScale(newScale);
    } else if (e.touches.length === 1 && dragStartRef.current) {
      const dx = e.touches[0].clientX - dragStartRef.current.clientX;
      const dy = e.touches[0].clientY - dragStartRef.current.clientY;
      if (!isDragActiveRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4))
        isDragActiveRef.current = true;
      if (isDragActiveRef.current) {
        const newPan = { x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy };
        panRef.current = newPan;
        setPan(newPan);
      }
    }
  };

  const handleTouchEnd = () => {
    dragStartRef.current  = null;
    isDragActiveRef.current = false;
    setTouchStartDist(0);
  };

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
      {selectedShapesStyles && <style dangerouslySetInnerHTML={{ __html: selectedShapesStyles }} />}

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
          {/* ── Zoom badge ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/8 rounded-lg overflow-hidden">
            <button onClick={handleZoomOut} title="Zoom Out"
              className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold cursor-pointer">−</button>
            <div className="h-4 w-px bg-white/10" />
            {isEditingZoom ? (
              <input type="number" value={zoomInput}
                onChange={(e) => setZoomInput(e.target.value)}
                onBlur={applyZoomInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyZoomInput();
                  if (e.key === 'Escape') { setIsEditingZoom(false); setZoomInput(''); }
                }}
                autoFocus
                className="w-14 text-center text-[0.65rem] font-mono bg-transparent border-none outline-none text-slate-100 py-1"
              />
            ) : (
              <button onClick={() => { setIsEditingZoom(true); setZoomInput(String(Math.round(scale * 100))); }}
                title="Click to type a zoom %"
                className="w-14 text-center text-[0.65rem] font-mono text-slate-400 hover:text-white py-1 cursor-text transition-colors">
                {Math.round(scale * 100)}%
              </button>
            )}
            <div className="h-4 w-px bg-white/10" />
            <button onClick={handleZoomIn} title="Zoom In"
              className="px-2 py-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs font-bold cursor-pointer">+</button>
          </div>
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

        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative select-none map-grid-bg cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Panning / zoom wrapper */}
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', display: 'inline-block' }}>
            <div className="min-h-full min-w-full flex items-center justify-center p-6">
              {isSvgMap && clientSvgContent ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div
                    id="blueprint-wrapper"
                    className={isEditorMode ? "" : "attendee-svg-container"}
                    dangerouslySetInnerHTML={{ __html: clientSvgContent }}
                    style={{ lineHeight: 0, userSelect: 'none', cursor: 'default' }}
                  />
                  <svg
                    viewBox={`0 0 ${svgDimensions.w} ${svgDimensions.h}`}
                    width={svgDimensions.w}
                    height={svgDimensions.h}
                    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
                  >
                    {Object.entries(CATEGORY_ICON_MAP).map(([category, { Icon, color }], index) => {
                      const iconDefaults = [
                        { xFrac: 0.10, yFrac: 0.08 },
                        { xFrac: 0.25, yFrac: 0.08 },
                        { xFrac: 0.40, yFrac: 0.08 },
                        { xFrac: 0.55, yFrac: 0.08 },
                      ];
                      const savedPos = iconPositions[category];
                      const cx = savedPos ? savedPos.x : iconDefaults[index].xFrac * svgDimensions.w;
                      const cy = savedPos ? savedPos.y : iconDefaults[index].yFrac * svgDimensions.h;
                      return (
                        <g
                          key={`icon-${category}`}
                          style={{ pointerEvents: 'all', cursor: 'grab' }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            const rect = containerRef.current?.getBoundingClientRect();
                            if (rect) {
                              const svgX = (e.clientX - rect.left - panRef.current.x) / scaleRef.current;
                              const svgY = (e.clientY - rect.top  - panRef.current.y) / scaleRef.current;
                              iconDragRef.current = { zoneId: category, startSvgX: svgX, startSvgY: svgY, startCx: cx, startCy: cy };
                            }
                          }}
                        >
                          <circle cx={cx} cy={cy} r={14} fill={color} />
                          <foreignObject x={cx - 10} y={cy - 10} width={20} height={20} style={{ pointerEvents: 'none' }}>
                            <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                              <Icon size={13} color="white" strokeWidth={2.5} />
                            </div>
                          </foreignObject>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              ) : (
                <img
                  src={event.floorMapUrl}
                  alt={`${event.name} floor map`}
                  className="block max-w-full pointer-events-none rounded-lg"
                  draggable={false}
                />
              )}
            </div>
          </div>

          {/* EP-22: Map Legend */}
          {(() => {
            const used = event?.zones?.length > 0
              ? [...new Map(
                  event.zones
                    .filter(z => z.category)
                    .map(z => [z.category, (CATEGORY_STYLES[z.category] || DEFAULT_ZONE_STYLE).stroke])
                ).entries()]
              : [];
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
                {used.length > 0 && <div className="h-px bg-white/10 my-0.5" />}
                <p className="font-bold text-[0.6rem] text-slate-600 uppercase tracking-widest mb-0.5">
                  Safety Landmarks
                </p>
                {Object.entries(CATEGORY_ICON_MAP).map(([category, { Icon, color }]) => (
                  <div key={category} className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>
                      <Icon size={9} color="white" strokeWidth={2.5} />
                    </span>
                    <span>{category}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* EP-23 (Hirantha): zoom control buttons go here */}
          <div className="absolute bottom-5 right-5 flex flex-col gap-1.5 z-20">
            <button onClick={handleZoomIn} title="Zoom In"
              className="w-9 h-9 rounded-xl bg-[#0b0f19]/90 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shadow-lg cursor-pointer backdrop-blur-md">
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} title="Zoom Out"
              className="w-9 h-9 rounded-xl bg-[#0b0f19]/90 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shadow-lg cursor-pointer backdrop-blur-md">
              <Minus className="w-4 h-4" />
            </button>
            <button onClick={handleResetZoom} title="Reset Zoom"
              className="w-9 h-9 rounded-xl bg-[#0b0f19]/90 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shadow-lg cursor-pointer backdrop-blur-md">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-[280px] shrink-0 bg-[#0b0f19]/95 border-l border-white/5 overflow-y-auto p-5 flex flex-col gap-4">

          {/* ── Batch Actions widget ───────────────────────────────────── */}
          {isEditorMode && (
            <div className="flex flex-col gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl animate-scale-in">
              <h2 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                Batch Actions {selectedShapes.length > 0 ? `(${selectedShapes.length})` : ''}
              </h2>
              {selectedShapes.length > 0 ? (
                <>
                  <p className="text-[0.7rem] text-slate-400 leading-relaxed">
                    You have selected {selectedShapes.length} shapes. Click below to tag them.
                  </p>
                  <button onClick={handleOpenTagModal}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer">
                    Tag Selected Shapes
                  </button>
                  <button onClick={() => setSelectedShapes([])}
                    className="w-full py-1.5 bg-white/[0.02] border border-white/10 hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-lg text-[0.7rem] font-semibold transition-all cursor-pointer">
                    Deselect All
                  </button>
                </>
              ) : (
                <p className="text-[0.7rem] text-slate-500 leading-relaxed italic">
                  No shapes selected. Click on blocks on the map layout to select and tag them in sequence.
                </p>
              )}
            </div>
          )}

          {/* ── Map Zones list ─────────────────────────────────────────── */}
          {isEditorMode && event.zones && event.zones.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <h2 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-400" />
                Map Zones ({event.zones.length})
              </h2>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {event.zones.map(zone => (
                  <div key={zone.id} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[0.7rem]">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-indigo-400">{zone.id}</span>
                        <span className="text-slate-350 font-semibold truncate max-w-[80px]">{zone.name}</span>
                      </div>
                      <span className="text-[0.6rem] text-slate-550 block uppercase tracking-wider">{zone.category}</span>
                    </div>
                    <button onClick={() => handleDeleteZone(zone.id)} title="Delete Zone"
                      className="p-1 text-slate-500 hover:text-rose-400 hover:bg-white/[0.03] rounded transition-all cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="h-px bg-white/5 my-1" />
            </div>
          )}

          {/* ── Selected Stall Info Card (EP-43 — Mesanda) ───────────────── */}
          {!isEditorMode && selectedStall && (
            <div className="flex flex-col gap-3 p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl animate-scale-in relative">

              {/* Dismiss button — clears selection + removes orange glow on map */}
              <button
                onClick={() => setSelectedStall(null)}
                title="Dismiss"
                className="absolute top-2.5 right-2.5 w-5 h-5 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>

              {/* Category colour dot + label */}
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{
                    background: (CATEGORY_STYLES[selectedStall.category] || DEFAULT_ZONE_STYLE).stroke,
                    opacity: 0.9,
                  }}
                />
                <span className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">
                  {selectedStall.category}
                </span>
              </div>

              {/* Zone name + ID */}
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-px" />
                <div>
                  <p className="text-sm font-bold text-slate-100 leading-snug">{selectedStall.name}</p>
                  <p className="text-[0.62rem] text-slate-500 font-mono mt-0.5">{selectedStall.id}</p>
                </div>
              </div>

              {/* Category tag row */}
              <div className="flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-indigo-400 shrink-0" />
                <span className="text-[0.65rem] text-slate-400">{selectedStall.category}</span>
              </div>

              {/* Placeholder panel for future vendor/booth details */}
              <div className="rounded-lg bg-white/[0.02] border border-white/[0.05] px-3 py-2">
                <p className="text-[0.62rem] text-slate-600 italic leading-relaxed">
                  Additional booth details (vendor info, capacity, schedule) will appear here once linked.
                </p>
              </div>
            </div>
          )}

          {/* ── Fallback hint — shown when no zone is selected ────────────── */}
          {!isEditorMode && !selectedStall && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-slate-600">
              <MapPin className="w-5 h-5 opacity-40" />
              <p className="text-[0.7rem] text-center leading-relaxed">
                Click any coloured zone on the floor plan to view its details.
              </p>
            </div>
          )}

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

      {isModalOpen && createPortal(
        <div onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div onClick={e => e.stopPropagation()}
            className="bg-[#0b0f19] border border-white/10 max-w-sm w-full p-6 rounded-xl shadow-2xl relative animate-scale-in text-left">
            <h3 className="text-base font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              {selectedShapes.length === 1 ? 'Tag Zone' : `Batch Tag Selected (${selectedShapes.length})`}
            </h3>
            <form onSubmit={handleBatchSaveZones} className="flex flex-col gap-4">
              {selectedShapes.length === 1 ? (
                /* Single shape form */
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[0.6rem] text-slate-400 uppercase font-bold tracking-wider block mb-1">Zone ID</label>
                    <input autoFocus required type="text" placeholder="e.g. FS3"
                      value={singleTagData.id} onChange={e => setSingleTagData({ ...singleTagData, id: e.target.value })}
                      className="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[0.6rem] text-slate-400 uppercase font-bold tracking-wider block mb-1">Zone Name</label>
                    <input required type="text" placeholder="e.g. Food Stall FS3"
                      value={singleTagData.name} onChange={e => setSingleTagData({ ...singleTagData, name: e.target.value })}
                      className="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none" />
                  </div>
                </div>
              ) : (
                /* Batch form */
                <>
                  <div>
                    <label className="text-[0.6rem] text-slate-400 uppercase font-bold tracking-wider block mb-1">ID Prefix (e.g. A, STALL-)</label>
                    <input autoFocus required type="text" placeholder="e.g. A"
                      value={batchTagData.prefix} onChange={e => setBatchTagData({ ...batchTagData, prefix: e.target.value })}
                      className="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[0.6rem] text-slate-400 uppercase font-bold tracking-wider block mb-1">Start Sequence #</label>
                      <input required type="number" min="1" placeholder="e.g. 1"
                        value={batchTagData.startNum} onChange={e => setBatchTagData({ ...batchTagData, startNum: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-[0.6rem] text-slate-400 uppercase font-bold tracking-wider block mb-1">Common Base Title</label>
                      <input required type="text" placeholder="e.g. Booth"
                        value={batchTagData.commonTitle} onChange={e => setBatchTagData({ ...batchTagData, commonTitle: e.target.value })}
                        className="w-full bg-white/[0.02] border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none" />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-[0.6rem] text-slate-400 uppercase font-bold tracking-wider block mb-1">Zone Category Sector</label>
                <select
                  value={selectedShapes.length === 1 ? singleTagData.category : batchTagData.category}
                  onChange={e => selectedShapes.length === 1 ? setSingleTagData({ ...singleTagData, category: e.target.value }) : setBatchTagData({ ...batchTagData, category: e.target.value })}
                  className="w-full bg-[#0d111d] border border-white/8 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none">
                  <option value="Cybersecurity">Cybersecurity</option>
                  <option value="Biotechnology">Biotechnology</option>
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Clean Energy">Clean Energy</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Presentation Area">Presentation Area</option>
                  <option value="Refreshments">Refreshments</option>
                  <option value="Restrooms">Restrooms</option>
                  <option value="First Aid">First Aid</option>
                  <option value="Exit">Exit</option>
                  <option value="Fire Extinguisher">Fire Extinguisher</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-white/[0.02] border border-white/10 rounded-lg text-xs text-slate-400 hover:text-white transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSaving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-all cursor-pointer">
                  {isSaving ? 'Saving...' : `Save Zone${selectedShapes.length > 1 ? 's' : ''} (${selectedShapes.length})`}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* GPU-accelerated toast notifications */}
      <div className="fixed top-4 right-4 flex flex-col gap-2 z-[200] pointer-events-none" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 pl-4 pr-3 py-3 rounded-xl shadow-2xl border backdrop-blur-md text-xs font-medium max-w-[22rem] leading-snug
              ${toast.type === 'error' ? 'bg-rose-950/95 border-rose-500/30 text-rose-100' : 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100'}`}
            style={{ animation: 'toastSlideIn 0.38s cubic-bezier(0.16,1,0.3,1) both', willChange: 'transform, opacity', transform: 'translateZ(0)' }}>
            <span className="text-sm shrink-0 mt-px">{toast.type === 'error' ? '⚠️' : '✅'}</span>
            <span className="flex-1">{toast.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className={`shrink-0 ml-1 opacity-50 hover:opacity-100 text-base leading-none transition-opacity cursor-pointer ${toast.type === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
