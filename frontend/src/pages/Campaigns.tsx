import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Campaign, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Send, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Pause, 
  Eye, 
  Mail, 
  BarChart2,
  Calendar
} from 'lucide-react';

export const Campaigns: React.FC = () => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const [campRes, prodRes] = await Promise.all([
        api.get<Campaign[]>('/campaigns'),
        api.get<Product[]>('/products')
      ]);
      setCampaigns(campRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load campaigns', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleExecuteNow = async (campaignId: number, campaignName: string) => {
    if (!window.confirm(`Are you sure you want to trigger immediate delivery for "${campaignName}"?`)) return;

    try {
      await api.post(`/campaigns/${campaignId}/execute`);
      setNotification({
        type: 'success',
        message: `Campaign "${campaignName}" launched successfully. Personalized emails dispatched.`
      });
      fetchCampaigns();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to execute campaign'
      });
    }
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase()) ||
      c.product_name.toLowerCase().includes(search.toLowerCase());

    const matchesProduct = selectedProduct === 'all' || c.product_id.toString() === selectedProduct;
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;

    return matchesSearch && matchesProduct && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Sent</span>;
      case 'scheduled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><Clock className="w-3 h-3" /> Scheduled</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">Processing</span>;
      case 'paused':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200">Paused</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">Draft</span>;
    }
  };

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalDelivered = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.opened_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Automated promotional email marketing campaigns with strict product eligibility and unsubscribe enforcement.
          </p>
        </div>
        {canManage && (
          <Link
            to="/campaigns/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Campaigns</span>
          <p className="text-2xl font-bold text-slate-900 mt-2">{campaigns.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Created & scheduled</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Emails Dispatched</span>
          <p className="text-2xl font-bold text-indigo-600 mt-2">{totalSent}</p>
          <span className="text-xs text-indigo-500 mt-1 block">Through adapter layer</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Delivered</span>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{totalDelivered}</p>
          <span className="text-xs text-emerald-600 mt-1 block">
            {totalSent ? Math.round((totalDelivered / totalSent) * 100) : 100}% delivery rate
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Opens Recorded</span>
          <p className="text-2xl font-bold text-purple-600 mt-2">{totalOpens}</p>
          <span className="text-xs text-slate-500 mt-1 block">Engagement tracked via webhooks</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns by name, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="all">All Product Targets</option>
              {products.map((p) => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Target Product</th>
                <th className="py-3 px-4">Subject Line</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Audience & Delivery</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading campaigns...</td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No campaigns match your filters.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3 px-4">
                      <Link to={`/campaigns/${camp.id}`} className="font-semibold text-slate-900 hover:text-indigo-600 block">
                        {camp.name}
                      </Link>
                      <span className="text-xs text-slate-400">ID #{camp.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        {camp.product_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate text-xs text-slate-700">
                      {camp.subject}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(camp.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Delivered: <strong>{camp.delivered_count}</strong> / {camp.recipients_count || camp.eligible_count}</span>
                        </div>
                        <div className="w-28 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-1.5 rounded-full" 
                            style={{ 
                              width: `${camp.recipients_count ? Math.min(100, Math.round((camp.delivered_count / camp.recipients_count) * 100)) : (camp.status === 'sent' ? 100 : 0)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {camp.sent_at 
                        ? `Sent: ${new Date(camp.sent_at).toLocaleDateString()}` 
                        : camp.scheduled_at 
                          ? `Scheduled: ${new Date(camp.scheduled_at).toLocaleDateString()}`
                          : `Created: ${new Date(camp.created_at).toLocaleDateString()}`
                      }
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (camp.status === 'draft' || camp.status === 'scheduled') && (
                          <button
                            onClick={() => handleExecuteNow(camp.id, camp.name)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition border border-emerald-200"
                            title="Send Immediately"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Send Now
                          </button>
                        )}
                        <Link
                          to={`/campaigns/${camp.id}`}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="View Campaign Details & Analytics"
                        >
                          <Eye className="w-4 h-4" />
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
    </div>
  );
};
