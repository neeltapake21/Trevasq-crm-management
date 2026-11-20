import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Contacts } from './pages/Contacts';
import { ContactDetail } from './pages/ContactDetail';
import { Inquiries } from './pages/Inquiries';
import { Products } from './pages/Products';
import { ProductDetail } from './pages/ProductDetail';
import { MailingLists } from './pages/MailingLists';
import { Campaigns } from './pages/Campaigns';
import { CampaignWizard } from './pages/CampaignWizard';
import { CampaignDetail } from './pages/CampaignDetail';
import { Templates } from './pages/Templates';
import { Imports } from './pages/Imports';
import { Analytics } from './pages/Analytics';
import { ActivityLogs } from './pages/ActivityLogs';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { PublicInquiry } from './pages/PublicInquiry';
import { PublicUnsubscribe } from './pages/PublicUnsubscribe';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Initializing TrevasQ Platform...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Endpoints */}
          <Route path="/login" element={<Login />} />
          <Route path="/inquiry" element={<PublicInquiry />} />
          <Route path="/unsubscribe/:token" element={<PublicUnsubscribe />} />
          <Route path="/unsubscribe" element={<PublicUnsubscribe />} />

          {/* Authenticated Dashboard & Management Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="contacts/:id" element={<ContactDetail />} />
            <Route path="inquiries" element={<Inquiries />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="mailing-lists" element={<MailingLists />} />
            <Route path="campaigns" element={<Campaigns />} />
            <Route path="campaigns/new" element={<CampaignWizard />} />
            <Route path="campaigns/:id" element={<CampaignDetail />} />
            <Route path="templates" element={<Templates />} />
            <Route path="imports" element={<Imports />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="activity" element={<ActivityLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<Users />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
