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
  EyeOff,
  RefreshCw, 
  Server, 
  Key, 
  Send,
  Trash2,
  Lock,
  Sparkles,
  HelpCircle
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [emailProvider, setEmailProvider] = useState('smtp');
  const [emailTestMode, setEmailTestMode] = useState(false);
  const [fromAddress, setFromAddress] = useState('marketing@trevasq.com');
  const [fromName, setFromName] = useState('TrevasQ Quantum Security');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUsername, setSmtpUsername] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpUseTls, setSmtpUseTls] = useState(true);
  const [sendgridApiKey, setSendgridApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Live Test Email State
  const [testRecipient, setTestRecipient] = useState('neeltapake21@gmail.com');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; provider?: string } | null>(null);

  // Mailbox State
  const [mockEmails, setMockEmails] = useState<MockEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<MockEmail | null>(null);
  const [loadingMailbox, setLoadingMailbox] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [setRes, mailRes] = await Promise.all([
        api.get('/settings'),
        api.get('/settings/sent-mailbox')
      ]);
      const data = setRes.data;
      setEmailProvider(data.email_provider || 'smtp');
      setEmailTestMode(data.email_test_mode ?? false);
      setFromAddress(data.email_from_address || 'marketing@trevasq.com');
      setFromName(data.email_from_name || 'TrevasQ Quantum Security');
      setSmtpHost(data.smtp_host || 'smtp.gmail.com');
      setSmtpPort(data.smtp_port || 587);
      setSmtpUsername(data.smtp_username || '');
      setSmtpPassword(data.smtp_password || '');
      setSmtpUseTls(data.smtp_use_tls ?? true);
      setSendgridApiKey(data.sendgrid_api_key || '');
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

  const clearMailbox = async () => {
    if (!window.confirm('Clear all simulated outbox records?')) return;
    try {
      await api.delete('/settings/sent-mailbox');
      setMockEmails([]);
      setNotification({ type: 'success', message: 'Test mailbox cleared.' });
    } catch (err: any) {
      setNotification({ type: 'error', message: 'Failed to clear mailbox.' });
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
      const payload: any = {
        email_provider: emailProvider,
        email_test_mode: emailTestMode,
        email_from_address: fromAddress,
        email_from_name: fromName,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: smtpUsername,
        smtp_use_tls: smtpUseTls,
      };
      if (smtpPassword && !smtpPassword.includes('•')) {
        payload.smtp_password = smtpPassword;
      }
      if (sendgridApiKey && !sendgridApiKey.includes('•')) {
        payload.sendgrid_api_key = sendgridApiKey;
      }

      await api.post('/settings', payload);
      setNotification({
        type: 'success',
        message: 'System settings saved to database dynamically! Next email dispatches will use these live credentials.'
      });
      fetchSettings();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to update settings (Admin privileges required)'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendLiveTestEmail = async () => {
    if (!testRecipient) {
      setTestResult({ success: false, message: 'Please enter a recipient email address' });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      const overrideConfig: any = {
        email_provider: emailProvider,
        email_test_mode: emailTestMode,
        email_from_address: fromAddress,
        email_from_name: fromName,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_username: smtpUsername,
        smtp_use_tls: smtpUseTls,
      };
      if (smtpPassword && !smtpPassword.includes('•')) {
        overrideConfig.smtp_password = smtpPassword;
      }
      if (sendgridApiKey && !sendgridApiKey.includes('•')) {
        overrideConfig.sendgrid_api_key = sendgridApiKey;
      }

      const res = await api.post('/settings/test-email', {
        to_email: testRecipient,
        subject: `TrevasQ Delivery Test to ${testRecipient}`,
        override_config: overrideConfig
      });

      if (res.data.success) {
        setTestResult({
          success: true,
          message: res.data.message,
          provider: res.data.provider
        });
        refreshMailbox();
      } else {
        setTestResult({
          success: false,
          message: res.data.error_message || res.data.message || 'Delivery failed',
          provider: res.data.provider
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.detail || 'Error connecting to email adapter'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  const applyGmailPreset = () => {
    setEmailProvider('smtp');
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(587);
    setSmtpUseTls(true);
    if (!fromAddress || fromAddress === 'marketing@trevasq.com') {
      setFromAddress('yourname@gmail.com');
    }
    setNotification({
      type: 'success',
      message: 'Gmail preset loaded! Enter your Gmail address and 16-character Google App Password below.'
    });
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email & Platform Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Dynamic, zero-restart configuration for real-world ESP delivery (Gmail SMTP, SendGrid, Mailgun) or safe simulation.
          </p>
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

      {/* Instant Live Test Email Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-5 text-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              <h2 className="text-base font-bold">Instant Live Email Dispatcher</h2>
            </div>
            <p className="text-xs text-indigo-200 mt-1 max-w-xl">
              Send a test message immediately to verify deliverability. If <strong>Safe Test Mode</strong> is ON, it saves to the Outbox below. If <strong>Safe Test Mode</strong> is OFF and SMTP credentials are provided, it delivers directly to the real recipient's Gmail inbox!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="e.g. neeltapake21@gmail.com"
              className="px-3 py-2 text-xs text-slate-900 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 w-full sm:w-64 font-mono"
            />
            <button
              type="button"
              disabled={testingEmail}
              onClick={handleSendLiveTestEmail}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-950 bg-indigo-300 hover:bg-indigo-200 rounded-lg transition disabled:opacity-50 shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              {testingEmail ? 'Sending...' : 'Send Live Test'}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mt-4 p-3 rounded-lg text-xs flex items-start gap-2 border ${
            testResult.success 
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
              : 'bg-rose-500/20 border-rose-400/40 text-rose-200'
          }`}>
            {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />}
            <div>
              <span className="font-semibold">{testResult.success ? 'Success: ' : 'Failed: '}</span>
              {testResult.message}
              {testResult.provider === 'mock_test_mode' && (
                <span className="block text-[11px] text-indigo-300 mt-0.5">
                  Notice: Safe Test Mode is currently enabled. Email was captured in the Simulated Outbox below. To send to the real inbox, switch Delivery Mode to "Live Delivery" and save settings.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Grid: Dynamic Provider Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic Provider Settings */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Dynamic Email Adapter</h2>
            </div>
            <button
              type="button"
              onClick={applyGmailPreset}
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition"
            >
              + Use Gmail Preset
            </button>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Delivery Mode Toggle */}
            <div className={`p-4 rounded-xl border transition ${
              emailTestMode 
                ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' 
                : 'bg-amber-50/60 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider">Delivery Mode</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                  emailTestMode ? 'bg-indigo-200 text-indigo-900' : 'bg-amber-200 text-amber-900'
                }`}>
                  {emailTestMode ? 'Safe Simulation' : 'Live Real Delivery'}
                </span>
              </div>
              <div className="flex items-start gap-2 pt-1">
                <input
                  type="checkbox"
                  id="dynamic_test_mode"
                  disabled={!isAdmin}
                  checked={emailTestMode}
                  onChange={(e) => setEmailTestMode(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="dynamic_test_mode" className="text-xs font-medium cursor-pointer leading-relaxed">
                  {emailTestMode 
                    ? 'Safe Test Mode is ACTIVE: All emails are simulated and logged to the Outbox below. Zero risk of unsolicited emails.' 
                    : 'LIVE DELIVERY ACTIVE: Emails will be dispatched through your configured SMTP or SendGrid server to REAL external inboxes!'}
                </label>
              </div>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Active Provider Engine
              </label>
              <select
                disabled={!isAdmin}
                value={emailProvider}
                onChange={(e) => setEmailProvider(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 font-medium"
              >
                <option value="test">Safe Test Mode (Simulated Mock)</option>
                <option value="smtp">Standard SMTP (Gmail, Outlook, Amazon SES SMTP, Custom)</option>
                <option value="sendgrid">SendGrid Web API</option>
              </select>
            </div>

            {/* Sender Identity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sender Email Address *</label>
                <input
                  type="email"
                  required
                  disabled={!isAdmin}
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                  placeholder="e.g. yourname@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sender Display Name *</label>
                <input
                  type="text"
                  required
                  disabled={!isAdmin}
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  placeholder="TrevasQ Quantum Security"
                />
              </div>
            </div>

            {/* SMTP Specific Config */}
            {emailProvider === 'smtp' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-600" />
                    SMTP Server Credentials
                  </h3>
                  <span className="text-[10px] text-slate-500">e.g. Gmail: smtp.gmail.com:587</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Host</label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Port</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        disabled={!isAdmin}
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                        placeholder="587"
                      />
                      <button
                        type="button"
                        onClick={() => { setSmtpPort(587); setSmtpUseTls(true); }}
                        className={`text-[10px] px-1.5 py-1 rounded border font-mono transition ${
                          smtpPort === 587 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Port 587 (STARTTLS)"
                      >
                        587
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSmtpPort(465); setSmtpUseTls(false); }}
                        className={`text-[10px] px-1.5 py-1 rounded border font-mono transition ${
                          smtpPort === 465 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                        title="Port 465 (Direct SSL)"
                      >
                        465
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
                  <strong>💡 Gmail / Google Workspace Note:</strong> Google accounts require a <strong>16-character App Password</strong> (e.g. <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">abcd efgh ijkl mnop</code>), not your standard login password. You can generate one at <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="underline font-semibold text-blue-700 hover:text-blue-900">myaccount.google.com/apppasswords</a>.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Username / Email</label>
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={smtpUsername}
                      onChange={(e) => setSmtpUsername(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                      placeholder="yourname@gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Password / App Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        disabled={!isAdmin}
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                        className="w-full pl-2.5 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                        placeholder="16-character Google App Password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="smtp_tls"
                    disabled={!isAdmin}
                    checked={smtpUseTls}
                    onChange={(e) => setSmtpUseTls(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="smtp_tls" className="text-xs text-slate-700 cursor-pointer">
                    Enable STARTTLS Encryption (Recommended for port 587)
                  </label>
                </div>
              </div>
            )}

            {/* SendGrid Config */}
            {emailProvider === 'sendgrid' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600" />
                  SendGrid API Key
                </h3>

                <div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      disabled={!isAdmin}
                      value={sendgridApiKey}
                      onChange={(e) => setSendgridApiKey(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-white"
                      placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Verify that your sender email ({fromAddress}) is an authenticated sender in SendGrid.
                  </span>
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {!isAdmin && 'Only Admins can modify provider credentials.'}
              </span>
              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 shadow-xs"
                >
                  {saving ? 'Saving to Database...' : 'Save Dynamic Configuration'}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* How It Works & Help Guide */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HelpCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-semibold text-slate-900">How to Deliver to Real Gmail Inboxes</h2>
          </div>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">1. Generate a Google App Password (Free)</h3>
              <p>
                Standard Gmail accounts require an <strong>App Password</strong> rather than your standard account password:
              </p>
              <ol className="list-decimal list-inside mt-1.5 space-y-0.5 text-[11px] text-slate-700">
                <li>Go to <strong>myaccount.google.com/security</strong></li>
                <li>Ensure <strong>2-Step Verification</strong> is ON</li>
                <li>Under 2-Step Verification, select <strong>App passwords</strong></li>
                <li>Create one named "TrevasQ Platform" and copy the 16-letter code</li>
              </ol>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-900 mb-1">2. Fill Out the Form</h3>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-700">
                <li>Click <strong>+ Use Gmail Preset</strong> above</li>
                <li>Uncheck <strong>Safe Test Mode</strong> (Switch to Live Real Delivery)</li>
                <li>Enter your Gmail in <strong>Username</strong> and <strong>Sender Email</strong></li>
                <li>Paste the 16-character code in <strong>App Password</strong></li>
                <li>Click <strong>Save Dynamic Configuration</strong></li>
              </ul>
            </div>

            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-900">
              <h3 className="font-bold mb-1">3. Zero Restart Required!</h3>
              <p className="text-[11px]">
                The platform immediately uses your live credentials from the database for all campaign dispatches and test sends.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Outbox Inspector */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-slate-900 text-sm">
              Simulated Test Mailbox ({mockEmails.length} Outbox Records)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && mockEmails.length > 0 && (
              <button
                onClick={clearMailbox}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Outbox
              </button>
            )}
            <button
              onClick={refreshMailbox}
              disabled={loadingMailbox}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingMailbox ? 'animate-spin' : ''}`} />
              Refresh Outbox
            </button>
          </div>
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
