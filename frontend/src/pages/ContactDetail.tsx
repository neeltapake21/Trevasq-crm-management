import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import api from '../api/client';
import { Contact, Product } from '../types';
import {
  ArrowLeft,
  Mail,
  Building,
  Phone,
  Globe,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Send,
  Trash2,
  AlertTriangle,
  Inbox,
  CheckCircle2,
  FileText
} from 'lucide-react';

export const ContactDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'inquiries' | 'consent' | 'campaigns'>('subscriptions');

  const fetchContact = async () => {
    try {
      const res = await api.get(`/contacts/${id}`);
      setContact(res.data);
    } catch (err) {
      console.error('Failed to load contact', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, [id]);

  const handleDeletePrivacy = async () => {
    if (!window.confirm("Are you sure you want to delete this contact's personal information? Under privacy compliance rules, suppression records will be strictly preserved to prevent future unwanted marketing.")) {
      return;
    }
    try {
      await api.delete(`/contacts/${id}`);
      navigate('/contacts');
    } catch (err) {
      alert('Failed to delete contact.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">Contact not found.</p>
        <NavLink to="/contacts" className="mt-2 text-xs font-semibold text-slate-900 underline inline-block">
          &larr; Back to Contacts
        </NavLink>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <div>
        <NavLink to="/contacts" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Contact CRM
        </NavLink>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-14 h-14 rounded-xl bg-slate-900 text-white font-bold text-xl flex items-center justify-center shadow-sm">
            {contact.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-900">{contact.full_name}</h1>
              {contact.is_globally_suppressed && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                  <ShieldAlert className="w-3 h-3 mr-1" /> Globally Suppressed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{contact.normalized_email}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
              {contact.company && (
                <span className="flex items-center">
                  <Building className="w-3.5 h-3.5 mr-1 text-slate-400" /> {contact.company}
                </span>
              )}
              {contact.designation && (
                <span className="text-slate-400 font-medium">&bull; {contact.designation}</span>
              )}
              {contact.country && (
                <span className="flex items-center">
                  <Globe className="w-3.5 h-3.5 mr-1 text-slate-400" /> {contact.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Privacy Deletion / Rights Button */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDeletePrivacy}
            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete Data (Preserve Suppression)
          </button>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="border-b border-slate-200 flex space-x-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'subscriptions'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Product Subscriptions ({contact.subscriptions.length})
        </button>
        <button
          onClick={() => setActiveTab('inquiries')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'inquiries'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Inquiry History ({(contact.inquiries || []).length})
        </button>
        <button
          onClick={() => setActiveTab('consent')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'consent'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Consent Audit Trail ({(contact.consent_events || []).length})
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'campaigns'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Campaign Dispatches ({(contact.campaign_history || []).length})
        </button>
      </div>

      {/* Tab 1: Product Subscriptions */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Multi-Product Mailing Preferences</h2>
              <p className="text-xs text-slate-400 mt-0.5">Preferences remain strictly independent per product</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contact.subscriptions.length === 0 ? (
              <p className="text-xs text-slate-400 col-span-2 py-4 text-center">No product subscriptions found.</p>
            ) : (
              contact.subscriptions.map((s) => (
                <div key={s.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs">{s.product_name}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      s.status === 'subscribed'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : s.status === 'unsubscribed'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <p>Consent Date: {s.consent_date ? new Date(s.consent_date).toLocaleDateString() : 'None documented'}</p>
                    <p>Source: {s.consent_source || 'Inquiry Form'}</p>
                    {s.unsubscribed_at && (
                      <p className="text-red-600 font-medium">Unsubscribed on: {new Date(s.unsubscribed_at).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Inquiries History */}
      {activeTab === 'inquiries' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Inbound Communication & Inquiries</h2>
          <div className="space-y-3">
            {(contact.inquiries || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No inquiries logged.</p>
            ) : (
              contact.inquiries?.map((inq) => (
                <div key={inq.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900">{inq.product_name || 'General Inquiry'}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                        {inq.source}
                      </span>
                    </div>
                    <span className="text-slate-400">{new Date(inq.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/60">
                    "{inq.message || 'No written message provided.'}"
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Marketing consent checked: <strong>{inq.consent_given ? 'Yes' : 'No'}</strong>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Consent Audit Trail */}
      {activeTab === 'consent' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Legal Consent & Opt-Out Audit Log</h2>
          <div className="space-y-3">
            {(contact.consent_events || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No explicit consent events recorded.</p>
            ) : (
              contact.consent_events?.map((ev) => (
                <div key={ev.id} className="p-3.5 rounded-xl border border-slate-200 flex items-start justify-between text-xs">
                  <div>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase mb-1 ${
                      ev.event_type.includes('opt_out') || ev.event_type.includes('withdrawn')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {ev.event_type.replace(/_/g, ' ')}
                    </span>
                    <p className="text-slate-800 font-medium">Source: {ev.consent_source || 'Website'}</p>
                    <p className="text-[11px] text-slate-500">Method: {ev.consent_method || 'Form'}</p>
                    {ev.evidence_reference && (
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Evidence: {ev.evidence_reference}</p>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px] whitespace-nowrap">
                    {new Date(ev.event_timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Campaign History */}
      {activeTab === 'campaigns' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Campaign Dispatches to this Contact</h2>
          <div className="space-y-3">
            {(contact.campaign_history || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No promotional emails dispatched yet.</p>
            ) : (
              contact.campaign_history?.map((c: any, idx: number) => (
                <div key={idx} className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{c.campaign_name}</p>
                    <p className="text-[11px] text-slate-500">Product: {c.product_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {c.status}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {c.sent_at ? new Date(c.sent_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
