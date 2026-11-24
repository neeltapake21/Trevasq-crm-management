import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  UserMinus, 
  ShieldAlert, 
  Mail, 
  Info,
  ArrowRight
} from 'lucide-react';

interface VerifyResponse {
  valid: boolean;
  contact_name: string;
  contact_email: string;
  product_id?: number;
  product_name?: string;
  is_globally_suppressed: boolean;
  is_product_unsubscribed: boolean;
}

export const PublicUnsubscribe: React.FC = () => {
  const { token: paramToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const token = paramToken || searchParams.get('token') || '';
  const initialScope = searchParams.get('scope') === 'global' ? 'global' : 'product';

  const [loading, setLoading] = useState(true);
  const [verifyData, setVerifyData] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form choice state
  const [selectedScope, setSelectedScope] = useState<'product' | 'global'>(initialScope);
  const [reason, setReason] = useState('Emails are no longer relevant');
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No unsubscribe token provided. Please use the link included in your email footer.');
      setLoading(false);
      return;
    }

    api.get<VerifyResponse>(`/unsubscribe/${token}`)
      .then(res => {
        setVerifyData(res.data);
      })
      .catch(err => {
        setError(err.response?.data?.detail || 'Invalid or expired unsubscribe link.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleConfirmUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post(`/unsubscribe/${token}`, {
        scope: selectedScope,
        reason: reason
      });
      setSuccessResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process unsubscribe request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base">TrevasQ</span>
              <span className="text-[10px] text-slate-500 block -mt-1">Communication Preferences</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
            Verifying cryptographic token...
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Unable to Process Request</h2>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">{error}</p>
          </div>
        ) : successResult ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">Unsubscribe Confirmed</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                {successResult.scope === 'global' ? (
                  <>
                    <strong>{successResult.contact_email}</strong> has been placed on our <strong>Global Suppression List</strong>. You will receive no further marketing or promotional emails from TrevasQ across any product.
                  </>
                ) : (
                  <>
                    <strong>{successResult.contact_email}</strong> has been removed from the <strong>{successResult.product_name}</strong> mailing list.
                  </>
                )}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 max-w-md mx-auto leading-relaxed flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Your preference is permanently recorded in our central suppression registry. Even if your contact details are included in future company lead imports, your opt-out status will persist.
              </span>
            </div>
          </div>
        ) : verifyData ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 mb-3">
                <UserMinus className="w-3.5 h-3.5" /> Manage Subscription Preferences
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Unsubscribe Preferences</h1>
              <p className="text-xs text-slate-500 mt-1">
                Managing email communications for: <strong className="text-slate-800">{verifyData.contact_name}</strong> (<code>{verifyData.contact_email}</code>)
              </p>
            </div>

            <form onSubmit={handleConfirmUnsubscribe} className="space-y-4">
              <div className="space-y-3">
                {/* Option 1: Product Specific */}
                {verifyData.product_name && (
                  <label 
                    className={`block p-4 rounded-xl border cursor-pointer transition ${
                      selectedScope === 'product'
                        ? 'border-indigo-600 bg-indigo-50/30'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="scope"
                        value="product"
                        checked={selectedScope === 'product'}
                        onChange={() => setSelectedScope('product')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-semibold text-sm text-slate-900">
                          Unsubscribe from {verifyData.product_name} only
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Stop promotional emails for {verifyData.product_name}. Retain communications for any other TrevasQ products you subscribe to.
                        </p>
                      </div>
                    </div>
                  </label>
                )}

                {/* Option 2: Global Opt-Out */}
                <label 
                  className={`block p-4 rounded-xl border cursor-pointer transition ${
                    selectedScope === 'global'
                      ? 'border-rose-600 bg-rose-50/30'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="scope"
                      value="global"
                      checked={selectedScope === 'global'}
                      onChange={() => setSelectedScope('global')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div>
                      <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                        <span>Global Opt-Out (All TrevasQ Communications)</span>
                        <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Complete Suppression</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Never send me any marketing or promotional emails from TrevasQ across any product, both existing and future.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reason for unsubscribing (Optional)
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Emails are no longer relevant">Emails are no longer relevant</option>
                  <option value="Too many emails received">Too many emails received</option>
                  <option value="I never signed up for this mailing list">I never signed up for this mailing list</option>
                  <option value="Switched organization / role">Switched organization / role</option>
                  <option value="Other reason">Other reason</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs disabled:opacity-50"
                >
                  {submitting ? 'Updating Preferences...' : 'Save Communication Preferences'}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 TrevasQ Technologies Inc. Compliance & Privacy Assurance.</p>
      </footer>
    </div>
  );
};
