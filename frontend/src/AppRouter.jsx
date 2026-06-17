import React, { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import App from './App.jsx';
import EventsPage from './pages/EventsPage.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import MapViewer from './pages/MapViewer.jsx';

export default function AppRouter() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [selectedEventId, setSelectedEventId] = useState(null);

  const navigate = (page, eventId = null) => {
    setCurrentPage(page);
    if (eventId) setSelectedEventId(eventId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isMapViewer = currentPage === 'map-viewer';

  const renderPage = () => {
    switch (currentPage) {
      case 'events':
        return <EventsPage onNavigate={navigate} />;
      case 'create-event':
        return <CreateEvent onNavigate={navigate} />;
      case 'map-viewer':
        return <MapViewer eventId={selectedEventId} onNavigate={navigate} />;
      default:
        return <App onNavigate={navigate} />;
    }
  };

  return (
    <div>
      {/* Navbar is hidden in map-viewer so the map can use full height */}
      {!isMapViewer && (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
          <Navbar currentPage={currentPage} onNavigate={navigate} />
        </div>
      )}
      {/* MapViewer gets its own back button in its topbar */}
      {isMapViewer && (
        <MapViewer eventId={selectedEventId} onNavigate={navigate} />
      )}
      {!isMapViewer && renderPage()}
    </div>
  );
}
