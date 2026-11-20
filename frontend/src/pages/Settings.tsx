import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, 
  Mail, 
  ShieldCheck, 
  Inbox, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  RefreshCw, 
  Server, 
  Key, 
  Terminal
} from 'lucide-react';

interface MockEmail {
  to_email: string;
  to_name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  timestamp: string;
  message_id: string;
  provider: string;
}

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const [settingsData, setSettingsData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Mailbox
  const [mockEmails, setMockEmails] = useState<MockEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);
  const [loadingMailbox, setLoadingMailbox] = useState(false);

  // Form state
  const [emailProvider, setEmailProvider] = useState('test');
  const [emailTestMode, setEmailTestMode] = useState(true);
  const [fromAddress, setFromAddress] = useState('marketing@trevasq.com');
  const [fromName, setFromName] = useState('TrevasQ Quantum Security');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [setRes, mailRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/sent-mailbox')
      ]);
      setSettingsData(setRes.data);
      setEmailProvider(setRes.data.email_provider || 'test');
      setEmailTestMode(setRes.data.email_test_mode ?? true);
      setFromAddress(setRes.data.email_from_address || 'marketing@trevasq.com');
      setFromName(setRes.data.email_from_name || 'TrevasQ Quantum Security');
      setMockEmails(mailRes.data.emails || []);
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshMailbox = async () => {
    setLoadingMailbox(true);
    try {
      const res = await api.get('/settings/sent-mailbox');
      setMockEmails(res.data.emails || []);
    } catch (err) {
      console.error('Failed to refresh mailbox', err);
    } finally {
      setLoadingMailbox(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      await api.post('/settings', {
        email_provider: emailProvider,
        email_test_mode: emailTestMode,
        email_from_address: fromAddress,
        email_from_name: fromName
      });
      setNotification({ type: 'success', message: 'System email settings updated successfully.' });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update settings (Admin privileges required)'
      });
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Email dispatch service provider adapters, test mode sandbox, and regulatory compliance configuration.
        </p>
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

      {/* Grid: Provider Config & Test Mailbox */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provider Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Server className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">Email Adapter Configuration</h2>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Active Email Provider
              </label>
              <select
                disabled={!isAdmin}
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              >
                <option value="test">Safe Test Mode (Simulated Outbox, No Live Emails)</option>
                <option value="smtp">Standard SMTP Server</option>
                <option value="sendgrid">SendGrid Web API</option>
                <option value="ses">Amazon SES</option>
                <option value="mailgun">Mailgun API</option>
              </select>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Adapter architecture allows zero-code switching between enterprise providers.
              </span>
            </div>

            {/* Test Mode Invariant Alert */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="test_mode_toggle"
                  disabled={!isAdmin}
                  checked={emailTestMode}
                  onChange={(e) => setEmailTestMode(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="test_mode_toggle" className="text-xs font-semibold text-indigo-950 cursor-pointer">
                  Safe Development & Testing Mode Active
                </label>
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed pl-5">
                When enabled, campaign emails are safely stored in the internal test outbox. No unsolicited emails will ever be dispatched to real third-party inboxes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">From Email Address</label>
                <input
                  type="email"
                  disabled={!isAdmin}
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">From Sender Name</label>
                <input
                  type="text"
                  disabled={!isAdmin}
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {!isAdmin && 'Only Admins can modify provider credentials.'}
              </span>
              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Legal & Regulatory Invariants */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Compliance & Regulatory Invariants</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <h3 className="font-semibold text-slate-800 text-xs mb-1">Per-Product Consent Separation</h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Opt-in consent for one product (e.g. QGuard) does not grant permission to email that lead regarding unrelated products. Each list evaluates independent opt-ins.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <h3 className="font-semibold text-slate-800 text-xs mb-1">Re-Import Suppression Immutability</h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                When an existing contact is unsubscribed or globally suppressed, subsequent CSV imports or inquiry submissions cannot reactivate their subscription status.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
              <h3 className="font-semibold text-slate-800 text-xs mb-1">Cryptographic Unguessable Unsubscribe Tokens</h3>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Links use URL-safe random cryptographic tokens generated via <code>secrets.token_urlsafe(32)</code>. Sequential IDs are never exposed in public endpoints.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Mailbox Inspector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Simulated Test Mailbox ({mockEmails.length} Outbox Records)
            </h3>
          </div>
          <button
            onClick={refreshMailbox}
            disabled={loadingMailbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingMailbox ? 'animate-spin' : ''}`} />
            Refresh Outbox
          </button>
        </div>

        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Subject</th>
                <th className="py-2.5 px-4">Provider</th>
                <th className="py-2.5 px-4">Message ID</th>
                <th className="py-2.5 px-4">Sent At</th>
                <th className="py-2.5 px-4 text-right">Inspect Email</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {mockEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Outbox is empty. Dispatch a campaign or test send to inspect simulated delivery.
                  </td>
                </tr>
              ) : (
                mockEmails.slice().reverse().map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/75 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{m.to_name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{m.to_email}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-800 font-medium max-w-xs truncate">
                      {m.subject}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500">{m.provider}</td>
                    <td className="py-2.5 px-4 font-mono text-[10px] text-slate-400">{m.message_id}</td>
                    <td className="py-2.5 px-4 text-slate-500">
                      {new Date(m.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedEmail(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inspect Email Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Simulated Dispatched Email</h3>
                <p className="text-xs font-mono text-slate-500">ID: {selectedEmail.message_id}</p>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1 font-mono mb-4">
              <div><strong>To:</strong> {selectedEmail.to_name} &lt;{selectedEmail.to_email}&gt;</div>
              <div><strong>Subject:</strong> {selectedEmail.subject}</div>
              <div><strong>Dispatched:</strong> {new Date(selectedEmail.timestamp).toLocaleString()}</div>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg p-4 bg-white">
              <div 
                className="text-sm text-slate-800"
                dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
              />
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
