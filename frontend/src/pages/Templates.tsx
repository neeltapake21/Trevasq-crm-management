import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { EmailTemplate, Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  FileText, 
  Plus, 
  Search, 
  Eye, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

export const Templates: React.FC = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    product_id: '' as string | number,
    subject: '',
    html_content: '',
    text_content: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tempRes, prodRes] = await Promise.all([
        api.get<EmailTemplate[]>('/templates'),
        api.get<Product[]>('/products')
      ]);
      setTemplates(tempRes.data);
      setProducts(prodRes.data);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditor = (template?: EmailTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        product_id: template.product_id || '',
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content || '',
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        product_id: '',
        subject: '',
        html_content: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>{{subject}}</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px;">
    <h2 style="color: #0f172a; margin-top: 0;">Quantum Protection for {{company}}</h2>
    <p>Dear {{first_name}},</p>
    <p>We are excited to share new advancements in <strong>{{product_name}}</strong> to safeguard your infrastructure against quantum-era cryptanalytic threats.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="https://trevasq.com" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Learn More About {{product_name}}</a>
    </div>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 11px; color: #64748b; line-height: 1.5;">
      You received this email because you opted in to updates for {{product_name}}.<br />
      <a href="{{unsubscribe_url}}" style="color: #4f46e5;">Unsubscribe from {{product_name}}</a> • 
      <a href="{{global_unsubscribe_url}}" style="color: #64748b;">Unsubscribe from all TrevasQ emails</a>
    </p>
  </div>
</body>
</html>`,
        text_content: 'Hi {{first_name}}, learn about {{product_name}} for {{company}}. Unsubscribe: {{unsubscribe_url}}',
      });
    }
    setShowEditorModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification(null);

    try {
      const payload = {
        name: formData.name,
        product_id: formData.product_id ? parseInt(formData.product_id.toString()) : undefined,
        subject: formData.subject,
        html_content: formData.html_content,
        text_content: formData.text_content || undefined,
      };

      if (editingTemplate) {
        await api.put(`/templates/${editingTemplate.id}`, payload);
        setNotification({ type: 'success', message: `Template "${formData.name}" updated successfully.` });
      } else {
        await api.post('/templates', payload);
        setNotification({ type: 'success', message: `Template "${formData.name}" created successfully.` });
      }

      setShowEditorModal(false);
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save template'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (templateId: number, templateName: string) => {
    if (!window.confirm(`Are you sure you want to delete template "${templateName}"?`)) return;

    try {
      await api.delete(`/templates/${templateId}`);
      setNotification({ type: 'success', message: `Template "${templateName}" deleted.` });
      fetchData();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to delete template'
      });
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.product_name?.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pre-approved responsive HTML templates with dynamic personalization tags and compliant unsubscribe links.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => openEditor()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
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

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates by title, subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No email templates found.</div>
        ) : (
          filteredTemplates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-900 text-base">{t.name}</h3>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 shrink-0">
                    {t.product_name || 'Universal'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 mb-3">
                  <span className="font-semibold text-slate-500">Subject: </span>
                  <span className="italic">"{t.subject}"</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] font-mono text-slate-500 line-clamp-3">
                  {t.html_content}
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {new Date(t.updated_at || t.created_at).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewTemplate(t)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition"
                    title="Live Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  {canManage && (
                    <>
                      <button
                        onClick={() => openEditor(t)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Template Preview: {previewTemplate.name}</h3>
                <p className="text-xs text-slate-500">Subject: {previewTemplate.subject}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div 
                className="text-sm text-slate-800"
                dangerouslySetInnerHTML={{ 
                  __html: previewTemplate.html_content
                    .replace(/\{\{\s*first_name\s*\}\}/g, 'Sarah')
                    .replace(/\{\{\s*company\s*\}\}/g, 'CyberSec Enterprise')
                    .replace(/\{\{\s*product_name\s*\}\}/g, previewTemplate.product_name || 'QGuard')
                    .replace(/\{\{\s*unsubscribe_url\s*\}\}/g, 'http://localhost:5173/unsubscribe/sample-preview-token')
                    .replace(/\{\{\s*global_unsubscribe_url\s*\}\}/g, 'http://localhost:5173/unsubscribe/sample-preview-token?scope=global')
                }}
              />
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {showEditorModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 border border-slate-200 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                {editingTemplate ? 'Edit Template' : 'Create Email Template'}
              </h3>
              <button
                onClick={() => setShowEditorModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Template Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. QGuard Quarterly Security Briefing"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Product Association</label>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Universal (Available for any product)</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Default Subject Line *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quantum Readiness Report for {{company}}"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700">HTML Content *</label>
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600">
                    <Sparkles className="w-3.5 h-3.5" />
                    Tokens: <code>{"{{first_name}}"}</code>, <code>{"{{company}}"}</code>, <code>{"{{unsubscribe_url}}"}</code>
                  </div>
                </div>
                <textarea
                  rows={10}
                  required
                  value={formData.html_content}
                  onChange={(e) => setFormData({ ...formData, html_content: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Plain Text Alternative</label>
                <textarea
                  rows={3}
                  value={formData.text_content}
                  onChange={(e) => setFormData({ ...formData, text_content: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditorModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingTemplate ? 'Save Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
