import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { api } from '../api';

function rupiah(n) {
  const x = Math.round(Number(n || 0));
  return 'Rp ' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// PROD (Railway) pakai same-origin, DEV pakai localhost backend
function backendOrigin() {
  return import.meta.env.PROD ? '' : (import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:3001');
}

export default function OrderPage() {
  const params = useParams();
  const location = useLocation();

  // ✅ Ambil tableCode dari:
  // 1) /m/:tableCode  (kalau kamu pakai)
  // 2) /order?meja=1  (ini yang dipakai QR Print kamu)
  const mejaFromQuery = new URLSearchParams(location.search).get('meja') || '';
  const tableCode = ((params.tableCode || mejaFromQuery) || '').toString();

  const [menu, setMenu] = useState([]);
  const [qrisImage, setQrisImage] = useState(null);

  const [pick, setPick] = useState(null);
  const [pickQty, setPickQty] = useState(1);
  const [cart, setCart] = useState([]);

  const [showInvoice, setShowInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showCashMsg, setShowCashMsg] = useState(false);
  const [showQris, setShowQris] = useState(false);
  const [showQrisThanks, setShowQrisThanks] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await api.get('/menu');
      setMenu(m.data || []);
      const q = await api.get('/qris');
      setQrisImage(q.data?.qrisImage || null);
    })();
  }, []);

  const total = useMemo(() => {
    return cart.reduce((s, it) => s + (it.product.price * it.qty), 0);
  }, [cart]);

  function addToCart(product, qty) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: copy[idx].qty + qty };
        return copy;
      }
      return [...prev, { product, qty }];
    });
  }

  function setQty(productId, qty) {
    setCart((prev) =>
      prev.map((x) => (x.product.id === productId ? { ...x, qty: Math.max(1, qty) } : x))
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((x) => x.product.id !== productId));
  }

  async function placeOrder(paymentMethod) {
    // ✅ Biar gak “diam aja” kalau tableCode kosong
    if (!tableCode) {
      alert('Scan QR meja dulu ya (contoh link: /order?meja=1)');
      return;
    }

    setBusy(true);
    try {
      const items = cart.map((x) => ({ productId: x.product.id, qty: x.qty }));
      await api.post('/orders', { items, paymentMethod, tableCode });
    } finally {
      setBusy(false);
    }
  }

  const origin = backendOrigin();

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: 'span 7' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div>
            <div className="badge">Order (Guest)</div>
            {tableCode ? <div className="badge" style={{ marginLeft: 8 }}>Meja: {tableCode}</div> : null}
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Menu</div>
            <div className="muted" style={{ marginTop: 4 }}>Klik menu untuk tambah pesanan.</div>
          </div>
          <div className="badge">{menu.length} menu</div>
        </div>

        <div className="hr" />
        <div style={{ display:'grid', gap:12 }}>
          {menu.length === 0 ? (
            <div className="muted">Belum ada menu. Admin bisa input menu di halaman Admin.</div>
          ) : null}

          {menu.map((m) => (
            <div key={m.id} className="card" style={{ boxShadow:'none' }}>
              <div className="menuCard">
                <img
                  className="menuImg"
                  src={m.image ? origin + m.image : ''}
                  alt={m.name}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{m.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {rupiah(m.price)} {m.level ? `• Level: ${m.level}` : ''}
                  </div>
                </div>
                <button className="btn primary right" onClick={() => { setPick(m); setPickQty(1); }}>
                  Tambah
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 5', position:'sticky', top: 90, alignSelf:'start' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="badge">Pesanan Saya</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Ringkasan</div>
          </div>
          <div className="badge">{cart.length} item</div>
        </div>

        <div className="hr" />

        {cart.length === 0 ? (
          <div className="muted">Belum ada pesanan.</div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {cart.map((it) => (
              <div key={it.product.id} className="card" style={{ boxShadow:'none' }}>
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight: 900 }}>{it.product.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {rupiah(it.product.price)} • Subtotal: {rupiah(it.product.price * it.qty)}
                    </div>
                  </div>
                  <div className="right qty">
                    <button className="btn ghost qtyBtn" onClick={() => setQty(it.product.id, it.qty - 1)}>-</button>
                    <div style={{ width: 28, textAlign:'center', fontWeight: 900 }}>{it.qty}</div>
                    <button className="btn ghost qtyBtn" onClick={() => setQty(it.product.id, it.qty + 1)}>+</button>
                    <button className="btn danger" onClick={() => removeItem(it.product.id)}>Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="hr" />
        <div style={{ display:'flex', justifyContent:'space-between', fontWeight: 900 }}>
          <div>Total</div>
          <div>{rupiah(total)}</div>
        </div>

        <div style={{ marginTop: 12, display:'flex', gap:10, flexWrap:'wrap' }}>
          <button className="btn ghost" onClick={() => setCart([])} disabled={cart.length === 0}>Reset</button>
          <button className="btn primary" onClick={() => setShowInvoice(true)} disabled={cart.length === 0}>Order</button>
        </div>
      </div>

      {/* (Modal lainnya biarin seperti punyamu, gak perlu gue ulangin) */}
      {/* Pastikan di tempat QRIS juga pakai origin + qrisImage seperti sebelumnya */}
    </div>
  );
}
