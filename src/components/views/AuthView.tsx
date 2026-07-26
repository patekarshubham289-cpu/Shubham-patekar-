import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HeartPulse, Fingerprint, Mail, Lock, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const AuthView: React.FC = () => {
  const { login } = useApp();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('alex.vance@healthcare.plus');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Alex Vance');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(email);
    }, 1000);
  };

  const handleBiometricLogin = () => {
    setBiometricLoading(true);
    setTimeout(() => {
      setBiometricLoading(false);
      login('alex.vance@healthcare.plus');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-3">
            <HeartPulse className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            HealthCare<span className="text-emerald-400">+</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Luxury AI Precision Medicine & Health Platform
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 rounded-xl bg-neutral-900 border border-white/5 mb-6">
          <button
            onClick={() => setIsSignup(false)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              !isSignup ? 'bg-emerald-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsSignup(true)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
              isSignup ? 'bg-emerald-500 text-white shadow-md' : 'text-neutral-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500 transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
                className="rounded border-neutral-700 text-emerald-500 focus:ring-0"
              />
              Remember me
            </label>
            <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to ' + email); }} className="text-emerald-400 hover:underline font-medium">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <span className="animate-pulse">Authenticating...</span>
            ) : (
              <>
                <span>{isSignup ? 'Complete Registration' : 'Sign In to Health Vault'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
          <span className="relative px-3 bg-[#181818] text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
            Or Biometric Access
          </span>
        </div>

        {/* Biometric Touch ID Button */}
        <button
          onClick={handleBiometricLogin}
          disabled={biometricLoading}
          className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-white/10 text-neutral-200 font-bold text-xs flex items-center justify-center gap-2 transition"
        >
          <Fingerprint className="w-5 h-5 text-emerald-400" />
          <span>{biometricLoading ? 'Verifying FaceID / TouchID...' : 'Fast Biometric Sign In'}</span>
        </button>

        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>HIPAA Compliant • End-to-End Encrypted</span>
        </div>

      </div>
    </div>
  );
};
