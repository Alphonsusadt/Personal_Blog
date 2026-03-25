import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { Lock, User, AlertCircle } from 'lucide-react';

export function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login(username, password);
      navigate('/admin');
    } catch {
      setError('Username atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#1E40AF] rounded-2xl mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">CMS Admin</h1>
          <p className="text-[#94A3B8] mt-1">Login untuk mengelola konten</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1E293B] rounded-2xl p-8 border border-[#334155]">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">Username</label>
            <div className="relative">
              <User className="w-5 h-5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-[#60A5FA] transition-colors"
                placeholder="admin"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-[#94A3B8] mb-2">Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] border border-[#334155] text-[#F8FAFC] rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:border-[#60A5FA] transition-colors"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1E40AF] text-white py-3 rounded-lg font-medium hover:bg-[#1E3A8A] transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
