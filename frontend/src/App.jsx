import useLandingPage from './hooks/useLandingPage';

export default function App() {
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

  const inputBase = "w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-4 py-3 text-slate-50 text-sm font-[inherit] transition-all duration-200 focus:outline-none focus:border-indigo-500 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.2)] box-border";

  return (
    <div className="max-w-[1200px] mx-auto px-6">

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="flex flex-col items-center text-center pt-24 pb-16 relative">
        <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-1.5 rounded-full text-sm font-semibold tracking-widest uppercase mb-8">
          Official Release
        </div>
        <h1 className="text-[4rem] font-extrabold leading-[1.15] m-0 mb-6 gradient-text-hero max-w-[800px] max-[768px]:text-[2.75rem]">
          Coordinate Next-Gen Events With{' '}
          <span className="gradient-text-accent">Dynamic Mapping</span>
        </h1>
        <p className="text-slate-400 text-xl max-w-[640px] m-0 mb-10 leading-relaxed">
          The ultimate platform for exhibition coordinators and attendees. Design clickable layouts, manage stalls in real time, and streamline floorplan navigation with premium efficiency.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button onClick={openDemoModal} className="btn-gradient text-white border-none px-7 py-3.5 text-base font-semibold rounded-lg cursor-pointer font-[inherit] transition-all duration-200">
            Get Started
          </button>
          <a href="#features" className="bg-white/[0.03] text-slate-50 border border-white/10 px-7 py-3.5 text-base font-semibold rounded-lg no-underline inline-flex items-center justify-center hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200">
            Learn More
          </a>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────── */}
      <section id="stats" className="flex justify-around flex-wrap gap-12 px-8 py-16 bg-white/[0.01] border border-white/[0.03] rounded-3xl my-16">
        {[
          { number: '10K+', label: 'Events Managed' },
          { number: '500K+', label: 'Stalls Configured' },
          { number: '99.9%', label: 'Server Uptime' },
        ].map(({ number, label }) => (
          <div key={label} className="text-center">
            <div className="text-5xl font-extrabold gradient-text-brand mb-2">{number}</div>
            <div className="text-slate-500 text-sm uppercase tracking-widest font-semibold">{label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ───────────────────────────────────── */}
      <section id="features" className="py-20">
        <h2 className="text-center text-[2.25rem] font-bold text-slate-50 mb-12">
          Designed for Seamless Operations
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-8">
          {[
            { icon: '🗺️', title: 'Interactive Floorplans', desc: 'Import custom vector drawings and map interactive zones dynamically with built-in styling overlays.' },
            { icon: '⚡', title: 'Real-Time Stalls', desc: 'Update stall availability, modify dimensions, and update booth configurations instantly with live backend sync.' },
            { icon: '☁️', title: 'Cloudinary Integration', desc: 'Handle high-resolution media uploads for event blueprint maps directly via Cloudinary CDN services.' },
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-white/[0.02] border border-white/5 rounded-2xl p-10 transition-all duration-300 cursor-default hover:-translate-y-2 hover:border-indigo-500/20 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.15)]"
            >
              <div className="bg-indigo-500/10 text-indigo-400 w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6">
                {icon}
              </div>
              <h3 className="text-xl font-semibold m-0 mb-3 text-slate-50">{title}</h3>
              <p className="text-slate-400 leading-relaxed m-0 text-[0.95rem]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="text-center py-12 text-slate-600 text-sm border-t border-white/5">
        &copy; {new Date().getFullYear()} EventPulse. All rights reserved.
      </footer>

      {/* ── Demo Modal ─────────────────────────────────── */}
      {isDemoModalOpen && (
        <div
          className="fixed inset-0 bg-[#030712]/85 backdrop-blur-lg flex items-center justify-center z-[1000] p-6 animate-fade-in"
          onClick={closeDemoModal}
        >
          <div
            className="bg-[#0b0f19] border border-white/[0.08] rounded-[20px] p-10 w-full max-w-[480px] relative shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-5 right-5 bg-transparent border-none text-slate-500 text-2xl cursor-pointer leading-none hover:text-slate-50 transition-colors"
              onClick={closeDemoModal}
            >
              &times;
            </button>

            {!submitSuccess ? (
              <>
                <h3 className="text-[1.75rem] font-bold m-0 mb-2 text-slate-50">Book a Demo</h3>
                <p className="text-slate-400 text-sm m-0 mb-8">Fill in the details below and our product specialist will reach out to you.</p>
                <form onSubmit={submitDemoRequest} className="flex flex-col gap-5">
                  {[
                    { id: 'name', label: 'Full Name', type: 'text' },
                    { id: 'email', label: 'Work Email', type: 'email' },
                    { id: 'company', label: 'Company Name', type: 'text' },
                  ].map(({ id, label, type }) => (
                    <div key={id} className="flex flex-col gap-2">
                      <label htmlFor={id} className="text-xs font-semibold text-slate-400">{label}</label>
                      <input type={type} id={id} name={id} className={inputBase} value={demoRequest[id]} onChange={handleInputChange} required />
                    </div>
                  ))}
                  <div className="flex flex-col gap-2">
                    <label htmlFor="eventType" className="text-xs font-semibold text-slate-400">Primary Event Type</label>
                    <select id="eventType" name="eventType" className={`${inputBase} cursor-pointer [color-scheme:dark]`} value={demoRequest.eventType} onChange={handleInputChange}>
                      <option value="Exhibition">Exhibition / Tradeshow</option>
                      <option value="Conference">Corporate Conference</option>
                      <option value="Festival">Festival / Public Event</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="btn-gradient text-white border-none w-full py-3.5 text-base font-semibold rounded-lg cursor-pointer font-[inherit] mt-1 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting ? 'Submitting...' : 'Schedule Live Demo'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl text-emerald-500 mb-4">✓</div>
                <h3 className="text-[1.75rem] font-bold text-slate-50 m-0 mb-2">Request Submitted!</h3>
                <p className="text-slate-400 text-sm m-0 mb-8">We've received your request and will follow up shortly via email.</p>
                <button onClick={closeDemoModal} className="bg-white/[0.03] text-slate-50 border border-white/10 w-full py-3.5 text-base font-semibold rounded-lg cursor-pointer font-[inherit] hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}