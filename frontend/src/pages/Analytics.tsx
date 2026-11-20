import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { AnalyticsOverview } from '../types';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Mail, 
  CheckCircle2, 
  UserMinus, 
  Send, 
  Eye, 
  ShieldAlert, 
  Download,
  Calendar,
  Layers
} from 'lucide-react';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await api.get<AnalyticsOverview>('/analytics/overview');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return <div className="p-8 text-center text-slate-500">Calculating analytics from live database...</div>;
  }

  const { kpis, leads_over_time, leads_by_source, subscribers_by_product, campaign_performance, email_delivery_trends, unsubscribe_trends } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Marketing Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time multi-product funnel performance, subscriber health, and campaign engagement metrics.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total CRM Contacts</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Users className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{kpis.total_contacts}</p>
          <span className="text-xs text-slate-500 mt-1 block">+{kpis.new_leads_this_month} new this month</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscribers</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{kpis.active_subscribers}</p>
          <span className="text-xs text-emerald-600 mt-1 block">Valid marketing consent</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dispatched Emails</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Send className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{kpis.emails_sent}</p>
          <span className="text-xs text-blue-600 mt-1 block">{kpis.delivery_rate}% delivery rate</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Suppressions</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><ShieldAlert className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{kpis.globally_suppressed_contacts}</p>
          <span className="text-xs text-slate-500 mt-1 block">Total opt-outs: {kpis.unsubscribed_contacts}</span>
        </div>
      </div>

      {/* Row 1 Charts: Leads Over Time & Acquisition Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Lead Acquisition Trajectory</h2>
          <p className="text-xs text-slate-500 mb-4">Cumulative monthly lead acquisition volume across all channels.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={leads_over_time} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Area type="monotone" dataKey="leads" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#leadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Acquisition by Channel</h2>
          <p className="text-xs text-slate-500 mb-4">Source distribution of recorded inquiries.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={leads_by_source}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="source"
                >
                  {leads_by_source.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Subscribers by Product & Delivery Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Subscribers by Product Segment</h2>
          <p className="text-xs text-slate-500 mb-4">Active subscribers versus product-level unsubscribes.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscribers_by_product} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="product_name" stroke="#94a3b8" fontSize={10} tickLine={false} interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="subscribers" name="Active Subscribers" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unsubscribed" name="Unsubscribed" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Email Delivery Trends (Last 7 Days)</h2>
          <p className="text-xs text-slate-500 mb-4">Volume of sent versus successfully delivered messages.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={email_delivery_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="sent" name="Sent" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" name="Delivered" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Campaign Performance Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-900 text-sm">Campaign Performance Audit</h3>
          <p className="text-xs text-slate-500">Live delivery and engagement metrics across executed campaigns.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Campaign</th>
                <th className="py-3 px-4">Product Target</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Sent</th>
                <th className="py-3 px-4">Delivered Rate</th>
                <th className="py-3 px-4">Open Rate</th>
                <th className="py-3 px-4">Click Rate</th>
                <th className="py-3 px-4">Unsubscribes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaign_performance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">No campaigns launched yet.</td>
                </tr>
              ) : (
                campaign_performance.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/75 transition text-xs">
                    <td className="py-3 px-4 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3 px-4">{c.product_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{c.sent_count}</td>
                    <td className="py-3 px-4 font-medium text-emerald-700">{c.delivery_rate}%</td>
                    <td className="py-3 px-4 font-medium text-purple-700">{c.open_rate}%</td>
                    <td className="py-3 px-4 font-medium text-sky-700">{c.click_rate}%</td>
                    <td className="py-3 px-4 text-rose-700 font-semibold">{c.unsubscribed_count}</td>
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
