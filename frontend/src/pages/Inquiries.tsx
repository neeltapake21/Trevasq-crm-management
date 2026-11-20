import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Inquiry, Product } from '../types';
import { 
  Inbox, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  Plus, 
  Eye, 
  MessageSquare,
  Building,
  Mail,
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const Inquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [consentFilter, setConsentFilter] = useState<string>('all');
  
  // Modal states
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New inquiry form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company: '',
    designation: '',
    phone: '',
    country: '',
    product_id: '',
    message: '',
    marketing_consent: false,
    privacy_policy_accepted: true,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [inqRes, prodRes] = await Promise.all([
        api.get<Inquiry[]>('/inquiries'),
        api.get<Product[]>('/products')
      ]);
      setInquiries(inqRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification(null);

    try {
      const payload: any = {
        full_name: formData.full_name,
        email: formData.email,
        company: formData.company || undefined,
        designation: formData.designation || undefined,
        phone: formData.phone || undefined,
        country: formData.country || undefined,
        product_id: formData.product_id ? parseInt(formData.product_id) : undefined,
        message: formData.message,
        marketing_consent: formData.marketing_consent,
        privacy_policy_accepted: true,
      };

      await api.post('/inquiries', payload);
      setNotification({
        type: 'success',
        message: `Inquiry recorded successfully. Contact deduplicated and ${formData.marketing_consent ? 'subscribed to product list' : 'saved with NO marketing consent'}.`
      });
      setShowAddModal(false);
      setFormData({
        full_name: '',
        email: '',
        company: '',
        designation: '',
        phone: '',
        country: '',
        product_id: '',
        message: '',
        marketing_consent: false,
        privacy_policy_accepted: true,
      });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to submit inquiry'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const matchesSearch = 
      inq.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      inq.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
      inq.message?.toLowerCase().includes(search.toLowerCase());

    const matchesProduct = 
      selectedProduct === 'all' || 
      inq.product_id?.toString() === selectedProduct;

    const matchesConsent = 
      consentFilter === 'all' ||
      (consentFilter === 'yes' && inq.consent_given) ||
      (consentFilter === 'no' && !inq.consent_given);

    return matchesSearch && matchesProduct && matchesConsent;
  });

  const totalInquiries = inquiries.length;
  const consentGivenCount = inquiries.filter(i => i.consent_given).length;
  const noConsentCount = totalInquiries - consentGivenCount;

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads & Inquiries</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time feed of multi-channel inquiries across web forms, products, and direct contacts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/inquiry"
            target="_blank"
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition shadow-xs"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            Public Web Form
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Record Lead Inquiry
          </button>
        </div>
      </div>

      {notification && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm flex-1">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Inquiries</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Inbox className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalInquiries}</p>
          <span className="text-xs text-slate-500 mt-1 block">Multi-product lead acquisitions</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Marketing Consent Granted</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ShieldCheck className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{consentGivenCount}</p>
          <span className="text-xs text-emerald-600 mt-1 block">
            {totalInquiries ? Math.round((consentGivenCount / totalInquiries) * 100) : 0}% opt-in rate
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Marketing Consent</span>
            <span className="p-2 bg-slate-100 text-slate-600 rounded-lg"><XCircle className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-700 mt-2">{noConsentCount}</p>
          <span className="text-xs text-slate-500 mt-1 block">Protected from unsolicited campaigns</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search leads, emails, messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="all">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
          </div>

          <select
            value={consentFilter}
            onChange={(e) => setConsentFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="all">All Consent States</option>
            <option value="yes">Consent Given (Opt-In)</option>
            <option value="no">No Consent</option>
          </select>
        </div>
      </div>

      {/* Inquiries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Lead Contact</th>
                <th className="py-3 px-4">Product Interest</th>
                <th className="py-3 px-4">Channel / Source</th>
                <th className="py-3 px-4">Marketing Consent</th>
                <th className="py-3 px-4">Inquiry Message</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading inquiries...
                  </td>
                </tr>
              ) : filteredInquiries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No inquiries match your current filters.
                  </td>
                </tr>
              ) : (
                filteredInquiries.map((inq) => (
                  <tr key={inq.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{inq.contact_name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-400" />
                        {inq.contact_email}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {inq.product_name ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                          {inq.product_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">General Inquiry</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono">
                        {inq.source}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {inq.consent_given ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Opt-In Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          No Consent
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                      {inq.message || <span className="text-slate-400 italic">No message provided</span>}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {new Date(inq.created_at).toLocaleDateString()} {new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewInquiry(inq)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="View Message"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <Link
                          to={`/contacts/${inq.contact_id}`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="View Contact Profile"
                        >
                          <User className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Inquiry Modal */}
      {viewInquiry && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Inquiry Details</h3>
                <p className="text-xs text-slate-500">ID #{viewInquiry.id} • Received on {new Date(viewInquiry.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setViewInquiry(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-medium"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Contact Name:</span>
                  <span className="font-medium text-slate-900">{viewInquiry.contact_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Email Address:</span>
                  <span className="font-mono text-slate-800 text-xs">{viewInquiry.contact_email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Product:</span>
                  <span className="font-medium text-slate-900">{viewInquiry.product_name || 'General Inquiry'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Acquisition Channel:</span>
                  <span className="font-mono text-xs text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {viewInquiry.source}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Explicit Marketing Consent:</span>
                  {viewInquiry.consent_given ? (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Granted (Lawful Basis: Consent)
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Withheld (No promotional emails)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Inquiry Message Content
                </label>
                <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed text-sm min-h-[80px]">
                  {viewInquiry.message || 'No message provided.'}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
              <Link
                to={`/contacts/${viewInquiry.contact_id}`}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                Go to Full Contact Profile →
              </Link>
              <button
                onClick={() => setViewInquiry(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record New Inquiry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Record Lead Inquiry</h3>
                <p className="text-xs text-slate-500">Simulate or register an inquiry from any marketing touchpoint.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateInquiry} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Apex Dynamics"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Chief Security Officer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="+1 555-0199"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. United Kingdom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product of Interest</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General Inquiry (No specific product)</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id.toString()}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Inquiry Message *</label>
                <textarea
                  required
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe your inquiry requirements or technical questions..."
                />
              </div>

              {/* Explicit Consent Invariant */}
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-3 text-xs text-amber-900 space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="inquiry_consent"
                    checked={formData.marketing_consent}
                    onChange={(e) => setFormData({ ...formData, marketing_consent: e.target.checked })}
                    className="mt-0.5 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="inquiry_consent" className="cursor-pointer font-medium leading-relaxed">
                    Lead provided explicit opt-in consent to receive promotional marketing emails and product updates.
                  </label>
                </div>
                <p className="text-[11px] text-amber-700 pl-5">
                  Notice: If unchecked, inquiry is stored and contact is saved to CRM, but contact will NOT be eligible for marketing campaigns.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Record Inquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
