import React, { useEffect, useMemo, useState } from 'react';
import Modal from '../components/Modal.jsx';
import { api } from '../api';

function rupiah(n) {
  const x = Math.round(Number(n || 0));
  return 'Rp ' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function groupByStatus(orders) {
  const g = { NEW: [], PROCESS: [], DONE: [] };
  for (const o of orders) g[o.status]?.push(o);
  return g;
}

export default function KasirDashboard() {
  const [cashierName, setCashierName] = useState(localStorage.getItem('dnf_cashierName') || '');
  const [shiftId, setShiftId] = useState(localStorage.getItem('dnf_shiftId') || '');
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState({ doneCount: 0, revenue: 0 });

  const [confirm, setConfirm] = useState(null); // {title, text, onOk}
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const { data } = await api.get('/kasir/orders?mode=today');
    setOrders(data.orders || []);
    const s = await api.get('/kasir/summary/today');
    setSummary(s.data || { doneCount: 0, revenue: 0 });
  }

  useEffect(() => {
    if (shiftId) refresh();
    const t = setInterval(() => { if (shiftId) refresh(); }, 5000);
    return () => clearInterval(t);
  }, [shiftId]);

  const grouped = useMemo(() => groupByStatus(orders), [orders]);

  async function doStatus(orderId, status) {
    setLoading(true);
    try {
      await api.patch(`/kasir/orders/${orderId}/status`, { status, cashierName });
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function doDelete(orderId) {
    setLoading(true);
    try {
      await api.delete(`/kasir/orders/${orderId}`);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function loginShift() {
    setLoading(true);
    try {
      const { data } = await api.post('/kasir/shift/login', { cashierName });
      setShiftId(data.id);
      localStorage.setItem('dnf_shiftId', data.id);
      localStorage.setItem('dnf_cashierName', cashierName);
      await refresh();
    } finally {
      setLoading(false);
    }
  }

  async function logoutShift() {
    setLoading(true);
    try {
      await api.post('/kasir/shift/logout', { shiftId });
      localStorage.removeItem('dnf_shiftId');
      setShiftId('');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  if (!shiftId) {
    return (
      <div className="grid">
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <div className="badge">Kasir</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Log In Kasir</div>
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Nama Kasir</b></div>
          <div className="hr" />
          <div style={{ display:'grid', gap:10 }}>
            <div>
              <div className="label">Nama Kasir</div>
              <input
                className="input"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Contoh: Rina"
              />
            </div>
            <button className="btn primary" onClick={loginShift} disabled={!cashierName || loading}>
              {loading ? 'Loading...' : 'Log In'}
            </button>
          </div>
        </div>
        <div className="card" style={{ gridColumn: 'span 6' }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Catatan</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Setelah Log In, order dari halaman Order akan muncul sebagai <b>New Order</b>. Ubah ke <b>Process</b> lalu <b>Done</b>.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display:'grid', gap:16 }}>
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div className="badge">Shift Aktif</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>{cashierName}</div>
            <div className="muted" style={{ marginTop: 4 }}>Order hari ini akan otomatis ter-refresh.</div>
          </div>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <div className="badge">Done: {summary.doneCount}</div>
            <div className="badge">Omzet: {rupiah(summary.revenue)}</div>
            <button className="btn ghost" onClick={refresh} disabled={loading}>Refresh</button>
            <button
              className="btn primary"
              onClick={() => setConfirm({
                title: 'Log Out',
                text: 'Yakin mau Log Out? Shift akan ditutup dan data masuk ke Admin → Kasir.',
                onOk: logoutShift
              })}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="grid">
        <OrdersColumn
          title="New Order"
          badge="NEW"
          orders={grouped.NEW}
          actions={(o, ask) => (
            <>
              <button
                className="btn primary"
                onClick={() => ask('Ubah Status', 'Ubah NEW → PROCESS ?', () => doStatus(o.id, 'PROCESS'))}
                disabled={loading}
              >
                Process
              </button>
              <button
                className="btn danger"
                onClick={() => ask('Hapus Order', 'Hapus order ini?', () => doDelete(o.id))}
                disabled={loading}
              >
                Hapus
              </button>
            </>
          )}
          onAsk={setConfirm}
        />

        <OrdersColumn
          title="Process"
          badge="PROCESS"
          orders={grouped.PROCESS}
          actions={(o, ask) => (
            <button
              className="btn primary"
              onClick={() => ask('Selesaikan', 'Ubah PROCESS → DONE ?', () => doStatus(o.id, 'DONE'))}
              disabled={loading}
            >
              Done
            </button>
          )}
          onAsk={setConfirm}
        />

        <OrdersColumn
          title="Done"
          badge="DONE"
          orders={grouped.DONE}
          actions={() => null}
          onAsk={setConfirm}
        />
      </div>

      <Modal
        open={!!confirm}
        title={confirm?.title || ''}
        onClose={() => setConfirm(null)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setConfirm(null)}>Batal</button>
            <button
              className="btn primary"
              onClick={async () => {
                const fn = confirm.onOk;
                setConfirm(null);
                await fn();
              }}
            >
              OK
            </button>
          </>
        }
      >
        <div style={{ fontWeight: 800 }}>{confirm?.text}</div>
      </Modal>
    </div>
  );
}

function OrdersColumn({ title, badge, orders, actions, onAsk }) {
  function ask(t, text, onOk) {
    onAsk({ title: t, text, onOk });
  }

  return (
    <div className="card" style={{ gridColumn: 'span 4' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
        <div className="badge">{orders.length}</div>
      </div>

      <div className="hr" />

      {orders.length === 0 ? <div className="muted">Kosong.</div> : null}

      <div style={{ display:'grid', gap:10 }}>
        {orders.map((o) => (
          <div key={o.id} className="card" style={{ boxShadow:'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
              <div style={{ minWidth:0 }}>
                <div style={{ fontWeight: 900 }}>
                  #{o.code} <span className="badge">{badge}</span>
                </div>

                {/* ✅ FIX: tampilkan nomor meja */}
                <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                  Meja: <b>{o.tableCode ? o.tableCode : '-'}</b> • Metode: {o.paymentMethod} • Total: {rupiah(o.total)}
                </div>
              </div>
            </div>

            <div className="hr" />

            <div style={{ display:'grid', gap:6 }}>
              {(o.items || []).map((it) => (
                <div key={it.id} style={{ display:'flex', justifyContent:'space-between' }}>
                  <div style={{ fontWeight: 800 }}>
                    {it.name} <span className="muted">x{it.qty}</span>
                  </div>
                  <div className="muted">{rupiah(it.price * it.qty)}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, display:'flex', gap:10, flexWrap:'wrap', justifyContent:'flex-end' }}>
              {actions(o, ask)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
