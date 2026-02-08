import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Modal from '../components/Modal.jsx';
import { api } from '../api';

function rupiah(n) {
  const x = Math.round(Number(n || 0));
  return 'Rp ' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ✅ FIX: di production (Railway) pakai same-origin, di local pakai localhost backend
function backendOrigin() {
  return import.meta.env.PROD ? '' : (import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:3001');
}

export default function OrderPage() {
  const params = useParams();
  const tableCode = (params.tableCode || '').toString(); // ambil dari /m/:tableCode

  const [menu, setMenu] = useState([]);
  const [qrisImage, setQrisImage] = useState(null);

  const [pick, setPick] = useState(null); // product
  const [pickQty, setPickQty] = useState(1);

  const [cart, setCart] = useState([]); // {product, qty}

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
    return cart.reduce((s, it) => s + it.product.price * it.qty, 0);
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

  // ✅ FIX UTAMA: tableCode hanya dikirim kalau ada (biar /order ga 400)
  async function placeOrder(paymentMethod) {
    setBusy(true);
    try {
      const items = cart.map((x) => ({ productId: x.product.id, qty: x.qty }));

      const payload = { items, paymentMethod };
      if (tableCode) payload.tableCode = tableCode;

      await api.post('/orders', payload);
    } finally {
      setBusy(false);
    }
  }

  const origin = backendOrigin();

  return (
    <div className="grid">
      <div className="card" style={{ gridColumn: 'span 7' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap'
          }}
        >
          <div>
            <div className="badge">Order (Guest)</div>
            {tableCode ? (
              <div className="badge" style={{ marginLeft: 8 }}>
                Meja: {tableCode}
              </div>
            ) : null}
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Menu</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Klik menu untuk tambah pesanan.
            </div>
          </div>
          <div className="badge">{menu.length} menu</div>
        </div>

        <div className="hr" />
        <div style={{ display: 'grid', gap: 12 }}>
          {menu.length === 0 ? (
            <div className="muted">Belum ada menu. Admin bisa input menu di halaman Admin.</div>
          ) : null}

          {menu.map((m) => (
            <div key={m.id} className="card" style={{ boxShadow: 'none' }}>
              <div className="menuCard">
                <img className="menuImg" src={m.image ? origin + m.image : ''} alt={m.name} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900 }}>{m.name}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {rupiah(m.price)} {m.level ? `• Level: ${m.level}` : ''}
                  </div>
                </div>
                <button
                  className="btn primary right"
                  onClick={() => {
                    setPick(m);
                    setPickQty(1);
                  }}
                >
                  Tambah
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ gridColumn: 'span 5', position: 'sticky', top: 90, alignSelf: 'start' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <div style={{ display: 'grid', gap: 10 }}>
            {cart.map((it) => (
              <div key={it.product.id} className="card" style={{ boxShadow: 'none' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900 }}>{it.product.name}</div>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {rupiah(it.product.price)} • Subtotal: {rupiah(it.product.price * it.qty)}
                    </div>
                  </div>
                  <div className="right qty">
                    <button className="btn ghost qtyBtn" onClick={() => setQty(it.product.id, it.qty - 1)}>
                      -
                    </button>
                    <div style={{ width: 28, textAlign: 'center', fontWeight: 900 }}>{it.qty}</div>
                    <button className="btn ghost qtyBtn" onClick={() => setQty(it.product.id, it.qty + 1)}>
                      +
                    </button>
                    <button className="btn danger" onClick={() => removeItem(it.product.id)}>
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="hr" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
          <div>Total</div>
          <div>{rupiah(total)}</div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn ghost" onClick={() => setCart([])} disabled={cart.length === 0}>
            Reset
          </button>
          <button className="btn primary" onClick={() => setShowInvoice(true)} disabled={cart.length === 0}>
            Order
          </button>
        </div>
      </div>

      {/* Add to cart */}
      <Modal
        open={!!pick}
        title={pick ? `Tambahkan: ${pick.name}` : ''}
        onClose={() => setPick(null)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setPick(null)}>
              Batal
            </button>
            <button
              className="btn primary"
              onClick={() => {
                addToCart(pick, pickQty);
                setPick(null);
              }}
            >
              OK
            </button>
          </>
        }
      >
        {pick ? (
          <div className="twoCol">
            <div>
              <div className="label">Harga</div>
              <div style={{ fontWeight: 900 }}>{rupiah(pick.price)}</div>
            </div>
            <div>
              <div className="label">Quantity</div>
              <div className="qty">
                <button className="btn ghost qtyBtn" onClick={() => setPickQty((q) => Math.max(1, q - 1))}>
                  -
                </button>
                <div style={{ width: 32, textAlign: 'center', fontWeight: 900 }}>{pickQty}</div>
                <button className="btn ghost qtyBtn" onClick={() => setPickQty((q) => q + 1)}>
                  +
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Invoice */}
      <Modal
        open={showInvoice}
        title="Rincian Pesanan"
        onClose={() => setShowInvoice(false)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setShowInvoice(false)}>
              Batal
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setShowInvoice(false);
                setShowPayment(true);
              }}
            >
              OK
            </button>
          </>
        }
      >
        {cart.map((it) => (
          <div key={it.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontWeight: 800 }}>
              {it.product.name} <span className="muted">x{it.qty}</span>
            </div>
            <div style={{ fontWeight: 900 }}>{rupiah(it.product.price * it.qty)}</div>
          </div>
        ))}
        <div className="hr" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
          <div>Total Pembayaran</div>
          <div>{rupiah(total)}</div>
        </div>
      </Modal>

      {/* Payment select */}
      <Modal open={showPayment} title="Pilih Metode Pembayaran" onClose={() => setShowPayment(false)} actions={null}>
        <div className="muted">
          Setelah klik, pesanan akan masuk ke halaman Kasir sebagai <b>New Order</b>.
        </div>
        <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              setShowPayment(false);
              await placeOrder('CASH');
              setShowCashMsg(true);
            }}
          >
            Cash
          </button>
          <button
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              setShowPayment(false);
              setShowQris(true);
            }}
          >
            Qris
          </button>
        </div>
      </Modal>

      {/* Cash message */}
      <Modal
        open={showCashMsg}
        title="Cash"
        onClose={() => {
          setShowCashMsg(false);
        }}
        actions={
          <button
            className="btn primary"
            onClick={() => {
              setShowCashMsg(false);
              setCart([]);
            }}
          >
            OK
          </button>
        }
      >
        <div style={{ fontWeight: 900 }}>Silahkan lakukan pembayaran ke kasir</div>
      </Modal>

      {/* QRIS flow */}
      <Modal
        open={showQris}
        title="QRIS"
        onClose={() => setShowQris(false)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setShowQris(false)}>
              Batal
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={async () => {
                setShowQris(false);
                await placeOrder('QRIS');
                setShowQrisThanks(true);
              }}
            >
              OK
            </button>
          </>
        }
      >
        {!qrisImage ? (
          <div className="muted">QRIS belum diupload oleh Admin.</div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            <img
              src={origin + qrisImage}
              alt="QRIS"
              style={{ width: '100%', maxWidth: 320, borderRadius: 14, border: '1px solid var(--border)' }}
            />
            <a className="btn primary" href={origin + qrisImage} download style={{ textAlign: 'center' }}>
              Download QRIS
            </a>
          </div>
        )}
      </Modal>

      <Modal
        open={showQrisThanks}
        title="Selesai"
        onClose={() => setShowQrisThanks(false)}
        actions={
          <button
            className="btn primary"
            onClick={() => {
              setShowQrisThanks(false);
              setCart([]);
            }}
          >
            OK
          </button>
        }
      >
        <div style={{ fontWeight: 900 }}>Terima kasih atas pesanannya.</div>
        <div className="muted" style={{ marginTop: 6 }}>
          Tunjukkan bukti transfer ketika pesanan di antar.
        </div>
      </Modal>
    </div>
  );
}
