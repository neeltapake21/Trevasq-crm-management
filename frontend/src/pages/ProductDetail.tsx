import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Product } from '../types';
import { 
  Package, 
  Users, 
  UserMinus, 
  Mail, 
  ArrowLeft, 
  ExternalLink, 
  Download, 
  Plus, 
  Send, 
  ShieldCheck, 
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';

interface Subscriber {
  subscription_id: number;
  contact_id: number;
  full_name: string;
  email: string;
  company?: string;
  status: string;
  consent_date?: string;
  consent_source?: string;
  unsubscribed_at?: string;
  is_globally_suppressed: boolean;
}

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('subscribed');

  useEffect(() => {
    const fetchProductData = async () => {
      setLoading(true);
      try {
        const [prodRes, subRes] = await Promise.all([
          api.get<Product>(`/products/${id}`),
          api.get<{ subscribers: Subscriber[] }>(`/products/${id}/subscribers`, {
            params: { status: statusFilter === 'all' ? undefined : statusFilter }
          })
        ]);
        setProduct(prodRes.data);
        setSubscribers(subRes.data.subscribers || []);
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProductData();
    }
  }, [id, statusFilter]);

  const filteredSubscribers = subscribers.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.company?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    if (!subscribers.length) return;
    const headers = ['Contact ID', 'Full Name', 'Email', 'Company', 'Subscription Status', 'Consent Date', 'Consent Source', 'Globally Suppressed'];
    const rows = filteredSubscribers.map(s => [
      s.contact_id,
      `"${s.full_name || ''}"`,
      `"${s.email || ''}"`,
      `"${s.company || ''}"`,
      s.status,
      s.consent_date || '',
      `"${s.consent_source || ''}"`,
      s.is_globally_suppressed ? 'YES' : 'NO'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${product?.slug || 'product'}-subscribers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !product) {
    return <div className="p-8 text-center text-slate-500">Loading product segment details...</div>;
  }

  if (!product) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Product not found.</p>
        <Link to="/products" className="text-indigo-600 font-medium text-sm mt-2 inline-block">
          ← Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div>
        <Link to="/products" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Products
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{product.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  product.status === 'active' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {product.status}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-0.5">Slug: {product.slug}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/inquiry?product=${product.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              Public Lead Form
            </Link>
            <Link
              to={`/campaigns/new?product=${product.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Launch Campaign for {product.name}
            </Link>
          </div>
        </div>
      </div>

      {/* Description & KPI Cards */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {product.description || 'No detailed description provided for this product segment.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase">
              Total Associated Contacts
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-2">{product.total_contacts}</p>
            <span className="text-xs text-slate-500 mt-1 block">Inquired or imported for this product</span>
          </div>

          <div className="bg-emerald-50/70 p-4 rounded-lg border border-emerald-100">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 uppercase">
              Active Mailing List Subscribers
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-800 mt-2">{product.active_subscribers}</p>
            <span className="text-xs text-emerald-600 mt-1 block">Verified consent & not suppressed</span>
          </div>

          <div className="bg-rose-50/70 p-4 rounded-lg border border-rose-100">
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700 uppercase">
              Product-Level Unsubscribes
              <UserMinus className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-800 mt-2">{product.unsubscribed_count}</p>
            <span className="text-xs text-rose-600 mt-1 block">Excluded from {product.name} campaigns</span>
          </div>
        </div>
      </div>

      {/* Subscriber Management Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search subscribers by name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
              >
                <option value="subscribed">Active Subscribers Only</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="all">All Associated Records</option>
              </select>
            </div>

            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Subscription Status</th>
                <th className="py-3 px-4">Consent Source</th>
                <th className="py-3 px-4">Consent Date</th>
                <th className="py-3 px-4">Global Suppression</th>
                <th className="py-3 px-4 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No contacts found for this status.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr key={sub.subscription_id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{sub.full_name}</div>
                      <div className="text-xs text-slate-500">{sub.email}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">
                      {sub.company || '—'}
                    </td>
                    <td className="py-3 px-4">
                      {sub.status === 'subscribed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Subscribed
                        </span>
                      ) : sub.status === 'unsubscribed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <UserMinus className="w-3 h-3" />
                          Unsubscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                          {sub.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {sub.consent_source || 'manual'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {sub.consent_date ? new Date(sub.consent_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {sub.is_globally_suppressed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <AlertTriangle className="w-3 h-3" />
                          Globally Suppressed
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Clear</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/contacts/${sub.contact_id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View CRM →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
