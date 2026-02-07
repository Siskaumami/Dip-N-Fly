import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Topbar from './components/Topbar.jsx';
import OrderPage from './pages/OrderPage.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import KasirLogin from './pages/KasirLogin.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import KasirDashboard from './pages/KasirDashboard.jsx';
import { loadAuth } from './api';

function RequireRole({ role, children }) {
  const auth = loadAuth();
  if (!auth.token) return <Navigate to={role === 'admin' ? '/login/admin' : '/login/kasir'} replace />;
  if (auth.role !== role && auth.role !== 'admin') return <Navigate to="/order" replace />;
  return children;
}

export default function App() {
  useEffect(() => { loadAuth(); }, []);

  return (
    <>
      <Topbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/order" replace />} />

          {/* Guest order */}
          <Route path="/order" element={<OrderPage />} />

          {/* Customer via QR meja */}
          <Route path="/m/:tableCode" element={<OrderPage />} />

          {/* Login */}
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/kasir" element={<KasirLogin />} />

          {/* Dashboards */}
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminDashboard />
              </RequireRole>
            }
          />
          <Route
            path="/kasir"
            element={
              <RequireRole role="kasir">
                <KasirDashboard />
              </RequireRole>
            }
          />

          <Route path="*" element={<div className="card">Halaman tidak ditemukan.</div>} />
        </Routes>
      </div>
    </>
  );
}
