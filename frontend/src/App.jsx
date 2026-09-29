import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import PayrollListPage from './pages/PayrollListPage';
import PayrollDetailPage from './pages/PayrollDetailPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SettingsPage from './pages/SettingsPage';
import AdminCompaniesPage from './pages/AdminCompaniesPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminPaymentsPage from './pages/AdminPaymentsPage';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    );
  }
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
);

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
