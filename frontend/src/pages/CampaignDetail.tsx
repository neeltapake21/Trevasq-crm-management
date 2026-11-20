import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Campaign, CampaignRecipient } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowLeft, 
  Send, 
  Play, 
  Pause, 
  XCircle, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  Clock, 
  Eye, 
  MousePointer, 
  ShieldAlert, 
  Download,
  Search,
  ExternalLink
} from 'lucide-react';

export const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<CampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaignData = async () => {
    setLoading(true);
    try {
      const [campRes, recipRes] = await Promise.all([
        api.get<Campaign>(`/campaigns/${id}`),
        api.get<CampaignRecipient[]>(`/campaigns/${id}/recipients`)
      ]);
      setCampaign(campRes.data);
      setRecipients(recipRes.data);
    } catch (err) {
      console.error('Failed to load campaign data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCampaignData();
    }
  }, [id]);

  const handleAction = async (action: 'execute' | 'pause' | 'resume' | 'cancel') => {
    if (!id || !campaign) return;
    if (action === 'cancel' && !window.confirm('Are you sure you want to cancel this campaign?')) return;

    setActionLoading(true);
    setNotification(null);
    try {
      if (action === 'execute') {
        await api.post(`/campaigns/${id}/execute`);
        setNotification({ type: 'success', message: 'Campaign dispatched successfully!' });
      } else if (action === 'pause') {
        await api.post(`/campaigns/${id}/pause`);
        setNotification({ type: 'success', message: 'Campaign paused.' });
      } else if (action === 'resume') {
        await api.post(`/campaigns/${id}/resume`);
        setNotification({ type: 'success', message: 'Campaign resumed.' });
      } else if (action === 'cancel') {
        await api.post(`/campaigns/${id}/cancel`);
        setNotification({ type: 'success', message: 'Campaign cancelled.' });
      }
      fetchCampaignData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || `Failed to ${action} campaign`
      });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRecipients = recipients.filter(r => {
    const matchesSearch = 
      r.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.contact_email?.toLowerCase().includes(search.toLowerCase()) ||
      r.company?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportRecipientsCSV = () => {
    if (!recipients.length) return;
    const headers = ['Contact ID', 'Name', 'Email', 'Company', 'Delivery Status', 'Provider Message ID', 'Sent At', 'Events Count'];
    const rows = filteredRecipients.map(r => [
      r.contact_id,
      `"${r.contact_name || ''}"`,
      `"${r.contact_email || ''}"`,
      `"${r.company || ''}"`,
      r.status,
      `"${r.provider_message_id || ''}"`,
      r.sent_at || '',
      r.events_count
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campaign-${campaign?.id}-recipients.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && !campaign) {
    return <div className="p-8 text-center text-slate-500">Loading campaign report...</div>;
  }

  if (!campaign) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Campaign not found.</p>
        <Link to="/campaigns" className="text-indigo-600 font-medium text-sm mt-2 inline-block">
          ← Back to Campaigns
        </Link>
      </div>
    );
  }

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  const deliveryRate = campaign.recipients_count 
    ? Math.round((campaign.delivered_count / campaign.recipients_count) * 100) 
    : (campaign.status === 'sent' ? 100 : 0);

  const openRate = campaign.delivered_count 
    ? Math.round((campaign.opened_count / campaign.delivered_count) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div>
        <Link to="/campaigns" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-3">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaigns
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{campaign.name}</h1>
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider ${
                campaign.status === 'sent' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : campaign.status === 'scheduled'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : campaign.status === 'paused'
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                      : 'bg-slate-100 text-slate-700'
              }`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Target: <strong>{campaign.product_name}</strong></span>
              <span>•</span>
              <span>Subject: <strong>"{campaign.subject}"</strong></span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
            >
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              Preview Template
            </button>

            {canManage && (campaign.status === 'draft' || campaign.status === 'scheduled') && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction('execute')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Delivery Now
              </button>
            )}

            {canManage && campaign.status === 'scheduled' && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction('pause')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition"
              >
                <Pause className="w-3.5 h-3.5" />
                Pause
              </button>
            )}

            {canManage && campaign.status === 'paused' && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction('resume')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
              >
                <Play className="w-3.5 h-3.5" />
                Resume
              </button>
            )}

            {canManage && (campaign.status === 'scheduled' || campaign.status === 'paused') && (
              <button
                disabled={actionLoading}
                onClick={() => handleAction('cancel')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>
        </div>
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

      {/* Analytics KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Audience</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{campaign.recipients_count || campaign.eligible_count}</p>
          <span className="text-[10px] text-slate-400">Target contacts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sent</span>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{campaign.sent_count}</p>
          <span className="text-[10px] text-indigo-500">Dispatched emails</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Delivered</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{campaign.delivered_count}</p>
          <span className="text-[10px] text-emerald-600">{deliveryRate}% delivery rate</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Opens</span>
          <p className="text-2xl font-bold text-purple-600 mt-1">{campaign.opened_count}</p>
          <span className="text-[10px] text-purple-600">{openRate}% open rate</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Clicks</span>
          <p className="text-2xl font-bold text-sky-600 mt-1">{campaign.clicked_count}</p>
          <span className="text-[10px] text-sky-500">CTA interactions</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Unsubscribes</span>
          <p className="text-2xl font-bold text-rose-600 mt-1">{campaign.unsubscribed_count}</p>
          <span className="text-[10px] text-slate-400">Opt-outs recorded</span>
        </div>
      </div>

      {/* Recipient Delivery Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Delivery Logs & Audit Records</h3>
            <p className="text-xs text-slate-500">Idempotent recipient records preventing duplicate delivery.</p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filter by name, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="delivered">Delivered</option>
              <option value="sent">Sent</option>
              <option value="bounced">Bounced</option>
              <option value="failed">Failed</option>
            </select>

            <button
              onClick={exportRecipientsCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4">Provider Message ID</th>
                <th className="py-3 px-4">Sent At</th>
                <th className="py-3 px-4 text-right">CRM Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecipients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    {campaign.status === 'draft' || campaign.status === 'scheduled'
                      ? 'No recipient logs generated yet. Delivery records will populate upon execution.'
                      : 'No recipient records match the filter.'}
                  </td>
                </tr>
              ) : (
                filteredRecipients.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/75 transition">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{r.contact_name}</div>
                      <div className="text-xs text-slate-500">{r.contact_email}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700">{r.company || '—'}</td>
                    <td className="py-3 px-4">
                      {r.status === 'delivered' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          Delivered
                        </span>
                      ) : r.status === 'sent' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">
                      {r.provider_message_id || 'simulated-delivery'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/contacts/${r.contact_id}`}
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

      {/* Preview HTML Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Email Template Content</h3>
                <p className="text-xs text-slate-500">Subject: {campaign.subject}</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div 
                className="text-sm text-slate-800"
                dangerouslySetInnerHTML={{ __html: campaign.html_content }}
              />
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
