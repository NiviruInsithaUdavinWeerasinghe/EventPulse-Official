import React from 'react';
import './App.css';
import useLandingPage from './hooks/useLandingPage';

export default function App({ onNavigate }) {
  const {
    isDemoModalOpen,
    demoRequest,
    isSubmitting,
    submitSuccess,
    openDemoModal,
    closeDemoModal,
    handleInputChange,
    submitDemoRequest,
  } = useLandingPage();

  return (
    <div className="landing-container">

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-tag">Official Release</div>
        <h1 className="hero-title">
          Coordinate Next-Gen Events With <span>Dynamic Mapping</span>
        </h1>
        <p className="hero-description">
          The ultimate platform for exhibition coordinators and attendees. Design clickable layouts, manage stalls in real time, and streamline floorplan navigation with premium efficiency.
        </p>
        <div className="cta-group">
          <button onClick={openDemoModal} className="btn-primary">Get Started</button>
          <a href="#features" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Learn More</a>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats" className="stats-section">
        <div className="stat-item">
          <div className="stat-number">10K+</div>
          <div className="stat-label">Events Managed</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">500K+</div>
          <div className="stat-label">Stalls Configured</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">99.9%</div>
          <div className="stat-label">Server Uptime</div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <h2 className="features-title">Designed for Seamless Operations</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrapper">🗺️</div>
            <h3>Interactive Floorplans</h3>
            <p>Import custom vector drawings and map interactive zones dynamically with built-in styling overlays.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">⚡</div>
            <h3>Real-Time Stalls</h3>
            <p>Update stall availability, modify dimensions, and update booth configurations instantly with live backend sync.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrapper">☁️</div>
            <h3>Cloudinary Integration</h3>
            <p>Handle high-resolution media uploads for event blueprint maps directly via Cloudinary CDN services.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} EventPulse. All rights reserved.</p>
      </footer>

      {/* Demo Modal Dialog */}
      {isDemoModalOpen && (
        <div className="modal-overlay" onClick={closeDemoModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeDemoModal}>&times;</button>
            
            {!submitSuccess ? (
              <>
                <h3 className="modal-title">Book a Demo</h3>
                <p className="modal-subtitle">Fill in the details below and our product specialist will reach out to you.</p>
                <form onSubmit={submitDemoRequest}>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="form-input"
                      value={demoRequest.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Work Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      className="form-input"
                      value={demoRequest.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="company">Company Name</label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      className="form-input"
                      value={demoRequest.company}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="eventType">Primary Event Type</label>
                    <select
                      id="eventType"
                      name="eventType"
                      className="form-select"
                      value={demoRequest.eventType}
                      onChange={handleInputChange}
                    >
                      <option value="Exhibition">Exhibition / Tradeshow</option>
                      <option value="Conference">Corporate Conference</option>
                      <option value="Festival">Festival / Public Event</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Schedule Live Demo'}
                  </button>
                </form>
              </>
            ) : (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <h3 className="modal-title">Request Submitted!</h3>
                <p className="modal-subtitle" style={{ marginTop: '0.5rem' }}>We've received your request and will follow up shortly via email.</p>
                <button onClick={closeDemoModal} className="btn-secondary" style={{ marginTop: '1.5rem', width: '100%' }}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
