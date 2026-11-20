import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Shield, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  ArrowRight, 
  Building, 
  Mail, 
  User, 
  Globe, 
  Lock
} from 'lucide-react';

interface ProductOption {
  id: number;
  name: string;
  slug: string;
}

export const PublicInquiry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const productSlugParam = searchParams.get('product');

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company: '',
    designation: '',
    phone: '',
    country: '',
    product_slug: productSlugParam || '',
    message: '',
    marketing_consent: false,
    privacy_policy_accepted: false,
  });

  useEffect(() => {
    // Fetch products list without requiring auth
    axios.get('/api/products')
      .then(res => {
        setProducts(res.data);
        if (productSlugParam) {
          const match = res.data.find((p: any) => p.slug === productSlugParam);
          if (match) {
            setFormData(prev => ({ ...prev, product_slug: match.slug }));
          }
        }
      })
      .catch(err => {
        console.warn('Could not load products list publicly', err);
      });
  }, [productSlugParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.privacy_policy_accepted) {
      setErrorMessage('Please acknowledge the privacy policy to submit an inquiry.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await axios.post('/api/inquiries', {
        full_name: formData.full_name,
        email: formData.email,
        company: formData.company || undefined,
        designation: formData.designation || undefined,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
        product_slug: formData.product_slug || undefined,
        message: formData.message,
        marketing_consent: formData.marketing_consent,
        privacy_policy_accepted: true,
      });

      setSubmissionResult(res.data);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || 'Failed to submit inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Public Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base">TrevasQ</span>
              <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider block -mt-1">Quantum Security</span>
            </div>
          </div>
          <Link
            to="/login"
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 transition"
          >
            Staff Portal →
          </Link>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="max-w-2xl w-full mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        {submitted ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">Inquiry Received</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                Thank you, <strong>{formData.full_name}</strong>. Your inquiry has been routed to our enterprise quantum architecture specialists.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Registered Email:</span>
                <span className="font-mono text-slate-800">{formData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Product Interest:</span>
                <span className="font-semibold text-slate-900">
                  {submissionResult?.product_name || 'General Inquiries'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
                <span className="text-slate-500">Marketing Opt-In Status:</span>
                {formData.marketing_consent ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Subscribed to updates
                  </span>
                ) : (
                  <span className="text-slate-500">No promotional emails</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  full_name: '',
                  email: '',
                  company: '',
                  designation: '',
                  phone: '',
                  country: '',
                  product_slug: '',
                  message: '',
                  marketing_consent: false,
                  privacy_policy_accepted: false,
                });
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 inline-block"
            >
              ← Submit Another Inquiry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 mb-3">
                <Lock className="w-3.5 h-3.5" /> Enterprise Quantum Inquiries
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contact TrevasQ Solutions</h1>
              <p className="text-sm text-slate-500 mt-1">
                Speak with our cybersecurity engineers regarding quantum-resilient encryption, QGuard deployment, or readiness audits.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alex Vance"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="alex@enterprise.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Organization / Company</label>
                  <input
                    type="text"
                    placeholder="e.g. CyberDefense Ltd"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    placeholder="e.g. Chief Security Officer"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 012-3456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. United States"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product of Interest</label>
                <select
                  value={formData.product_slug}
                  onChange={(e) => setFormData({ ...formData, product_slug: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General Quantum Solutions Inquiry</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Inquiry Message *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us about your infrastructure or cryptographic requirements..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Explicit Marketing Consent Invariant */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="consent_checkbox"
                    checked={formData.marketing_consent}
                    onChange={(e) => setFormData({ ...formData, marketing_consent: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="consent_checkbox" className="text-xs text-slate-700 leading-relaxed cursor-pointer">
                    I agree to receive personalized promotional emails, quantum vulnerability alerts, and product release briefings from TrevasQ. (You can unsubscribe at any time).
                  </label>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60">
                  <input
                    type="checkbox"
                    id="privacy_checkbox"
                    required
                    checked={formData.privacy_policy_accepted}
                    onChange={(e) => setFormData({ ...formData, privacy_policy_accepted: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="privacy_checkbox" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                    I acknowledge that TrevasQ processes business inquiry records in accordance with our Privacy Policy.
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Submitting Inquiry...' : 'Send Inquiry'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>© 2026 TrevasQ Technologies Inc. All rights reserved. Quantum-Ready Cryptographic Architecture.</p>
      </footer>
    </div>
  );
};
