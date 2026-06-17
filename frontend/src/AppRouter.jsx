import React, { useState } from 'react';
import Navbar from './components/Navbar.jsx';
import './components/Navbar.css';
import App from './App.jsx';
import FloorplanUpload from './pages/FloorplanUpload.jsx';
import FloorplanViewer from './pages/FloorplanViewer.jsx';

export default function AppRouter() {
  const [currentPage, setCurrentPage] = useState('landing');

  const navigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'upload':
        return <FloorplanUpload onNavigate={navigate} />;
      case 'viewer':
        return <FloorplanViewer onNavigate={navigate} />;
      default:
        return <App onNavigate={navigate} />;
    }
  };

  return (
    <div>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1.5rem' }}>
        <Navbar currentPage={currentPage} onNavigate={navigate} />
      </div>
      {renderPage()}
    </div>
  );
}
