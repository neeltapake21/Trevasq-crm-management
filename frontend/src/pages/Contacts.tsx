import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Contact, Product } from '../types';
import {
  Users,
  Search,
  Filter,
  Plus,
  Download,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  X,
  Mail,
  Building,
  Globe,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const Contacts: React.FC = () => {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal for manual contact creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    company: '',
    designation: '',
    phone: '',
    country: '',
    product_interests: [] as number[],
    consent_given: false,
    consent_source: 'Manual Admin Entry',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      if (selectedProduct) params.product_id = selectedProduct;
      if (selectedSource) params.lead_source = selectedSource;
      if (selectedStatus) params.status = selectedStatus;

      const [cRes, pRes] = await Promise.all([
        api.get('/contacts', { params }),
        api.get('/products'),
      ]);
      setContacts(Array.isArray(cRes.data) ? cRes.data : (cRes.data?.items || []));
      setProducts(Array.isArray(pRes.data) ? pRes.data : []);
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [search, selectedProduct, selectedSource, selectedStatus]);

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/contacts/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trevasq_contacts_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalLoading(true);
    setModalError(null);
    try {
      await api.post('/contacts', formData);
      setIsModalOpen(false);
      setFormData({
        full_name: '',
        email: '',
        company: '',
        designation: '',
        phone: '',
        country: '',
        product_interests: [],
        consent_given: false,
        consent_source: 'Manual Admin Entry',
      });
      fetchContacts();
    } catch (err: any) {
      setModalError(err.response?.data?.detail || 'Failed to create contact');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Contact CRM Database</h1>
          <p className="text-sm text-slate-500 mt-1">
            Centralized lead records, independent product mailing preferences, and deduplication engine.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add Contact Manually
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by contact name, normalized email, or company..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        {/* Product Filter */}
        <div className="w-full md:w-48">
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-700"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-40">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="subscribed">Subscribed</option>
            <option value="unsubscribed">Unsubscribed</option>
            <option value="not_subscribed">Not Subscribed</option>
          </select>
        </div>

        {/* Lead Source Filter */}
        <div className="w-full md:w-36">
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white text-slate-700"
          >
            <option value="">All Sources</option>
            <option value="website">Website</option>
            <option value="product_form">Product Form</option>
            <option value="csv_import">CSV Import</option>
            <option value="manual">Manual Entry</option>
          </select>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3.5">Contact Name & Email</th>
                <th className="px-6 py-3.5">Company & Role</th>
                <th className="px-6 py-3.5">Product Subscriptions</th>
                <th className="px-6 py-3.5">Global Status</th>
                <th className="px-6 py-3.5">Acquisition Source</th>
                <th className="px-6 py-3.5">Date Added</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="inline-block w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-2 text-xs">Loading contacts...</p>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No contacts found matching criteria. Submit an inquiry or import leads.
                  </td>
                </tr>
              ) : (
                contacts.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                    className="hover:bg-slate-50/75 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{c.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.normalized_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800 font-medium">{c.company || '—'}</div>
                      <div className="text-[11px] text-slate-400">{c.designation || c.country || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.subscriptions.length === 0 ? (
                          <span className="text-[10px] text-slate-400 italic">None</span>
                        ) : (
                          c.subscriptions.map((s) => (
                            <span
                              key={s.id}
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                s.status === 'subscribed'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : s.status === 'unsubscribed'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200 line-through'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {s.product_name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {c.is_globally_suppressed ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          <ShieldAlert className="w-3 h-3 mr-1" />
                          Suppressed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          Active Lead
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 capitalize">
                      {c.lead_source.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400">
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Contact Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Add Contact to CRM</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateContact} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" /> {modalError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Normalized Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-slate-900"
                    placeholder="rahul@company.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    placeholder="e.g. ABC Technologies"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    placeholder="e.g. CISO"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone (Optional)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                    placeholder="e.g. UAE"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Product Associations</label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 border border-slate-200 rounded-lg text-xs">
                  {products.map((p) => (
                    <label key={p.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.product_interests.includes(p.id)}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...formData.product_interests, p.id]
                            : formData.product_interests.filter((id) => id !== p.id);
                          setFormData({ ...formData, product_interests: updated });
                        }}
                        className="rounded border-slate-300 text-slate-900"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Explicit Consent Requirement (Rule 5 & 6) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.consent_given}
                    onChange={(e) => setFormData({ ...formData, consent_given: e.target.checked })}
                    className="mt-0.5 rounded border-slate-300 text-slate-900"
                  />
                  <span className="text-[11px] leading-tight text-amber-950">
                    <strong>Documented Marketing Consent:</strong> The contact has explicitly consented to promotional emails for the selected products (not pre-selected).
                  </span>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
