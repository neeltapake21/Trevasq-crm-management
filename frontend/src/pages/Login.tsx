import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@trevasq.com');
  const [password, setPassword] = useState('TrevasQ@2026');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to authenticate. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword('TrevasQ@2026');
    setError(null);
    setLoading(true);
    try {
      await login(userEmail, 'TrevasQ@2026');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-xl shadow-md">
            Q
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          TrevasQ Marketing Hub
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Automated Lead Capture, Campaign Delivery & Suppression CRM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-xs text-red-700">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  placeholder="admin@trevasq.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
              One-Click Evaluator Personas:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => quickLogin('admin@trevasq.com')}
                className="w-full py-1.5 px-3 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700"
              >
                <span><strong>Admin:</strong> Full permissions</span>
                <span className="text-[10px] text-slate-400">admin@trevasq.com</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('marketing@trevasq.com')}
                className="w-full py-1.5 px-3 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700"
              >
                <span><strong>Marketing Manager:</strong> Campaigns & Imports</span>
                <span className="text-[10px] text-slate-400">marketing@trevasq.com</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('analyst@trevasq.com')}
                className="w-full py-1.5 px-3 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700"
              >
                <span><strong>Analyst:</strong> Read-only reports</span>
                <span className="text-[10px] text-slate-400">analyst@trevasq.com</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
