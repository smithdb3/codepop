import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { ProtectedRoute } from './auth/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { NotAuthorized } from './pages/NotAuthorized.jsx';
import { AdminDashboard } from './pages/admin/AdminDashboard.jsx';
import { ManagerDashboard } from './pages/manager/ManagerDashboard.jsx';
import { SuperAdminDashboard } from './pages/super-admin/SuperAdminDashboard.jsx';
import { RepairDashboard } from './pages/repair-staff/RepairDashboard.jsx';
import { LogisticsDashboard } from './pages/logistics/LogisticsDashboard.jsx';
import './styles/global.css';

function RootRedirect() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const redirects = {
    super_admin: '/super-admin',
    admin: '/admin',
    manager: '/manager',
    repair_staff: '/repair',
    logistics_manager: '/logistics',
  };

  const path = redirects[role] || '/login';
  return <Navigate to={path} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<NotAuthorized />} />

      {/* Super Admin */}
      <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
        <Route path="/super-admin" element={<SuperAdminDashboard />} />
      </Route>

      {/* Admin */}
      <Route
        element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}
      >
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      {/* Manager */}
      <Route element={<ProtectedRoute allowedRoles={['manager']} />}>
        <Route path="/manager" element={<ManagerDashboard />} />
      </Route>

      {/* Repair Staff */}
      <Route element={<ProtectedRoute allowedRoles={['repair_staff']} />}>
        <Route path="/repair" element={<RepairDashboard />} />
      </Route>

      {/* Logistics */}
      <Route
        element={<ProtectedRoute allowedRoles={['logistics_manager']} />}
      >
        <Route path="/logistics" element={<LogisticsDashboard />} />
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
