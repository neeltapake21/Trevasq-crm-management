import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Inbox,
  ShieldCheck,
  ListFilter,
  Send,
  FileText,
  UploadCloud,
  BarChart3,
  Activity,
  Settings,
  UserCheck,
  LogOut,
  ChevronDown,
  ExternalLink,
  ShieldAlert,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Menu,
  X
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Contacts', path: '/contacts', icon: Users },
    { name: 'Leads & Inquiries', path: '/inquiries', icon: Inbox },
    { name: 'Products', path: '/products', icon: ShieldCheck },
    { name: 'Mailing Lists', path: '/mailing-lists', icon: ListFilter },
    { name: 'Campaigns', path: '/campaigns', icon: Send },
    { name: 'Email Templates', path: '/templates', icon: FileText },
    { name: 'Imports', path: '/imports', icon: UploadCloud },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Activity Logs', path: '/activity', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'User Management', path: '/users', icon: UserCheck });
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 bg-white select-none">
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              Q
            </div>
            <div>
              <span className="font-semibold text-slate-900 tracking-tight text-base">TrevasQ</span>
              <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Marketing Hub</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            MVP v1.0
          </span>
        </div>

        {/* Navigation items */}
        <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: exactActive }) =>
                  `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                    exactActive || isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </div>

        {/* Role switcher & Simulation status */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {/* Safe Mode Badge */}
          <div className="px-3 py-2 rounded-lg bg-emerald-50/80 border border-emerald-200/60 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] leading-tight">
              <span className="font-semibold text-emerald-900">Safe Test Mailer</span>
              <p className="text-emerald-700 text-[10px] mt-0.5">Dispatched to local test mailbox</p>
            </div>
          </div>

          {/* User & Role card */}
          <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 uppercase">
                  {user?.role?.replace('_', ' ') || 'admin'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Role Switcher for Assessment Evaluators */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1.5">Switch Persona:</p>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <button
                  onClick={() => switchDemoRole('admin')}
                  className={`py-1 px-1 text-center rounded border font-medium ${
                    user?.role === 'admin'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => switchDemoRole('marketing_manager')}
                  className={`py-1 px-1 text-center rounded border font-medium ${
                    user?.role === 'marketing_manager'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Manager
                </button>
                <button
                  onClick={() => switchDemoRole('analyst')}
                  className={`py-1 px-1 text-center rounded border font-medium ${
                    user?.role === 'analyst'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Analyst
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
              <span className="font-medium text-slate-900">TrevasQ Platform</span>
              <span>/</span>
              <span className="capitalize">{location.pathname.split('/')[1] || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Quick Public Inquiry Button (Live demo trigger) */}
            <a
              href="/inquiry"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Public Lead Form
            </a>

            {/* Link to Unsubscribe demo token */}
            <NavLink
              to="/campaigns"
              className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Launch Campaign
            </NavLink>
          </div>
        </header>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-200 p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-100"
                >
                  <Icon className="w-4 h-4 mr-3 text-slate-400" />
                  {item.name}
                </NavLink>
              );
            })}
          </div>
        )}

        {/* Page Content Outlet */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
