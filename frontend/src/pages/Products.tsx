import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Package, 
  Users, 
  UserMinus, 
  Plus, 
  ExternalLink, 
  Layers, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Search,
  ArrowRight
} from 'lucide-react';

export const Products: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get<Product[]>('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotification(null);

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, {
          name: formData.name,
          description: formData.description,
          status: formData.status
        });
        setNotification({ type: 'success', message: `Product "${formData.name}" updated successfully.` });
      } else {
        await api.post('/products', formData);
        setNotification({ type: 'success', message: `Product "${formData.name}" created with an independent mailing list.` });
      }
      setShowAddModal(false);
      setEditingProduct(null);
      setFormData({ name: '', slug: '', description: '', status: 'active' });
      fetchProducts();
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Failed to save product'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      status: p.status,
    });
    setShowAddModal(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const canManage = user?.role === 'admin' || user?.role === 'marketing_manager';

  const totalActiveSubscribers = products.reduce((acc, p) => acc + (p.active_subscribers || 0), 0);
  const totalUnsubscribers = products.reduce((acc, p) => acc + (p.unsubscribed_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products & Segments</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            TrevasQ multi-product portfolio. Each product maintains its own independent subscriber list and campaign rules.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setFormData({ name: '', slug: '', description: '', status: 'active' });
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </button>
        )}
      </div>

      {notification && (
        <div className={`p-4 rounded-lg flex items-start gap-3 border ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm flex-1">{notification.message}</div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">×</button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Products</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Package className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{products.length}</p>
          <span className="text-xs text-slate-500 mt-1 block">Active quantum & security offerings</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscribers</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Users className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{totalActiveSubscribers}</p>
          <span className="text-xs text-emerald-600 mt-1 block">Across all product mailing lists</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Product Unsubscribes</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-lg"><UserMinus className="w-4 h-4" /></span>
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{totalUnsubscribers}</p>
          <span className="text-xs text-slate-500 mt-1 block">Preserved per-product opt-out status</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name, slug, or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">No products found matching criteria.</div>
        ) : (
          filteredProducts.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition flex flex-col justify-between">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-base">{p.name}</h3>
                    <span className="text-xs font-mono text-slate-500">/{p.slug}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    p.status === 'active' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 mt-2 min-h-[32px]">
                  {p.description || 'Enterprise quantum technology and cybersecurity offering.'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total</span>
                    <span className="text-sm font-bold text-slate-800">{p.total_contacts || 0}</span>
                  </div>
                  <div className="bg-emerald-50/60 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-emerald-600 block">Subscribers</span>
                    <span className="text-sm font-bold text-emerald-700">{p.active_subscribers || 0}</span>
                  </div>
                  <div className="bg-rose-50/60 p-2 rounded-lg">
                    <span className="text-[10px] uppercase font-semibold text-rose-600 block">Opt-Out</span>
                    <span className="text-sm font-bold text-rose-700">{p.unsubscribed_count || 0}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50/80 rounded-b-xl border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  to={`/inquiry?product=${p.slug}`}
                  target="_blank"
                  className="text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Public Lead Form
                </Link>

                <div className="flex items-center gap-2">
                  {canManage && (
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-200/60 rounded-md transition"
                      title="Edit Product"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Link
                    to={`/products/${p.id}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition"
                  >
                    Manage List <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: !editingProduct ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : formData.slug
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Quantum Entropy Generator"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Product Slug</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProduct}
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-100"
                  placeholder="e.g. quantum-entropy-generator"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Used in public inquiry URLs and unsubscribe endpoints.</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe target market, product capabilities, and enterprise use cases..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">Active (Available for campaigns and inquiries)</option>
                  <option value="inactive">Inactive (Archived)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingProduct ? 'Save Changes' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
