import React, { useState, useRef } from 'react';
import './CreateEvent.css';

const API_BASE = 'http://localhost:5000/api';

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
    <div className="dz-wrapper">
      <p className="dz-label">{label}</p>
      <div
        className={`dz-zone ${isDragging ? 'dz-zone--dragging' : ''} ${previewUrl ? 'dz-zone--filled' : ''}`}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !previewUrl && inputRef.current.click()}
      >
        {previewUrl ? (
          <div className="dz-preview">
            <img src={previewUrl} alt={label} className="dz-preview-img" />
            <button className="dz-change-btn" onClick={(e) => { e.stopPropagation(); inputRef.current.click(); }}>
              Change
            </button>
          </div>
        ) : (
          <div className="dz-placeholder">
            <div className="dz-icon">{icon}</div>
            <p className="dz-text">Drop image here</p>
            <p className="dz-subtext">or click to browse</p>
          </div>
        )}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          className="dz-input"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>
      {file && (
        <p className="dz-file-name">📎 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
      )}
    </div>
  );
}

export default function CreateEvent({ onNavigate }) {
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

  const handleBanner = (file) => {
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleFloorMap = (file) => {
    setFloorMapFile(file);
    setFloorMapPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Event name is required.'); return; }
    if (!bannerFile) { setError('Please upload a banner image.'); return; }
    if (!floorMapFile) { setError('Please upload a floor map image.'); return; }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (date) formData.append('date', date);
      formData.append('banner', bannerFile);
      formData.append('floorMap', floorMapFile);

      const res = await fetch(`${API_BASE}/events`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Failed to create event.');
      setCreatedEvent(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (createdEvent) {
    return (
      <div className="create-event-page">
        <div className="ce-success-card">
          <div className="ce-success-icon">✓</div>
          <h2 className="ce-success-title">Event Created!</h2>
          <p className="ce-success-sub">{createdEvent.name}</p>
          <div className="ce-success-banner">
            <img src={createdEvent.bannerImageUrl} alt={createdEvent.name} />
          </div>
          <div className="ce-success-actions">
            <button id="view-map-btn" className="btn-primary" onClick={() => onNavigate('map-viewer', createdEvent._id)}>
              View Floor Map
            </button>
            <button id="all-events-btn" className="btn-secondary" onClick={() => onNavigate('events')}>
              All Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-event-page">
      <div className="ce-header">
        <div className="ce-tag">Coordinator Tool</div>
        <h1 className="ce-title">Create Event</h1>
        <p className="ce-subtitle">Add a new event with a banner and floor map to EventPulse.</p>
      </div>

      <div className="ce-layout">
        {/* Left: Image drop zones */}
        <div className="ce-images">
          <DropZone
            id="banner-upload"
            label="Banner Image"
            icon="🖼️"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            file={bannerFile}
            previewUrl={bannerPreview}
            onFileSelect={handleBanner}
          />
          <DropZone
            id="floormap-upload"
            label="Floor Map"
            icon="🗺️"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
            file={floorMapFile}
            previewUrl={floorMapPreview}
            onFileSelect={handleFloorMap}
          />
        </div>

        {/* Right: Form fields */}
        <form className="ce-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="event-name">Event Name <span className="required">*</span></label>
            <input
              id="event-name"
              type="text"
              className="form-input"
              placeholder="e.g. Tech Expo 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-desc">Description <span className="optional">(optional)</span></label>
            <textarea
              id="event-desc"
              className="form-input form-textarea"
              placeholder="Brief description of the event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="event-date">Event Date <span className="optional">(optional)</span></label>
            <input
              id="event-date"
              type="date"
              className="form-input form-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {error && <div className="ce-error">{error}</div>}

          <button
            id="submit-event-btn"
            type="submit"
            className="btn-primary btn-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="submitting-text"><span className="spinner" />Creating Event...</span>
            ) : 'Create Event'}
          </button>

          <button
            type="button"
            className="btn-secondary btn-full btn-cancel"
            onClick={() => onNavigate('events')}
          >
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}
