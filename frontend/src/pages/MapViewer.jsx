import React, { useState, useEffect } from 'react';
import './MapViewer.css';

const API_BASE = 'http://localhost:5000/api';

export default function MapViewer({ eventId, onNavigate }) {
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${API_BASE}/events/${eventId}`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Event not found.');
        setEvent(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    if (eventId) fetchEvent();
  }, [eventId]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="mv-fullscreen">
        <div className="mv-state">
          <div className="mv-spinner" />
          <p>Loading floor map...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mv-fullscreen">
        <div className="mv-state">
          <div className="mv-state-icon">⚠️</div>
          <p className="mv-state-text">{error || 'Event not found.'}</p>
          <button className="btn-secondary" onClick={() => onNavigate('events')}>Back to Events</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mv-fullscreen">
      {/* Top bar */}
      <div className="mv-topbar">
        <div className="mv-topbar-left">
          <button
            id="back-to-events-btn"
            className="mv-back-btn"
            onClick={() => onNavigate('events')}
          >
            ← Back
          </button>
          <div className="mv-event-info">
            <span className="mv-event-name">{event.name}</span>
            {formatDate(event.date) && (
              <span className="mv-event-date">📅 {formatDate(event.date)}</span>
            )}
          </div>
        </div>
        <div className="mv-topbar-right">
          <a
            href={event.floorMapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mv-open-btn"
          >
            Open Original ↗
          </a>
        </div>
      </div>

      {/* Main area: map + controls panel */}
      <div className="mv-body">
        {/* Map canvas area */}
        <div className="mv-map-area">
          <div className="mv-map-container">
            <img
              id="floormap-image"
              src={event.floorMapUrl}
              alt={`${event.name} floor map`}
              className="mv-map-img"
            />
            {/* Future interactive overlay goes here */}
            <div className="mv-map-overlay" id="map-interactive-overlay" />
          </div>
        </div>

        {/* Right panel — placeholder for future controls */}
        <aside className="mv-panel">
          <div className="mv-panel-header">
            <h2 className="mv-panel-title">Map Controls</h2>
            <span className="mv-panel-badge">Coming Soon</span>
          </div>

          <div className="mv-panel-section">
            <p className="mv-panel-section-label">Event</p>
            <p className="mv-panel-value">{event.name}</p>
          </div>

          {event.description && (
            <div className="mv-panel-section">
              <p className="mv-panel-section-label">Description</p>
              <p className="mv-panel-value mv-panel-value--muted">{event.description}</p>
            </div>
          )}

          {formatDate(event.date) && (
            <div className="mv-panel-section">
              <p className="mv-panel-section-label">Date</p>
              <p className="mv-panel-value">{formatDate(event.date)}</p>
            </div>
          )}

          <div className="mv-panel-divider" />

          <div className="mv-placeholder-controls">
            <div className="mv-placeholder-item">
              <div className="mv-placeholder-icon">🏪</div>
              <span>Stall Manager</span>
            </div>
            <div className="mv-placeholder-item">
              <div className="mv-placeholder-icon">📍</div>
              <span>Zone Labels</span>
            </div>
            <div className="mv-placeholder-item">
              <div className="mv-placeholder-icon">🔥</div>
              <span>Congestion Heat Map</span>
            </div>
            <div className="mv-placeholder-item">
              <div className="mv-placeholder-icon">🧭</div>
              <span>Routing</span>
            </div>
          </div>

          <p className="mv-placeholder-note">
            Interactive controls will be implemented in upcoming sprints.
          </p>
        </aside>
      </div>
    </div>
  );
}
