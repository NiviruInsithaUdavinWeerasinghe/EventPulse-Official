import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [googlePayload, setGooglePayload] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Login failed.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Google sign in failed.");

      if (data.isNewUser) {
        setGooglePayload(data);
        setShowRoleModal(true);
      } else {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/dashboard");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelection = async (selectedRole) => {
    setShowRoleModal(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google-set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: googlePayload.user.id, role: selectedRole }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.message || "Setting role failed.");
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch {
      setError("Network error setting role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] px-8 py-10 rounded-3xl border border-white/10 bg-white/[0.02] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden transition-all duration-300">
      <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="text-center mb-8 relative z-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
          <Sparkles className="text-indigo-400" size={22} />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">Welcome Back</h2>
        <p className="text-slate-400 text-sm">Please sign in to access your dashboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Email Address
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Mail size={18} />
            </div>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl focus:border-indigo-500 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.2)] text-white placeholder-slate-500 transition-all duration-200 outline-none"
              placeholder="Enter your email" required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Password
          </label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Lock size={18} />
            </div>
            <input
              id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl focus:border-indigo-500 focus:shadow-[0_0_0_2px_rgba(99,102,241,0.2)] text-white placeholder-slate-500 transition-all duration-200 outline-none"
              placeholder="Enter your password" required
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" className="peer shrink-0 appearance-none w-4 h-4 border border-white/10 rounded bg-white/[0.02] checked:bg-indigo-500 checked:border-indigo-500 focus:outline-none transition-all" />
            <span className="text-slate-400 group-hover:text-slate-200 transition-colors">Remember me</span>
          </label>
          <a href="#forgot" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            Forgot Password?
          </a>
        </div>

        {error && (
          <p className="text-sm text-red-400 text-center font-medium bg-red-500/10 border border-red-500/20 py-2.5 rounded-xl">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 active:scale-[0.98] disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/20 cursor-pointer"
        >
          {loading ? "Signing in..." : "Sign In"}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-8 mb-6 relative flex items-center justify-center z-10">
        <div className="absolute w-full border-t border-white/5"></div>
        <div className="relative px-4 text-xs font-semibold text-slate-500 bg-[#030712] uppercase tracking-wider">
          Or continue with
        </div>
      </div>

      <div className="flex justify-center z-10 relative">
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={() => setError("Google Sign In failed. Please try again.")}
          theme="filled_dark"
          shape="pill"
        />
      </div>

      <div className="mt-8 text-center text-sm text-slate-400 z-10 relative">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
          Create Account
        </Link>
      </div>

      {showRoleModal && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-md flex items-center justify-center z-[2000] p-6">
          <div className="bg-[#0b0f19] border border-white/10 rounded-3xl p-8 w-full max-w-[440px] shadow-2xl text-center">
            <h3 className="text-2xl font-extrabold text-white mb-2">Select Your Role</h3>
            <p className="text-slate-400 text-sm mb-6">Please choose your account type to continue</p>
            <div className="flex flex-col gap-3">
              {[
                { value: "customer",  label: "Customer",  desc: "Browse events & explore layouts", icon: "🎟️" },
                { value: "vendor",    label: "Vendor",    desc: "Manage stalls & business profile", icon: "🏪" },
                { value: "organizer", label: "Organizer", desc: "Create & coordinate events", icon: "🗂️" },
              ].map((r) => (
                <button
                  key={r.value} onClick={() => handleRoleSelection(r.value)}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/[0.02] text-left hover:border-indigo-500 hover:bg-indigo-500/5 transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-2xl">{r.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{r.label}</p>
                    <p className="text-xs text-slate-500 leading-tight mt-0.5">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
