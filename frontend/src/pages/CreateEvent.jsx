import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE = '/api';

function DropZone({ label, icon, accept, file, previewUrl, onFileSelect, id }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(f.type)) return;
    if (f.size > 10 * 1024 * 1024) return;
    onFileSelect(f);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold text-slate-400 m-0">{label}</p>
      <div
        className={`border-2 border-dashed rounded-[14px] min-h-[170px] flex items-center justify-center overflow-hidden relative transition-all duration-200
          ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-indigo-500/25 bg-indigo-500/[0.03]'}
          ${previewUrl ? 'cursor-default border-solid border-indigo-500/30' : 'cursor-pointer hover:border-indigo-500/50 hover:bg-indigo-500/[0.06]'}`}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !previewUrl && inputRef.current.click()}
      >
        {previewUrl ? (
          <div className="w-full h-full min-h-[170px] relative">
            <img src={previewUrl} alt={label} className="w-full h-full min-h-[170px] object-contain bg-black/30 block" />
            <button
              className="absolute bottom-3 right-3 bg-[rgba(3,7,18,0.85)] border border-indigo-500/40 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer font-[inherit] hover:bg-indigo-500/25 transition-colors"
              onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}
            >
              Change
            </button>
          </div>
        ) : (
          <div className="text-center p-6 pointer-events-none">
            <div className="text-4xl mb-3">{icon}</div>
            <p className="text-slate-200 text-sm font-semibold m-0 mb-1">Drop image here</p>
            <p className="text-slate-600 text-xs m-0">or click to browse</p>
          </div>
        )}
        <input ref={inputRef} id={id} type="file" accept={accept} className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>
      {file && <p className="text-xs text-slate-600 m-0">📎 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
    </div>
  );
}

export default function CreateEvent({ onNavigate }) {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [floorMapFile, setFloorMapFile] = useState(null);
  const [floorMapPreview, setFloorMapPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdEvent, setCreatedEvent] = useState(null);

  useEffect(() => {
    if (eventId) {
      const fetchEventData = async () => {
        try {
          const res = await fetch(`/api/events/${eventId}`);
          const data = await res.json();
          if (data.success) {
            setName(data.data.name);
            setDescription(data.data.description || '');
            if (data.data.date) {
              setDate(new Date(data.data.date).toISOString().substring(0, 10));
            }
            setBannerPreview(data.data.bannerImageUrl);
            setFloorMapPreview(data.data.floorMapImageUrl || data.data.floorMapUrl);
          }
        } catch (err) {
          console.error("Fetch event details failed:", err);
        }
      };
      fetchEventData();
    }
  }, [eventId]);

  const handleBanner = (f) => { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)); };
  const handleFloorMap = (f) => { setFloorMapFile(f); setFloorMapPreview(URL.createObjectURL(f)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Event name is required.'); return; }
    if (!eventId && !bannerFile) { setError('Please upload a banner image.'); return; }
    if (!eventId && !floorMapFile) { setError('Please upload a floor map image.'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (date) formData.append('date', date);
      if (bannerFile) formData.append('banner', bannerFile);
      if (floorMapFile) formData.append('floorMap', floorMapFile);

      const url = eventId ? `${API_BASE}/events/${eventId}` : `${API_BASE}/events`;
      const method = eventId ? 'PUT' : 'POST';

      const res = await fetch(url, { method, body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to submit event details.');
      setCreatedEvent(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-slate-50 text-sm font-[inherit] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-slate-700 box-border";

  if (createdEvent) {
    return (
      <div className="max-w-[1050px] mx-auto px-6 pt-12 pb-20">
        <div className="max-w-[540px] mx-auto mt-16 bg-white/[0.02] border border-white/[0.06] rounded-[20px] p-12 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center text-3xl text-emerald-500 mx-auto mb-6">✓</div>
          <h2 className="text-3xl font-bold text-slate-50 m-0 mb-2">{eventId ? 'Event Updated!' : 'Event Created!'}</h2>
          <p className="text-slate-500 text-sm m-0 mb-6">{createdEvent.name}</p>
          <div className="rounded-xl overflow-hidden mb-8 border border-white/[0.06]">
            <img src={createdEvent.bannerImageUrl} alt={createdEvent.name} className="w-full max-h-[220px] object-cover block" />
          </div>
          <div className="flex gap-4 justify-center flex-wrap">
            <button id="view-map-btn" onClick={() => navigate(`/map-viewer/${createdEvent._id}`)} className="btn-gradient text-white border-none px-7 py-3 text-base font-semibold rounded-lg cursor-pointer font-[inherit] transition-all duration-200">View Floor Map</button>
            <button id="all-events-btn" onClick={() => navigate('/organizer/dashboard/events')} className="bg-white/[0.03] text-slate-50 border border-white/10 px-7 py-3 text-base font-semibold rounded-lg cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200">All Events</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1050px] mx-auto px-6 pt-12 pb-20">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-xs font-semibold tracking-widest uppercase mb-5">Coordinator Tool</div>
        <h1 className="text-4xl font-extrabold gradient-text-hero m-0 mb-4">{eventId ? 'Edit Event Details' : 'Create Event'}</h1>
        <p className="text-slate-500 text-base m-0 leading-relaxed">{eventId ? 'Modify current event name, descriptions, banner, or map layers.' : 'Add a new event with a banner and floor map to EventPulse.'}</p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-10 items-start max-[768px]:grid-cols-1">
        {/* Left: drop zones */}
        <div className="flex flex-col gap-6">
          <DropZone id="banner-upload" label="Banner Image" icon="🖼️" accept="image/jpeg,image/jpg,image/png,image/webp" file={bannerFile} previewUrl={bannerPreview} onFileSelect={handleBanner} />
          <DropZone id="floormap-upload" label="Floor Map" icon="🗺️" accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml" file={floorMapFile} previewUrl={floorMapPreview} onFileSelect={handleFloorMap} />
        </div>

        {/* Right: form */}
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label htmlFor="event-name" className="text-xs font-semibold text-slate-400">Event Name <span className="text-red-400">*</span></label>
            <input id="event-name" type="text" className={inputClass} placeholder="e.g. Tech Expo 2025" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="event-desc" className="text-xs font-semibold text-slate-400">Description <span className="text-slate-700 font-normal">(optional)</span></label>
            <textarea id="event-desc" className={`${inputClass} resize-y min-h-[90px]`} placeholder="Brief description of the event..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="event-date" className="text-xs font-semibold text-slate-400">Event Date <span className="text-slate-700 font-normal">(optional)</span></label>
            <input id="event-date" type="date" className={`${inputClass} [color-scheme:dark]`} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {error && <div className="bg-red-500/[0.08] border border-red-500/20 rounded-lg text-red-300 text-sm px-4 py-3">{error}</div>}

          <button id="submit-event-btn" type="submit" disabled={isSubmitting} className="btn-gradient text-white border-none w-full py-4 text-base font-semibold rounded-lg cursor-pointer font-[inherit] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-1">
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                {eventId ? 'Updating Event...' : 'Creating Event...'}
              </span>
            ) : (eventId ? 'Update Event' : 'Create Event')}
          </button>

          <button type="button" onClick={() => navigate('/organizer/dashboard/events')} className="bg-white/[0.03] text-slate-50 border border-white/10 w-full py-4 text-base font-semibold rounded-lg cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
