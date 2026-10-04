import React, { useState } from 'react';
import { Lock, AlertCircle } from 'lucide-react';
import { loginUser } from '../api';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('openmediavault');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginUser(username, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[10000]">
      <form
        onSubmit={handleSubmit}
        className="w-80 p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-center w-12 h-12 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full mx-auto">
          <Lock className="w-6 h-6" />
        </div>

        <div className="text-center">
          <h2 className="text-sm font-bold text-slate-100">NAS OS Authentication</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Enter OpenMediaVault Credentials</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold rounded text-xs transition"
        >
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}