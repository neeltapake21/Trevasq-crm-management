import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Product } from '../types';
import { 
  Mail, 
  Users, 
  UserMinus, 
  Download, 
  Search, 
  ShieldCheck, 
  AlertCircle, 
  ExternalLink,
  Plus,
  Send,
  CheckCircle2
} from 'lucide-react';

interface SubscriberItem {
  subscription_id: number;
  contact_id: number;
  full_name: string;
  email: string;
  company?: string;
  status: string;
  consent_date?: string;
  consent_source?: string;
  is_globally_suppressed: boolean;
}

export const MailingLists: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [subscribers, setSubscribers] = useState<SubscriberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('subscribed');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get<Product[]>('/products');
        setProducts(res.data);
        if (res.data.length > 0) {
          setSelectedProductId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!selectedProductId) return;

    const fetchSubscribers = async () => {
      setLoadingList(true);
      try {
        const res = await api.get<{ subscribers: SubscriberItem[] }>(`/products/${selectedProductId}/subscribers`, {
          params: { status: statusFilter === 'all' ? undefined : statusFilter }
        });
        setSubscribers(res.data.subscribers || []);
      } catch (err) {
        console.error('Failed to load subscribers for product', err);
      } finally {
        setLoadingList(false);
      }
    };

    fetchSubscribers();
  }, [selectedProductId, statusFilter]);

  const activeProduct = products.find(p => p.id === selectedProductId);

  const filteredSubscribers = subscribers.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase()) ||
    s.company?.toLowerCase().includes(search.toLowerCase())
  );

  const exportList = () => {
    if (!filteredSubscribers.length) return;
    const headers = ['Contact ID', 'Full Name', 'Email', 'Company', 'Status', 'Consent Date', 'Consent Source', 'Globally Suppressed'];
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
    link.setAttribute('download', `${activeProduct?.slug || 'mailing-list'}-subscribers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mailing Lists</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Independent, consent-governed email recipient segments partitioned per product.
          </p>
        </div>
        {activeProduct && (
          <div className="flex items-center gap-3">
            <button
              onClick={exportList}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export List
            </button>
            <Link
              to={`/campaigns/new?product=${activeProduct.id}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Campaign to this List
            </Link>
          </div>
        )}
      </div>

      {notification && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <div className="text-sm flex-1">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Product List Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {products.map((p) => {
          const isSelected = p.id === selectedProductId;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProductId(p.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center gap-2 ${
                isSelected 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{p.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600'
              }`}>
                {p.active_subscribers}
              </span>
            </button>
          );
        })}
      </div>

      {activeProduct && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">{activeProduct.name} Segment</h2>
              <span className="text-xs font-mono text-slate-500">list-id: {activeProduct.slug}</span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Contacts who explicitly consented to receive emails regarding {activeProduct.name}.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400 uppercase text-[10px] font-semibold block">Active Subscribers</span>
              <span className="text-base font-bold text-emerald-600">{activeProduct.active_subscribers}</span>
            </div>
            <div className="text-right pl-4 border-l border-slate-200">
              <span className="text-slate-400 uppercase text-[10px] font-semibold block">Unsubscribed</span>
              <span className="text-base font-bold text-rose-600">{activeProduct.unsubscribed_count}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="subscribed">Subscribed Only (Eligible)</option>
              <option value="unsubscribed">Unsubscribed (Excluded)</option>
              <option value="all">All Contacts</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">List Status</th>
                <th className="py-3 px-4">Consent Source</th>
                <th className="py-3 px-4">Consent Date</th>
                <th className="py-3 px-4">Global Suppression</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingList ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading list members...</td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No contacts found in this list for selected filter.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((sub) => (
                  <tr key={sub.subscription_id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{sub.full_name}</div>
                      <div className="text-xs text-slate-500">{sub.email}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{sub.company || '—'}</td>
                    <td className="py-3 px-4">
                      {sub.status === 'subscribed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          Subscribed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          <UserMinus className="w-3 h-3" />
                          Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">{sub.consent_source || 'manual'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {sub.consent_date ? new Date(sub.consent_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {sub.is_globally_suppressed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800">
                          <AlertCircle className="w-3 h-3" /> Globally Suppressed
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
                        Profile →
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
