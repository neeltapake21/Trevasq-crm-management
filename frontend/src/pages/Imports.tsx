import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Product, ImportJob } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  ShieldAlert, 
  Users, 
  Download,
  Clock,
  RefreshCw
} from 'lucide-react';

interface PreviewRow {
  row_number: number;
  raw_data: Record<string, any>;
  detected_email?: string;
  is_valid_email: boolean;
  is_duplicate: boolean;
  is_suppressed: boolean;
  validation_errors: string[];
}

interface PreviewData {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  suppressed_rows: number;
  columns_detected: string[];
  sample_rows: PreviewRow[];
}

export const Imports: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Wizard state
  const [step, setStep] = useState(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Column Mapping state
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Settings state
  const [leadSource, setLeadSource] = useState('csv_import');
  const [importConsent, setImportConsent] = useState(false);
  const [consentSource, setConsentSource] = useState('Authorized Enterprise CSV List');
  const [updateExisting, setUpdateExisting] = useState(true);

  // Execution state
  const [executing, setExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);

  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await api.get<ImportJob[]>('/imports');
      setJobs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load import jobs', err);
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const prodRes = await api.get<Product[]>('/products');
        setProducts(prodRes.data);
        if (prodRes.data.length > 0) {
          setSelectedProduct(prodRes.data[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to load products', err);
      }
      fetchJobs();
    };
    init();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadAndPreview = async () => {
    if (!selectedFile) {
      setNotification({ type: 'error', message: 'Please select a CSV file to upload' });
      return;
    }

    setPreviewLoading(true);
    setNotification(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (selectedProduct) {
      formData.append('product_id', selectedProduct);
    }

    try {
      const res = await api.post<PreviewData>('/imports/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setPreviewData(res.data);

      // Guess column mapping
      const mapping: Record<string, string> = {};
      res.data.columns_detected.forEach(col => {
        const lower = col.toLowerCase().trim();
        if (lower.includes('name') || lower === 'full_name' || lower === 'fullname') {
          mapping[col] = 'full_name';
        } else if (lower.includes('email') || lower.includes('e-mail')) {
          mapping[col] = 'email';
        } else if (lower.includes('company') || lower.includes('organization')) {
          mapping[col] = 'company';
        } else if (lower.includes('designation') || lower.includes('title') || lower.includes('role')) {
          mapping[col] = 'designation';
        } else if (lower.includes('phone') || lower.includes('mobile')) {
          mapping[col] = 'phone';
        } else if (lower.includes('country') || lower.includes('region')) {
          mapping[col] = 'country';
        }
      });
      setColumnMapping(mapping);
      setStep(2);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to parse CSV file'
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!selectedFile) return;
    setExecuting(true);
    setNotification(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('column_mapping', JSON.stringify(columnMapping));
    if (selectedProduct) {
      formData.append('product_id', selectedProduct);
    }
    formData.append('lead_source', leadSource);
    formData.append('import_consent', importConsent ? 'true' : 'false');
    formData.append('consent_source', consentSource);
    formData.append('update_existing', updateExisting ? 'true' : 'false');

    try {
      const res = await api.post('/imports/execute', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setExecutionResult(res.data);
      setStep(5);
      fetchJobs();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to complete lead import'
      });
    } finally {
      setExecuting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedFile(null);
    setPreviewData(null);
    setExecutionResult(null);
    setImportConsent(false);
  };

  const downloadSampleCSV = () => {
    const csvContent = 
`Full Name,Email,Company,Designation,Phone,Country,Product
Dr. Alexander Vance,alexander.vance@quantumglobal.io,Quantum Global,VP of Security,+1-555-0101,United States,QGuard
Marcus Brody,marcus.brody@defensegrid.net,Defense Grid Labs,Director of Infrastructure,+1-555-0102,United Kingdom,Quantum Cybersecurity
Elena Rostova,elena.rostova@cipherpeak.com,CipherPeak Security,Chief Architect,+44-20-7946-0958,Germany,Quantum Readiness Assessment
Unsubscribed Contact,alex.turner@globalfin.org,Global Financial Systems,Head of IT Security,+1-555-0188,United States,QGuard
Duplicate Test,neel@example.com,TrevasQ Inquirer,Lead Engineer,,India,QGuard`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sample_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canImport = user?.role === 'admin' || user?.role === 'marketing_manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Lead Imports</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Permission-based batch lead import with persistent suppression protection and duplicate detection.
          </p>
        </div>

        <button
          onClick={downloadSampleCSV}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          Download Sample CSV
        </button>
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

      {/* 5-Step Import Wizard */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        {/* Step Indicator */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[
            { s: 1, label: 'Upload' },
            { s: 2, label: 'Mapping' },
            { s: 3, label: 'Validation' },
            { s: 4, label: 'Consent Rules' },
            { s: 5, label: 'Results' },
          ].map((item) => (
            <div key={item.s} className="text-center">
              <div className={`h-1.5 rounded-full mb-1.5 transition ${
                step >= item.s ? 'bg-indigo-600' : 'bg-slate-200'
              }`} />
              <span className={`text-xs font-semibold ${
                step === item.s ? 'text-indigo-600' : step > item.s ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {item.s}. {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* STEP 1: Upload File */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition">
              <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : 'Select or drop a CSV file with lead data'}
              </p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Supported columns: Full Name, Email, Company, Designation, Phone, Country
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer transition shadow-xs">
                Browse Files
                <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <div className="max-w-md mx-auto">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Associate with Target Product (Optional)
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">General Contacts (No specific product)</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id.toString()}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={!selectedFile || previewLoading}
                onClick={handleUploadAndPreview}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
              >
                {previewLoading ? 'Parsing CSV...' : 'Continue to Column Mapping →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping */}
        {step === 2 && previewData && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Step 2: Map CSV Headers to CRM Fields</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify that your file's header names match TrevasQ contact fields.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {[
                { field: 'full_name', label: 'Full Name *', required: true },
                { field: 'email', label: 'Email Address *', required: true },
                { field: 'company', label: 'Company Name' },
                { field: 'designation', label: 'Designation / Title' },
                { field: 'phone', label: 'Phone Number' },
                { field: 'country', label: 'Country / Region' },
              ].map(({ field, label, required }) => (
                <div key={field} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg">
                  <div>
                    <span className="text-xs font-medium text-slate-800">{label}</span>
                    {required && <span className="text-[10px] text-indigo-600 ml-1 font-bold">Required</span>}
                  </div>
                  <select
                    value={Object.keys(columnMapping).find(k => columnMapping[k] === field) || ''}
                    onChange={(e) => {
                      const newMapping = { ...columnMapping };
                      // Clear previous key for this field
                      Object.keys(newMapping).forEach(k => {
                        if (newMapping[k] === field) delete newMapping[k];
                      });
                      if (e.target.value) {
                        newMapping[e.target.value] = field;
                      }
                      setColumnMapping(newMapping);
                    }}
                    className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
                  >
                    <option value="">-- Ignore Field --</option>
                    {previewData.columns_detected.map(col => (
                      <option key={col} value={col}>"{col}"</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Verify & Preview Rows →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Validation & Preview */}
        {step === 3 && previewData && (
          <div className="space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Step 3: Pre-Import Audit & Suppression Check</h3>
                <p className="text-xs text-slate-500">
                  Pre-flight check across existing contacts and central suppression records.
                </p>
              </div>

              {/* Suppression persistence alert */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-medium">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Persistent Suppression Protection: Active
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Total Rows</span>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{previewData.total_rows}</p>
              </div>

              <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-100">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase block">Valid Records</span>
                <p className="text-xl font-bold text-emerald-800 mt-0.5">{previewData.valid_rows}</p>
              </div>

              <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-100">
                <span className="text-[10px] font-semibold text-blue-700 uppercase block">Existing Contacts (Update)</span>
                <p className="text-xl font-bold text-blue-800 mt-0.5">{previewData.duplicate_rows}</p>
              </div>

              <div className="bg-rose-50/70 p-3 rounded-lg border border-rose-100">
                <span className="text-[10px] font-semibold text-rose-700 uppercase block">Suppressed / Unsubscribed</span>
                <p className="text-xl font-bold text-rose-800 mt-0.5">{previewData.suppressed_rows}</p>
              </div>
            </div>

            {previewData.suppressed_rows > 0 && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Notice:</strong> {previewData.suppressed_rows} rows contain email addresses that were previously unsubscribed or globally suppressed.
                  In accordance with regulatory invariants, these contacts will be updated in the CRM, but will <strong>NEVER</strong> be subscribed to marketing lists.
                </div>
              </div>
            )}

            {/* Preview Sample Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 text-xs font-semibold text-slate-600">
                Sample Detected Rows ({previewData.sample_rows.length} rows)
              </div>
              <div className="overflow-x-auto max-h-56">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100/60 font-semibold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Audit Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.sample_rows.map((row) => (
                      <tr key={row.row_number} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono">{row.row_number}</td>
                        <td className="py-2 px-3 font-mono font-medium text-slate-900">{row.detected_email || '—'}</td>
                        <td className="py-2 px-3">
                          {row.is_suppressed ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                              Suppressed
                            </span>
                          ) : row.is_duplicate ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                              Existing Contact
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                              New Lead
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500">
                          {row.is_suppressed 
                            ? 'Opt-out will be maintained' 
                            : row.is_duplicate 
                              ? 'Will update contact fields' 
                              : 'Ready for insertion'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Proceed to Consent Settings →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Legal & Consent Settings */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Step 4: Legal Basis & Marketing Consent</h3>
              <p className="text-xs text-slate-500">
                Never automatically subscribe imported contacts unless explicit lawful consent has been established.
              </p>
            </div>

            <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Lead Acquisition Source Tag</label>
                <input
                  type="text"
                  value={leadSource}
                  onChange={(e) => setLeadSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="e.g. Q4 2026 Enterprise Webinar Attendees"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Consent Evidence / Method</label>
                <input
                  type="text"
                  value={consentSource}
                  onChange={(e) => setConsentSource(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="e.g. Explicit Opt-in via Trade Show Registration"
                />
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="import_consent_check"
                    checked={importConsent}
                    onChange={(e) => setImportConsent(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="import_consent_check" className="font-semibold text-slate-800 leading-relaxed cursor-pointer">
                    Contacts in this file have provided verifiable opt-in consent to receive promotional emails.
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pl-5">
                  If left unchecked, contacts are safely stored in the CRM as leads, but will NOT be subscribed to any marketing campaigns.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="update_existing_check"
                  checked={updateExisting}
                  onChange={(e) => setUpdateExisting(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="update_existing_check" className="text-slate-700 cursor-pointer">
                  Update missing details for existing contacts (preserves previous unsubscribe and suppression decisions).
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={executing}
                onClick={handleExecuteImport}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 shadow-xs"
              >
                <Users className="w-4 h-4" />
                {executing ? 'Executing Batch Import...' : 'Execute Lead Import'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Results */}
        {step === 5 && executionResult && (
          <div className="space-y-5 animate-in fade-in text-center py-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-900">Lead Import Completed</h3>
              <p className="text-xs text-slate-500 mt-1">
                Batch processing finished under Job ID #{executionResult.job_id}.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-2xl mx-auto text-left">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Processed</span>
                <p className="text-lg font-bold text-slate-900">{executionResult.total_rows}</p>
              </div>

              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <span className="text-[10px] uppercase font-semibold text-emerald-700">Created</span>
                <p className="text-lg font-bold text-emerald-800">{executionResult.successful_rows}</p>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <span className="text-[10px] uppercase font-semibold text-blue-700">Updated</span>
                <p className="text-lg font-bold text-blue-800">{executionResult.updated_rows}</p>
              </div>

              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                <span className="text-[10px] uppercase font-semibold text-rose-700">Suppressed</span>
                <p className="text-lg font-bold text-rose-800">{executionResult.suppressed_rows}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Failed</span>
                <p className="text-lg font-bold text-slate-900">{executionResult.failed_rows}</p>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={resetWizard}
                className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Past Import Jobs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Import History & Audit Log</h3>
            <p className="text-xs text-slate-500">All batch import operations recorded with timestamps and metrics.</p>
          </div>
          <button
            onClick={fetchJobs}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Job ID</th>
                <th className="py-3 px-4">File Name</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Total Rows</th>
                <th className="py-3 px-4">New Created</th>
                <th className="py-3 px-4">Updated</th>
                <th className="py-3 px-4">Suppressed Protected</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingJobs ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading import history...</td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No lead import jobs recorded yet.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/75 transition text-xs">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">#{job.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800">{job.file_name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{job.total_rows}</td>
                    <td className="py-3 px-4 text-emerald-700 font-semibold">{job.successful_rows}</td>
                    <td className="py-3 px-4 text-blue-700 font-semibold">{job.updated_rows}</td>
                    <td className="py-3 px-4 text-rose-700 font-semibold">{job.suppressed_rows}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(job.created_at).toLocaleString()}
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
