import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// BUG-07: pages loaded on demand instead of one big initial bundle.
// Login / Register / layout stay static because they are needed immediately.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const PayrollListPage = lazy(() => import('./pages/PayrollListPage'));
const PayrollDetailPage = lazy(() => import('./pages/PayrollDetailPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminCompaniesPage = lazy(() => import('./pages/AdminCompaniesPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminPaymentsPage = lazy(() => import('./pages/AdminPaymentsPage'));

const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
};

// Admins get their own dashboard; everyone else gets the payroll dashboard.
const RoleDashboard = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <AdminDashboardPage /> : <DashboardPage />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

const AppRoutes = () => (
  <Suspense fallback={<LoadingSpinner />}>
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route
        path="/"
        element={<PrivateRoute><DashboardLayout /></PrivateRoute>}
      >
        <Route path="dashboard" element={<RoleDashboard />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="payroll" element={<PayrollListPage />} />
        <Route path="payroll/:id" element={<PayrollDetailPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
        <Route path="admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
        <Route path="admin/accounts" element={<AdminRoute><AdminCompaniesPage /></AdminRoute>} />
        <Route path="admin/payments" element={<AdminRoute><AdminPaymentsPage /></AdminRoute>} />
        <Route path="admin/companies" element={<Navigate to="/admin/accounts" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Suspense>
);

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}