import React, { useState, useEffect } from 'react';
import './FloorplanViewer.css';

const API_BASE = 'http://localhost:5000/api';

export default function FloorplanViewer({ onNavigate }) {
  const [floorplans, setFloorplans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedFloorplan, setSelectedFloorplan] = useState(null);

  useEffect(() => {
    const fetchFloorplans = async () => {
      try {
        const response = await fetch(`${API_BASE}/floorplans`);
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch floorplans.');
        setFloorplans(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFloorplans();
  }, []);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="viewer-page">
      {/* Page Header */}
      <div className="viewer-header">
        <div className="viewer-tag">Venue Maps</div>
        <h1 className="viewer-title">Floor Maps</h1>
        <p className="viewer-subtitle">
          Browse all uploaded venue floorplans. Click any map to view it in full size.
        </p>
        <button id="go-upload-btn" className="btn-primary viewer-upload-btn" onClick={() => onNavigate('upload')}>
          + Upload New Map
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="viewer-state">
          <div className="viewer-spinner" />
          <p>Loading floor maps...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="viewer-state">
          <div className="viewer-state-icon">⚠️</div>
          <p className="viewer-state-text">{error}</p>
          <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && floorplans.length === 0 && (
        <div className="viewer-state">
          <div className="viewer-state-icon">🗺️</div>
          <p className="viewer-state-text">No floorplans uploaded yet.</p>
          <button id="upload-first-btn" className="btn-primary" onClick={() => onNavigate('upload')}>
            Upload Your First Map
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !error && floorplans.length > 0 && (
        <div className="viewer-grid">
          {floorplans.map((fp) => (
            <div
              key={fp._id}
              id={`floorplan-card-${fp._id}`}
              className="floorplan-card"
              onClick={() => setSelectedFloorplan(fp)}
            >
              <div className="card-img-wrap">
                <img src={fp.imageUrl} alt={`${fp.eventName} - ${fp.floorLabel}`} className="card-img" />
                <div className="card-overlay">
                  <span className="card-overlay-text">View Full Map</span>
                </div>
              </div>
              <div className="card-body">
                <div className="card-event-name">{fp.eventName}</div>
                <div className="card-footer">
                  <span className="card-floor-badge">{fp.floorLabel}</span>
                  <span className="card-date">{formatDate(fp.uploadedAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox modal */}
      {selectedFloorplan && (
        <div
          id="floorplan-lightbox"
          className="lightbox-overlay"
          onClick={() => setSelectedFloorplan(null)}
        >
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              id="close-lightbox-btn"
              className="lightbox-close"
              onClick={() => setSelectedFloorplan(null)}
            >
              ✕
            </button>
            <div className="lightbox-meta">
              <span className="lightbox-event">{selectedFloorplan.eventName}</span>
              <span className="lightbox-floor-badge">{selectedFloorplan.floorLabel}</span>
            </div>
            <div className="lightbox-img-wrap">
              <img
                src={selectedFloorplan.imageUrl}
                alt={`${selectedFloorplan.eventName} - ${selectedFloorplan.floorLabel}`}
                className="lightbox-img"
              />
            </div>
            <div className="lightbox-footer">
              <span className="lightbox-date">Uploaded {formatDate(selectedFloorplan.uploadedAt)}</span>
              <a
                href={selectedFloorplan.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary lightbox-open-btn"
              >
                Open Original ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
