import React, { useState, useRef } from 'react';
import './FloorplanUpload.css';

const API_BASE = 'http://localhost:5000/api';

export default function FloorplanUpload({ onNavigate }) {
  const [eventName, setEventName] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFloorplan, setUploadedFloorplan] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPG, PNG, WEBP, or SVG).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10MB.');
      return;
    }
    setError('');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedFile) { setError('Please select a floorplan image.'); return; }
    if (!eventName.trim() || !floorLabel.trim()) { setError('All fields are required.'); return; }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('floorplanImage', selectedFile);
      formData.append('eventName', eventName.trim());
      formData.append('floorLabel', floorLabel.trim());

      const response = await fetch(`${API_BASE}/floorplans/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!data.success) throw new Error(data.message || 'Upload failed.');
      setUploadedFloorplan(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setEventName('');
    setFloorLabel('');
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadedFloorplan(null);
    setError('');
  };

  // Success state
  if (uploadedFloorplan) {
    return (
      <div className="upload-page">
        <div className="upload-success-card">
          <div className="upload-success-icon">✓</div>
          <h2 className="upload-success-title">Floorplan Uploaded!</h2>
          <p className="upload-success-sub">{uploadedFloorplan.eventName} · {uploadedFloorplan.floorLabel}</p>
          <div className="upload-success-img-wrap">
            <img src={uploadedFloorplan.imageUrl} alt="Uploaded floorplan" className="upload-success-img" />
          </div>
          <div className="upload-success-actions">
            <button id="view-maps-btn" className="btn-primary" onClick={() => onNavigate('viewer')}>View All Maps</button>
            <button id="upload-another-btn" className="btn-secondary" onClick={handleReset}>Upload Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="upload-page">
      <div className="upload-header">
        <div className="upload-tag">Coordinator Tool</div>
        <h1 className="upload-title">Upload Floorplan</h1>
        <p className="upload-subtitle">Add a venue floor map to the EventPulse system. Accepted formats: JPG, PNG, WEBP, SVG (max 10MB).</p>
      </div>

      <div className="upload-layout">
        {/* Drop zone */}
        <div
          className={`drop-zone ${isDragging ? 'drop-zone--dragging' : ''} ${previewUrl ? 'drop-zone--has-preview' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !previewUrl && fileInputRef.current.click()}
        >
          {previewUrl ? (
            <div className="drop-preview">
              <img src={previewUrl} alt="Floorplan preview" className="drop-preview-img" />
              <button
                id="change-image-btn"
                className="drop-preview-change"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}
              >
                Change Image
              </button>
            </div>
          ) : (
            <div className="drop-placeholder">
              <div className="drop-icon">🗺️</div>
              <p className="drop-text">Drag & drop your floorplan here</p>
              <p className="drop-subtext">or click to browse files</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
            className="drop-input"
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
        </div>

        {/* Form */}
        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="eventName">Event Name</label>
            <input
              id="eventName"
              type="text"
              className="form-input"
              placeholder="e.g. Tech Expo 2025"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="floorLabel">Floor Label</label>
            <input
              id="floorLabel"
              type="text"
              className="form-input"
              placeholder="e.g. Ground Floor, Hall A"
              value={floorLabel}
              onChange={(e) => setFloorLabel(e.target.value)}
              required
            />
          </div>

          {selectedFile && (
            <div className="file-info">
              <span className="file-info-name">📎 {selectedFile.name}</span>
              <span className="file-info-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          )}

          {error && <div className="upload-error">{error}</div>}

          <button
            id="submit-upload-btn"
            type="submit"
            className="btn-primary btn-full"
            disabled={isUploading}
          >
            {isUploading ? (
              <span className="uploading-text"><span className="spinner" />Uploading...</span>
            ) : 'Upload Floorplan'}
          </button>
        </form>
      </div>
    </div>
  );
}
