import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveAuth } from '../api';

export default function AdminLogin() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { data } = await api.post('/login', { username, password });
      if (data.role !== 'admin') throw new Error('Bukan akun admin');
      saveAuth(data);
      nav('/admin');
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || 'Login gagal');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: 'span 6' }}>
        <div className="badge">Admin Login</div>
        <div style={{ fontSize: 22, fontWeight: 900, marginTop: 10 }}>Masuk Admin</div>
        <div className="hr" />
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
          <div>
            <div className="label">Username</div>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div>
            <div className="label">Password</div>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err ? <div className="card" style={{ borderColor: '#fee2e2', background: '#fff1f2' }}>{err}</div> : null}
          <button className="btn primary" disabled={loading}>{loading ? 'Loading...' : 'Login'}</button>
        </form>
      </div>
      <div className="card" style={{ gridColumn: 'span 6' }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>Info</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Admin bisa mengelola Menu, Cashflow, Kasir (shift), Upload QRIS, dan Performa Toko + export PDF.
        </div>
      </div>
    </div>
  );
}
