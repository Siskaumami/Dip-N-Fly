import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clearAuth, loadAuth } from '../api';

export default function Topbar() {
  const loc = useLocation();
  const nav = useNavigate();
  const auth = loadAuth();

  const isAdmin = loc.pathname.startsWith('/admin');
  const isKasir = loc.pathname.startsWith('/kasir');
  const isCustomer = loc.pathname.startsWith('/m/'); // QR customer route

  return (
    <div className="topbar">
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent:'space-between' }}>
        <div className="brand">
          <div className="logo">DNF</div>
          <div>
            <div className="h1">Dip N Fly Online</div>
          </div>
        </div>

        <div style={{ display:'flex', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
          <Link className="btn ghost" to="/order">Order</Link>

          {/* Customer via QR: sembunyikan Admin & Kasir */}
          {!isCustomer ? (
            <>
              <Link className="btn ghost" to="/login/kasir">Kasir</Link>
              <Link className="btn ghost" to="/login/admin">Admin</Link>
            </>
          ) : null}

          {(isAdmin || isKasir) && auth.token ? (
            <button
              className="btn primary"
              onClick={() => {
                clearAuth();
                localStorage.removeItem('dnf_shiftId');
                localStorage.removeItem('dnf_cashierName');
                nav('/order');
              }}
            >
              Logout
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
