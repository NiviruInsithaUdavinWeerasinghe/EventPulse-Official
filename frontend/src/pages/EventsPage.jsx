import React, { useState, useEffect } from 'react';
import './EventsPage.css';

const API_BASE = 'http://localhost:5000/api';

export default function EventsPage({ onNavigate }) {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_BASE}/events`);
        const data = await res.json();
        if (!data.success) throw new Error(data.message || 'Failed to fetch events.');
        setEvents(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  return (
    <div className="events-page">
      {/* Header */}
      <div className="events-header">
        <div className="events-tag">Venue Events</div>
        <h1 className="events-title">Events</h1>
        <p className="events-subtitle">
          Browse all events and explore their interactive floor maps.
        </p>
        <button id="create-event-btn" className="btn-primary" onClick={() => onNavigate('create-event')}>
          + Create Event
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="events-state">
          <div className="events-spinner" />
          <p>Loading events...</p>
        </div>
      )}

      {/* Error */}
      {!isLoading && error && (
        <div className="events-state">
          <div className="events-state-icon">⚠️</div>
          <p className="events-state-text">{error}</p>
          <button className="btn-secondary" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && events.length === 0 && (
        <div className="events-state">
          <div className="events-state-icon">🗓️</div>
          <p className="events-state-text">No events created yet.</p>
          <button id="create-first-event-btn" className="btn-primary" onClick={() => onNavigate('create-event')}>
            Create Your First Event
          </button>
        </div>
      )}

      {/* Events Grid */}
      {!isLoading && !error && events.length > 0 && (
        <div className="events-grid">
          {events.map((event) => (
            <div
              key={event._id}
              id={`event-card-${event._id}`}
              className="event-card"
              onClick={() => onNavigate('map-viewer', event._id)}
            >
              <div className="event-card-banner">
                <img
                  src={event.bannerImageUrl}
                  alt={event.name}
                  className="event-card-banner-img"
                />
                <div className="event-card-overlay">
                  <span className="event-card-overlay-text">🗺️ View Floor Map</span>
                </div>
              </div>
              <div className="event-card-body">
                <h3 className="event-card-name">{event.name}</h3>
                {event.description && (
                  <p className="event-card-desc">{event.description}</p>
                )}
                <div className="event-card-footer">
                  {formatDate(event.date) ? (
                    <span className="event-card-date-badge">📅 {formatDate(event.date)}</span>
                  ) : (
                    <span className="event-card-date-badge event-card-date-badge--muted">No date set</span>
                  )}
                  <span className="event-card-map-hint">Has floor map →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
