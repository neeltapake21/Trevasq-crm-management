import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api/client';
import { AnalyticsOverview, ActivityLog } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  Send,
  MailCheck,
  TrendingUp,
  ArrowUpRight,
  Plus,
  UploadCloud,
  Activity,
  CheckCircle2,
  Clock,
  Inbox
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid
} from 'recharts';

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [overviewRes, activityRes] = await Promise.all([
          api.get('/analytics/overview'),
          api.get('/activity-logs?limit=8'),
        ]);
        setData(overviewRes?.data || null);
        setActivities(Array.isArray(activityRes?.data) ? activityRes.data : []);
      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_contacts: 0,
    new_leads_this_month: 0,
    active_subscribers: 0,
    unsubscribed_contacts: 0,
    globally_suppressed_contacts: 0,
    total_campaigns: 0,
    emails_sent: 0,
    delivered_count: 0,
    delivery_rate: 100,
  };

  const statCards = [
    { label: 'Total Contacts', value: kpis.total_contacts, icon: Users, color: 'text-slate-900', bg: 'bg-slate-100', subtitle: 'Centralized CRM' },
    { label: 'Active Subscribers', value: kpis.active_subscribers, icon: UserCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', subtitle: 'Consented to marketing' },
    { label: 'Unsubscribed Leads', value: kpis.unsubscribed_contacts, icon: UserX, color: 'text-amber-700', bg: 'bg-amber-50', subtitle: 'Product opt-outs' },
    { label: 'Globally Suppressed', value: kpis.globally_suppressed_contacts, icon: ShieldAlert, color: 'text-red-700', bg: 'bg-red-50', subtitle: 'Strictly blocked' },
    { label: 'Campaigns Launched', value: kpis.total_campaigns, icon: Send, color: 'text-blue-700', bg: 'bg-blue-50', subtitle: 'Automated sends' },
    { label: 'Emails Dispatched', value: kpis.emails_sent, icon: MailCheck, color: 'text-indigo-700', bg: 'bg-indigo-50', subtitle: 'Test mailer & live' },
    { label: 'Delivery Rate', value: `${kpis.delivery_rate}%`, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', subtitle: 'Provider verified' },
    { label: 'New Leads (30d)', value: `+${kpis.new_leads_this_month}`, icon: Inbox, color: 'text-violet-700', bg: 'bg-violet-50', subtitle: 'Inbound inquiries' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketing & Lead Operations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time status of multi-product mailing lists, automated campaign execution, and privacy suppression.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <NavLink
            to="/imports"
            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-colors"
          >
            <UploadCloud className="w-4 h-4 mr-1.5 text-slate-500" />
            Import CSV
          </NavLink>
          <NavLink
            to="/campaigns/new"
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Campaign Wizard
          </NavLink>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stat.value}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscribers by Product */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Active Subscribers by Product</h2>
              <p className="text-xs text-slate-400 mt-0.5">Independent per-product consent breakdown</p>
            </div>
            <NavLink to="/mailing-lists" className="text-xs font-semibold text-slate-900 hover:underline flex items-center">
              View Lists <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </NavLink>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.subscribers_by_product || []} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="product_name" tick={{ fontSize: 10, fill: '#64748b' }} angle={-15} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="subscribers" fill="#0f172a" radius={[4, 4, 0, 0]} name="Active Subscribers" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Inflow Trends */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Lead Acquisition Velocity</h2>
              <p className="text-xs text-slate-400 mt-0.5">New inquiries captured over time</p>
            </div>
            <NavLink to="/contacts" className="text-xs font-semibold text-slate-900 hover:underline flex items-center">
              View CRM <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </NavLink>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.leads_over_time || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                <Area type="monotone" dataKey="leads" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column: Recent Campaigns & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Execution Status (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Recent Campaigns & Deliveries</h2>
              <p className="text-xs text-slate-400 mt-0.5">Personalized automated sends with real event metrics</p>
            </div>
            <NavLink to="/campaigns" className="text-xs font-semibold text-slate-900 hover:underline">
              All Campaigns &rarr;
            </NavLink>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/75 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Campaign</th>
                  <th className="px-6 py-3">Target Product</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Sent</th>
                  <th className="px-6 py-3">Opens</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.campaign_performance || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No campaigns dispatched yet. Launch one from the Campaign Wizard!
                    </td>
                  </tr>
                ) : (
                  (data?.campaign_performance || []).map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        <NavLink to={`/campaigns/${c.id}`} className="hover:underline">
                          {c.name}
                        </NavLink>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">{c.product || c.product_name}</td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          c.status === 'sent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          c.status === 'scheduled' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-semibold text-slate-900">{c.sent ?? c.sent_count ?? 0}</td>
                      <td className="px-6 py-3.5 text-slate-600">{c.opens ?? c.open_count ?? 0}</td>
                      <td className="px-6 py-3.5 text-slate-400">{c.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Timeline (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Live Activity Feed</h2>
            <NavLink to="/activity" className="text-xs text-slate-500 hover:text-slate-900">
              View Log
            </NavLink>
          </div>

          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent logs recorded.</p>
            ) : (
              activities.slice(0, 6).map((log) => (
                <div key={log.id} className="flex items-start space-x-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-slate-900 mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 font-medium truncate">
                      {log.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {log.actor_email || 'System'} &bull; {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
