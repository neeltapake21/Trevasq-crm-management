import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../api/client';
import { Product, EmailTemplate } from '../types';
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Users, 
  UserMinus, 
  Mail, 
  Calendar, 
  Play, 
  FileText,
  Eye,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';

interface AudienceCheck {
  product_id: number;
  product_name: string;
  total_contacts: number;
  eligible_count: number;
  excluded_count: number;
  exclusion_reasons: {
    unsubscribed: number;
    globally_suppressed: number;
    no_consent: number;
    already_sent: number;
  };
  sample_recipients: {
    contact_id: number;
    full_name: string;
    email: string;
    company: string;
  }[];
}

export const CampaignWizard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedProduct = searchParams.get('product');

  const [currentStep, setCurrentStep] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    product_id: preselectedProduct ? parseInt(preselectedProduct) : 0,
    subject: '',
    html_content: '',
    text_content: '',
    send_type: 'immediate' as 'immediate' | 'scheduled',
    scheduled_at: '',
  });

  const [audienceCheck, setAudienceCheck] = useState<AudienceCheck | null>(null);
  const [audienceLoading, setAudienceLoading] = useState(false);

  // Test email state
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);

  // Created campaign ID when moving through steps
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [prodRes, tempRes] = await Promise.all([
          api.get<Product[]>('/products'),
          api.get<EmailTemplate[]>('/templates')
        ]);
        setProducts(prodRes.data);
        setTemplates(tempRes.data);

        if (!formData.product_id && prodRes.data.length > 0) {
          setFormData(prev => ({ ...prev, product_id: prodRes.data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load initial wizard data', err);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch audience eligibility check when product changes
  const runAudienceCheck = async (productId: number, campaignId?: number) => {
    if (!productId) return;
    setAudienceLoading(true);
    try {
      // If we don't have a campaign yet, we can check subscriber audience directly via products/:id/subscribers
      // Or if campaign created, call campaigns/:id/audience-check
      if (campaignId) {
        const res = await api.get<AudienceCheck>(`/campaigns/${campaignId}/audience-check`);
        setAudienceCheck(res.data);
      } else {
        const res = await api.get(`/products/${productId}/subscribers?status=subscribed`);
        const subscribers = res.data.subscribers || [];
        const eligible = subscribers.filter((s: any) => !s.is_globally_suppressed);
        const suppressed = subscribers.filter((s: any) => s.is_globally_suppressed);

        setAudienceCheck({
          product_id: productId,
          product_name: res.data.product_name,
          total_contacts: subscribers.length,
          eligible_count: eligible.length,
          excluded_count: suppressed.length,
          exclusion_reasons: {
            unsubscribed: 0,
            globally_suppressed: suppressed.length,
            no_consent: 0,
            already_sent: 0
          },
          sample_recipients: eligible.slice(0, 5).map((s: any) => ({
            contact_id: s.contact_id,
            full_name: s.full_name,
            email: s.email,
            company: s.company || 'N/A'
          }))
        });
      }
    } catch (err) {
      console.error('Audience check failed', err);
    } finally {
      setAudienceLoading(false);
    }
  };

  useEffect(() => {
    if (formData.product_id) {
      runAudienceCheck(formData.product_id, createdCampaignId || undefined);
    }
  }, [formData.product_id, createdCampaignId]);

  const handleSelectTemplate = (templateId: number) => {
    const t = templates.find(item => item.id === templateId);
    if (t) {
      setFormData(prev => ({
        ...prev,
        subject: t.subject,
        html_content: t.html_content,
        text_content: t.text_content || ''
      }));
    }
  };

  // Helper to advance steps
  const handleNext = async () => {
    setNotification(null);

    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setNotification({ type: 'error', message: 'Please enter a campaign name' });
        return;
      }
      if (!formData.product_id) {
        setNotification({ type: 'error', message: 'Please select a target product' });
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      // Step 2 is audience verification
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!formData.subject.trim()) {
        setNotification({ type: 'error', message: 'Please enter a campaign subject line' });
        return;
      }
      if (!formData.html_content.trim()) {
        setNotification({ type: 'error', message: 'Please provide email HTML content' });
        return;
      }

      // Save/create draft campaign so we can preview and test send
      setLoading(true);
      try {
        if (!createdCampaignId) {
          const res = await api.post('/campaigns', {
            name: formData.name,
            product_id: formData.product_id,
            subject: formData.subject,
            html_content: formData.html_content,
            text_content: formData.text_content || undefined
          });
          setCreatedCampaignId(res.data.id);
        } else {
          await api.put(`/campaigns/${createdCampaignId}`, {
            name: formData.name,
            subject: formData.subject,
            html_content: formData.html_content,
            text_content: formData.text_content || undefined
          });
        }
        setCurrentStep(4);
      } catch (err: any) {
        setNotification({ type: 'error', message: err.response?.data?.detail || 'Failed to save draft campaign' });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (currentStep === 4) {
      setCurrentStep(5);
      return;
    }

    if (currentStep === 5) {
      setCurrentStep(6);
      return;
    }
  };

  const handleSendTestEmail = async () => {
    if (!createdCampaignId) return;
    setTestSending(true);
    setTestSentSuccess(false);
    setNotification(null);

    try {
      const res = await api.post(`/campaigns/${createdCampaignId}/test-send`, null, {
        params: { test_email: testEmail || undefined }
      });
      setTestSentSuccess(true);
      setNotification({
        type: 'success',
        message: `${res.data.message}. Inspect simulated delivery in Settings > Test Mailbox or real inbox.`
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to send test email'
      });
    } finally {
      setTestSending(false);
    }
  };

  const handleFinalLaunch = async () => {
    if (!createdCampaignId) return;
    setLoading(true);
    setNotification(null);

    try {
      if (formData.send_type === 'immediate') {
        await api.post(`/campaigns/${createdCampaignId}/execute`);
        navigate(`/campaigns/${createdCampaignId}`);
      } else {
        if (!formData.scheduled_at) {
          setNotification({ type: 'error', message: 'Please select a future date and time for scheduled launch' });
          setLoading(false);
          return;
        }
        await api.post(`/campaigns/${createdCampaignId}/schedule`, null, {
          params: { schedule_time: new Date(formData.scheduled_at).toISOString() }
        });
        navigate(`/campaigns/${createdCampaignId}`);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to launch/schedule campaign'
      });
      setLoading(false);
    }
  };

  // Render dummy personalized text for Step 4 Preview
  const selectedProductObj = products.find(p => p.id === formData.product_id);
  const samplePerson = audienceCheck?.sample_recipients?.[0] || {
    contact_id: 1,
    full_name: 'Dr. Jane Vance',
    email: 'jane.vance@quantumglobal.io',
    company: 'Quantum Global Labs'
  };

  const previewSubject = formData.subject
    .replace(/\{\{\s*first_name\s*\}\}/g, samplePerson.full_name.split(' ')[0])
    .replace(/\{\{\s*name\s*\}\}/g, samplePerson.full_name)
    .replace(/\{\{\s*company\s*\}\}/g, samplePerson.company)
    .replace(/\{\{\s*product_name\s*\}\}/g, selectedProductObj?.name || 'TrevasQ Solution');

  const previewHtml = formData.html_content
    .replace(/\{\{\s*first_name\s*\}\}/g, samplePerson.full_name.split(' ')[0])
    .replace(/\{\{\s*name\s*\}\}/g, samplePerson.full_name)
    .replace(/\{\{\s*company\s*\}\}/g, samplePerson.company)
    .replace(/\{\{\s*product_name\s*\}\}/g, selectedProductObj?.name || 'TrevasQ Solution')
    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, 'http://localhost:5173/unsubscribe/sample-token-preview')
    .replace(/\{\{\s*global_unsubscribe_url\s*\}\}/g, 'http://localhost:5173/unsubscribe/sample-token-preview?scope=global');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div>
        <Link to="/campaigns" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-2">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Campaigns
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create Marketing Campaign</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Step-by-step campaign builder with automated audience eligibility verification and personalization preview.
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

      {/* Stepper Progress Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-6 gap-2">
          {[
            { step: 1, title: 'Details' },
            { step: 2, title: 'Audience' },
            { step: 3, title: 'Content' },
            { step: 4, title: 'Preview' },
            { step: 5, title: 'Test Send' },
            { step: 6, title: 'Launch' },
          ].map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div key={s.step} className="text-center">
                <div className={`h-1.5 rounded-full mb-2 transition-all ${
                  isCompleted ? 'bg-indigo-600' : isCurrent ? 'bg-indigo-600' : 'bg-slate-200'
                }`} />
                <span className={`text-xs font-medium block truncate ${
                  isCurrent ? 'text-indigo-600 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                }`}>
                  {s.step}. {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Steps */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        {/* STEP 1: Details */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Step 1: Campaign Details</h2>
              <p className="text-xs text-slate-500">Provide an internal campaign title and select the target product offering.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. QGuard Enterprise Launch Announcement"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Target Product *</label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.active_subscribers} active subscribers)
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Only contacts with explicit marketing consent for this specific product will be eligible for delivery.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Audience Check */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Step 2: Audience Eligibility Verification</h2>
              <p className="text-xs text-slate-500">Automated multi-factor audit guaranteeing strict GDPR/CAN-SPAM consent adherence.</p>
            </div>

            {audienceLoading ? (
              <div className="py-12 text-center text-slate-500 text-sm">Evaluating recipient eligibility...</div>
            ) : audienceCheck ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100">
                    <span className="text-xs font-semibold text-emerald-800 uppercase block">Eligible Recipients</span>
                    <p className="text-3xl font-bold text-emerald-700 mt-1">{audienceCheck.eligible_count}</p>
                    <span className="text-xs text-emerald-600 mt-1 block">Active consent verified</span>
                  </div>

                  <div className="bg-rose-50/70 p-4 rounded-xl border border-rose-100">
                    <span className="text-xs font-semibold text-rose-800 uppercase block">Excluded / Suppressed</span>
                    <p className="text-3xl font-bold text-rose-700 mt-1">{audienceCheck.excluded_count}</p>
                    <span className="text-xs text-rose-600 mt-1 block">Protected from delivery</span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-xs font-semibold text-slate-600 uppercase block">Total Product Leads</span>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{audienceCheck.total_contacts}</p>
                    <span className="text-xs text-slate-500 mt-1 block">In CRM for this product</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Sample Eligible Recipients</h3>
                  {audienceCheck.sample_recipients.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No eligible recipients currently match this product's criteria.</p>
                  ) : (
                    <div className="divide-y divide-slate-200/60 text-xs">
                      {audienceCheck.sample_recipients.map((r) => (
                        <div key={r.contact_id} className="py-2 flex items-center justify-between">
                          <span className="font-medium text-slate-900">{r.full_name}</span>
                          <span className="text-slate-500 font-mono">{r.email}</span>
                          <span className="text-slate-600">{r.company}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* STEP 3: Content / Template Selection */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Step 3: Email Content & Template</h2>
                <p className="text-xs text-slate-500">Pick a pre-designed responsive template or craft custom personalized copy.</p>
              </div>
              {templates.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">Load Template:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) handleSelectTemplate(parseInt(e.target.value));
                    }}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Choose template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Next-Gen Quantum Protection for {{company}}"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">HTML Body *</label>
                  <span className="text-[11px] text-indigo-600">
                    Variables: <code>{"{{first_name}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{unsubscribe_url}}"}</code>
                  </span>
                </div>
                <textarea
                  rows={8}
                  required
                  placeholder="Enter responsive HTML markup..."
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plain Text Alternative (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Fallback plain text version..."
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Personalization Preview */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Step 4: Live Personalization Preview</h2>
                <p className="text-xs text-slate-500">Rendered with sample recipient: <strong>{samplePerson.full_name} ({samplePerson.email})</strong></p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-indigo-50 text-indigo-700">
                <Sparkles className="w-3.5 h-3.5" /> Dynamic Tokens Injected
              </span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1.5 font-mono">
              <div><strong>Subject:</strong> <span className="text-indigo-600 font-sans">{previewSubject}</span></div>
              <div><strong>To:</strong> {samplePerson.full_name} &lt;{samplePerson.email}&gt;</div>
              <div><strong>From:</strong> TrevasQ Marketing &lt;marketing@trevasq.com&gt;</div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner">
              <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 text-xs font-medium text-slate-600">
                Email Client Render Preview
              </div>
              <div 
                className="p-6 overflow-auto max-h-[350px] text-slate-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        )}

        {/* STEP 5: Test Send */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Step 5: Send Safe Test Email</h2>
              <p className="text-xs text-slate-500">
                Verify rendering in real or simulated inboxes without touching live recipients.
              </p>
            </div>

            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-5 space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900">Send Test Email to You or Your Team</h3>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Test sends use simulated tokens and bypass subscriber campaign count deduplication.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email address (default: current user)"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={testSending}
                  onClick={handleSendTestEmail}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 shrink-0 inline-flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {testSending ? 'Sending Test...' : 'Send Test Email'}
                </button>
              </div>

              {testSentSuccess && (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Test email dispatched! You can also view it in the Test Mailbox under Settings.
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 6: Review & Launch */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Step 6: Review & Launch</h2>
              <p className="text-xs text-slate-500">Confirm campaign parameters and choose immediate send or scheduled dispatch.</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Campaign Name:</span>
                <span className="font-semibold text-slate-900">{formData.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Product:</span>
                <span className="font-semibold text-slate-900">{selectedProductObj?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Verified Eligible Recipients:</span>
                <span className="font-bold text-emerald-600">{audienceCheck?.eligible_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Excluded Contacts (Unsub/Suppressed):</span>
                <span className="text-slate-600">{audienceCheck?.excluded_count || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 text-xs">Subject:</span>
                <span className="text-slate-900">{formData.subject}</span>
              </div>
            </div>

            {/* Dispatch Mode Selector */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                Dispatch Schedule
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, send_type: 'immediate' })}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                    formData.send_type === 'immediate'
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Play className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Send Immediately</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Launch delivery right now to all eligible subscribers.</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, send_type: 'scheduled' })}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                    formData.send_type === 'scheduled'
                      ? 'border-indigo-600 bg-indigo-50/40 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm">Schedule for Later</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Queue campaign for automated background execution.</p>
                  </div>
                </button>
              </div>

              {formData.send_type === 'scheduled' && (
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pick Execution Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-100">
          <button
            type="button"
            disabled={currentStep === 1 || loading}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-40 transition"
          >
            ← Back
          </button>

          {currentStep < 6 ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleFinalLaunch}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-xs disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading 
                ? 'Processing...' 
                : formData.send_type === 'immediate' 
                  ? 'Launch Campaign Now' 
                  : 'Confirm Scheduled Campaign'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
