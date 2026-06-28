import { useNavigate } from 'react-router-dom';

export default function OrganizerDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCreateEvent = () => {
    navigate('/create-event');
  };

  const handleViewEvents = () => {
    navigate('/events');
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-indigo-500/20 bg-white/5 backdrop-blur-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-3xl mx-auto mb-6">
          🗂️
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Organizer Dashboard</h1>
        <p className="text-indigo-400 mb-8">Welcome! Manage your events and floorplans here.</p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div 
            onClick={handleCreateEvent}
            className="rounded-xl border border-indigo-500/20 bg-white/5 p-4 text-slate-300 text-sm font-medium hover:border-indigo-400 hover:text-white transition cursor-pointer"
          >
            Create Event
          </div>
          <div 
            onClick={handleViewEvents}
            className="rounded-xl border border-indigo-500/20 bg-white/5 p-4 text-slate-300 text-sm font-medium hover:border-indigo-400 hover:text-white transition cursor-pointer"
          >
            View Events
          </div>
          <div className="rounded-xl border border-indigo-500/20 bg-white/5 p-4 text-slate-300 text-sm font-medium hover:border-indigo-400 hover:text-white transition cursor-pointer">
            Manage Stalls
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:border-red-400 hover:text-red-300 transition cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
}