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

// ✅ NORMALISASI tableCode:
// - kalau sudah "MEJA01" -> MEJA01
// - kalau query "1" -> MEJA01
// - kalau query "12" -> MEJA12
function normalizeTableCode(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';

  // sudah format MEJAxx
  if (/^MEJA\d+$/i.test(raw)) return raw.toUpperCase();

  // angka saja -> MEJAxx (pad 2 digit)
  if (/^\d+$/.test(raw)) return `MEJA${raw.padStart(2, '0')}`;

  // fallback
  return raw.toUpperCase();
}

export default function OrderPage() {
  const params = useParams();
  const location = useLocation();

  // ✅ Ambil tableCode dari:
  // 1) /m/:tableCode
  // 2) ?meja=MEJA01 atau ?meja=1
  const mejaFromQuery = new URLSearchParams(location.search).get('meja') || '';
  const tableCode = normalizeTableCode(params.tableCode || mejaFromQuery);

  const [menu, setMenu] = useState([]);
  const [qrisImage, setQrisImage] = useState(null);

  // (disiapkan kalau nanti mau pakai modal pick lagi)
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
    let mounted = true;
    (async () => {
      try {
        const m = await api.get('/menu');
        if (!mounted) return;
        setMenu(m.data || []);
      } catch (e) {
        console.error('GET /menu failed:', e);
        if (mounted) setMenu([]);
      }

      try {
        const q = await api.get('/qris');
        if (!mounted) return;
        setQrisImage(q.data?.qrisImage || null);
      } catch (e) {
        console.error('GET /qris failed:', e);
        if (mounted) setQrisImage(null);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const total = useMemo(() => {
    return cart.reduce((s, it) => s + (Number(it.product.price) * it.qty), 0);
  }, [cart]);

  // ✅ Tambah ke cart HARUS immutable
  function addToCart(product, qty = 1) {
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

  // ✅ qty update immutable + kalau qty <= 0 hapus item
  function setQty(productId, qty) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((x) => x.product.id !== productId);
      return prev.map((x) =>
        x.product.id === productId ? { ...x, qty } : x
      );
    });
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((x) => x.product.id !== productId));
  }

  async function placeOrder(paymentMethod) {
    if (!tableCode) {
      alert('Scan QR meja dulu ya. Contoh: /m/MEJA01 atau /order?meja=1');
      return;
    }
    if (cart.length === 0) {
      alert('Pesanan masih kosong.');
      return;
    }

    setBusy(true);
    try {
      const items = cart.map((x) => ({ productId: x.product.id, qty: x.qty }));
      await api.post('/orders', { items, paymentMethod, tableCode });

      alert('✅ Order terkirim ke kasir!');
      setCart([]);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Order gagal';
      alert(msg);
      console.error('POST /orders failed:', e);
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

                <button
                  className="btn primary right"
                  onClick={() => addToCart(m, 1)}
                  disabled={busy}
                >
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
          <div className="badge">{cart.reduce((s, it) => s + it.qty, 0)} item</div>
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
                    <button className="btn ghost qtyBtn" onClick={() => setQty(it.product.id, it.qty - 1)} disabled={busy}>-</button>
                    <div style={{ width: 28, textAlign:'center', fontWeight: 900 }}>{it.qty}</div>
                    <button className="btn ghost qtyBtn" onClick={() => setQty(it.product.id, it.qty + 1)} disabled={busy}>+</button>
                    <button className="btn danger" onClick={() => removeItem(it.product.id)} disabled={busy}>Hapus</button>
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
          <button className="btn ghost" onClick={() => setCart([])} disabled={cart.length === 0 || busy}>Reset</button>

          {/* ✅ FIX: tombol Order benar-benar submit order */}
          <button
            className="btn primary"
            disabled={cart.length === 0 || busy}
            onClick={() => {
              const isCash = window.confirm('OK = CASH\nCancel = QRIS');
              placeOrder(isCash ? 'CASH' : 'QRIS');
            }}
          >
            {busy ? 'Mengirim...' : 'Order'}
          </button>
        </div>
      </div>

      {/* Modal masih boleh kamu pakai nanti, tapi sekarang order sudah pasti jalan */}
    </div>
  );
}
