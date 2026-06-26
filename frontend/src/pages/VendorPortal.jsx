import { useNavigate } from 'react-router-dom';

export default function VendorPortal() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleClick = (item) => {
    if (item === 'Business Profile') navigate('/business/profile');
  };

  return (
    <div className="min-h-screen bg-[#030712] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl rounded-2xl border border-purple-500/20 bg-white/5 backdrop-blur-sm p-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-3xl mx-auto mb-6">
          🏪
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Vendor Portal</h1>
        <p className="text-purple-400 mb-8">Welcome! Manage your stalls and products here.</p>
        <div className="grid grid-cols-3 gap-4 mb-8">
          {['My Stalls', 'Active Tags', 'Business Profile'].map((item) => (
            <div
              key={item}
              onClick={() => handleClick(item)}
              className="rounded-xl border border-purple-500/20 bg-white/5 p-4 text-slate-300 text-sm font-medium hover:border-purple-400 hover:text-white transition cursor-pointer"
            >
              {item}
            </div>
          ))}
        </div>
        <button
          onClick={handleLogout}
          className="px-6 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium hover:border-red-400 hover:text-red-300 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
}