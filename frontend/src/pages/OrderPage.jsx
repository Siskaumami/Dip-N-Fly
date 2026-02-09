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

  if (/^MEJA\d+$/i.test(raw)) return raw.toUpperCase();
  if (/^\d+$/.test(raw)) return `MEJA${raw.padStart(2, '0')}`;

  return raw.toUpperCase();
}

// bantu: resolve image (qris/menu) biar bisa path atau full url atau data:
function resolveImageSrc(origin, maybeSrc) {
  const s = String(maybeSrc || '').trim();
  if (!s) return '';
  if (s.startsWith('data:')) return s;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  // path seperti /uploads/xxx.jpg atau uploads/xxx.jpg
  if (s.startsWith('/')) return origin + s;
  return origin + '/' + s;
}

export default function OrderPage() {
  const params = useParams();
  const location = useLocation();

  const mejaFromQuery = new URLSearchParams(location.search).get('meja') || '';
  const tableCode = normalizeTableCode(params.tableCode || mejaFromQuery);

  const [menu, setMenu] = useState([]);
  const [qrisImage, setQrisImage] = useState(null);

  const [cart, setCart] = useState([]);

  // ✅ Modal flow (3 langkah)
  const [showInvoice, setShowInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showQris, setShowQris] = useState(false);

  // ✅ Pesan sukses
  const [showCashMsg, setShowCashMsg] = useState(false);
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

  const totalItems = useMemo(() => {
    return cart.reduce((s, it) => s + it.qty, 0);
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

  function closeAllModals() {
    setShowInvoice(false);
    setShowPayment(false);
    setShowQris(false);
    setShowCashMsg(false);
    setShowQrisThanks(false);
  }

  async function placeOrder(paymentMethod) {
    if (!tableCode) {
      alert('Scan QR meja dulu ya. Contoh: /m/MEJA01 atau /order?meja=1');
      return false;
    }
    if (cart.length === 0) {
      alert('Pesanan masih kosong.');
      return false;
    }

    setBusy(true);
    try {
      const items = cart.map((x) => ({ productId: x.product.id, qty: x.qty }));
      await api.post('/orders', { items, paymentMethod, tableCode });

      setCart([]);
      return true;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Order gagal';
      alert(msg);
      console.error('POST /orders failed:', e);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const origin = backendOrigin();

  // helper: buka flow invoice (validasi meja)
  function startOrderFlow() {
    if (!tableCode) {
      alert('Scan QR meja dulu ya. Contoh: /m/MEJA01 atau /order?meja=1');
      return;
    }
    setShowInvoice(true);
  }

  return (
    <div className="grid">
      {/* ======= KIRI: MENU ======= */}
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
                  src={resolveImageSrc(origin, m.image)}
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

      {/* ======= KANAN: CART ======= */}
      <div className="card" style={{ gridColumn: 'span 5', position:'sticky', top: 90, alignSelf:'start' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div className="badge">Pesanan Saya</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Ringkasan</div>
          </div>
          <div className="badge">{totalItems} item</div>
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

          {/* ✅ Flow lengkap: invoice -> payment -> (qris) -> submit */}
          <button
            className="btn primary"
            disabled={cart.length === 0 || busy}
            onClick={startOrderFlow}
          >
            {busy ? 'Mengirim...' : 'Order'}
          </button>
        </div>
      </div>

      {/* ===================== MODAL 1: INVOICE ===================== */}
      <Modal
        open={showInvoice}
        isOpen={showInvoice}
        onClose={() => setShowInvoice(false)}
        onRequestClose={() => setShowInvoice(false)}
      >
        <div style={{ minWidth: 320, maxWidth: 560 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
            <div>
              <div className="badge">Invoice</div>
              <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Ringkasan Pesanan</div>
              {tableCode ? <div className="muted" style={{ marginTop: 4 }}>Meja: <b>{tableCode}</b></div> : null}
            </div>
            <div className="badge">{totalItems} item</div>
          </div>

          <div className="hr" />

          {cart.length === 0 ? (
            <div className="muted">Pesanan masih kosong.</div>
          ) : (
            <div style={{ display:'grid', gap:10 }}>
              {cart.map((it) => (
                <div key={it.product.id} className="card" style={{ boxShadow:'none' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900 }}>{it.product.name}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {it.qty} × {rupiah(it.product.price)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 900 }}>{rupiah(it.product.price * it.qty)}</div>
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

          <div style={{ marginTop: 14, display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
            <button className="btn ghost" onClick={() => setShowInvoice(false)} disabled={busy}>Kembali</button>
            <button
              className="btn primary"
              disabled={cart.length === 0 || busy}
              onClick={() => {
                setShowInvoice(false);
                setShowPayment(true);
              }}
            >
              Lanjut Pembayaran
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL 2: PILIH PEMBAYARAN ===================== */}
      <Modal
        open={showPayment}
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onRequestClose={() => setShowPayment(false)}
      >
        <div style={{ minWidth: 320, maxWidth: 520 }}>
          <div className="badge">Pembayaran</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Pilih Metode</div>
          <div className="muted" style={{ marginTop: 4 }}>Total: <b>{rupiah(total)}</b></div>

          <div className="hr" />

          <div style={{ display:'grid', gap:10 }}>
            <button
              className="btn primary"
              disabled={busy || cart.length === 0}
              onClick={async () => {
                const ok = await placeOrder('CASH');
                if (ok) {
                  setShowPayment(false);
                  setShowCashMsg(true);
                }
              }}
            >
              {busy ? 'Mengirim...' : 'Bayar Cash'}
            </button>

            <button
              className="btn ghost"
              disabled={busy || cart.length === 0}
              onClick={() => {
                setShowPayment(false);
                setShowQris(true);
              }}
            >
              Lanjut QRIS
            </button>
          </div>

          <div style={{ marginTop: 14, display:'flex', justifyContent:'flex-end' }}>
            <button className="btn ghost" onClick={() => { setShowPayment(false); setShowInvoice(true); }} disabled={busy}>
              Kembali
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== MODAL 3: QRIS ===================== */}
      <Modal
        open={showQris}
        isOpen={showQris}
        onClose={() => setShowQris(false)}
        onRequestClose={() => setShowQris(false)}
      >
        <div style={{ minWidth: 320, maxWidth: 520 }}>
          <div className="badge">QRIS</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Scan untuk bayar</div>
          <div className="muted" style={{ marginTop: 4 }}>Total: <b>{rupiah(total)}</b></div>

          <div className="hr" />

          {qrisImage ? (
            <div style={{ display:'flex', justifyContent:'center' }}>
              <img
                src={resolveImageSrc(origin, qrisImage)}
                alt="QRIS"
                style={{ width: 260, height: 260, objectFit:'contain', borderRadius: 12, background:'#fff' }}
              />
            </div>
          ) : (
            <div className="muted">
              QRIS belum di-set. Admin bisa upload QRIS di halaman Admin.
            </div>
          )}

          <div style={{ marginTop: 14, display:'flex', gap:10, justifyContent:'flex-end', flexWrap:'wrap' }}>
            <button
              className="btn ghost"
              onClick={() => { setShowQris(false); setShowPayment(true); }}
              disabled={busy}
            >
              Kembali
            </button>

            <button
              className="btn primary"
              disabled={busy || cart.length === 0}
              onClick={async () => {
                const ok = await placeOrder('QRIS');
                if (ok) {
                  setShowQris(false);
                  setShowQrisThanks(true);
                }
              }}
            >
              {busy ? 'Mengirim...' : 'Saya sudah bayar, kirim pesanan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== SUKSES CASH ===================== */}
      <Modal
        open={showCashMsg}
        isOpen={showCashMsg}
        onClose={() => setShowCashMsg(false)}
        onRequestClose={() => setShowCashMsg(false)}
      >
        <div style={{ minWidth: 320, maxWidth: 520 }}>
          <div className="badge">Berhasil</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Pesanan terkirim!</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Silakan bayar <b>CASH</b> ke kasir ya.
          </div>

          <div className="hr" />

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn primary" onClick={() => setShowCashMsg(false)}>
              Oke
            </button>
          </div>
        </div>
      </Modal>

      {/* ===================== SUKSES QRIS ===================== */}
      <Modal
        open={showQrisThanks}
        isOpen={showQrisThanks}
        onClose={() => setShowQrisThanks(false)}
        onRequestClose={() => setShowQrisThanks(false)}
      >
        <div style={{ minWidth: 320, maxWidth: 520 }}>
          <div className="badge">Terima kasih</div>
          <div style={{ fontSize: 20, fontWeight: 900, marginTop: 6 }}>Pesanan terkirim!</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Pembayaran <b>QRIS</b> diproses. Pesanan kamu akan disiapkan.
          </div>

          <div className="hr" />

          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button className="btn primary" onClick={() => setShowQrisThanks(false)}>
              Oke
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
