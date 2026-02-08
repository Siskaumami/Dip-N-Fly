import React, { useEffect, useMemo, useState } from 'react';
import { api, loadAuth } from '../api';
import Modal from '../components/Modal.jsx';
import Tabs from '../components/Tabs.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import PrintQRCodes from "../components/PrintQRCodes.jsx";

function rupiah(n) {
  const x = Math.round(Number(n || 0));
  return 'Rp ' + x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function backendOrigin() {
  return import.meta.env.PROD
    ? '' // production: same origin (https://dip-n-fly-production...)
    : (import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:3001'); // local
}

async function downloadPdf(endpoint, filename) {
  const { token } = loadAuth();
  const url = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + endpoint;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error('Gagal download PDF');
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadFileWithToken(endpoint, filename) {
  const { token } = loadAuth();
  const url = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + endpoint;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!resp.ok) throw new Error('Gagal download file');
  const blob = await resp.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('menu');

  // Menu
  const [products, setProducts] = useState([]);
  const [productModal, setProductModal] = useState(false);
  const [pForm, setPForm] = useState({ name: '', level: '', hpp: '', price: '', image: null });
  const [busy, setBusy] = useState(false);

  // Cashflow
  const [cashflow, setCashflow] = useState(null);
  const [cashModal, setCashModal] = useState(false);
  const [cashRange, setCashRange] = useState({ mode: 'today', start: '', end: '' });

  // Shifts
  const [shiftsData, setShiftsData] = useState(null);
  const [shiftModal, setShiftModal] = useState(false);
  const [shiftRange, setShiftRange] = useState({ mode: 'today', start: '', end: '' });

  // QRIS
  const [qris, setQris] = useState(null);
  const [qrisFile, setQrisFile] = useState(null);

  // Performance
  const [perf, setPerf] = useState(null);
  const [perfModal, setPerfModal] = useState(false);
  const [perfRange, setPerfRange] = useState({ mode: 'today', start: '', end: '', cashier: '' });

  // QR Meja
  const [tables, setTables] = useState([]);

  useEffect(() => {
    refreshProducts();
    refreshCashflow({ mode: 'today' });
    refreshShifts({ mode: 'today' });
    refreshQris();
    refreshPerf({ mode: 'today', cashier: '' });
    refreshTables();
  }, []);

  async function refreshProducts() {
    const { data } = await api.get('/admin/products');
    setProducts(data || []);
  }

  async function createProduct() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', pForm.name);
      fd.append('level', pForm.level || '');
      fd.append('hpp', pForm.hpp || 0);
      fd.append('price', pForm.price || 0);
      if (pForm.image) fd.append('image', pForm.image);
      await api.post('/admin/products', fd);
      setProductModal(false);
      setPForm({ name: '', level: '', hpp: '', price: '', image: null });
      await refreshProducts();
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(id) {
    setBusy(true);
    try {
      await api.delete(`/admin/products/${id}`);
      await refreshProducts();
    } finally {
      setBusy(false);
    }
  }

  async function refreshCashflow(range) {
    const q =
      range.mode === 'today'
        ? 'mode=today'
        : `start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end || range.start)}`;
    const { data } = await api.get(`/admin/cashflow?${q}`);
    setCashflow(data);
  }

  async function refreshShifts(range) {
    const q =
      range.mode === 'today'
        ? 'mode=today'
        : `start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end || range.start)}`;
    const { data } = await api.get(`/admin/shifts?${q}`);
    setShiftsData(data);
  }

  async function refreshQris() {
    const { data } = await api.get('/admin/qris');
    setQris(data);
  }

  async function uploadQris() {
    if (!qrisFile) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('qris', qrisFile);
      await api.post('/admin/qris', fd);
      setQrisFile(null);
      await refreshQris();
    } finally {
      setBusy(false);
    }
  }

  async function refreshPerf(range) {
    const qBase =
      range.mode === 'today'
        ? 'mode=today'
        : `start=${encodeURIComponent(range.start)}&end=${encodeURIComponent(range.end || range.start)}`;
    const qCashier = range.cashier ? `&cashier=${encodeURIComponent(range.cashier)}` : '';
    const { data } = await api.get(`/admin/performance?${qBase}${qCashier}`);
    setPerf(data);
  }

  async function refreshTables() {
    try {
      const { data } = await api.get('/admin/tables');
      setTables(data || []);
    } catch {
      setTables([]);
    }
  }

  const cashiers = useMemo(() => {
    const fromShifts = (shiftsData?.shifts || []).map((s) => s.cashierName);
    const fromPerf = perf?.cashiers || [];
    return Array.from(new Set([...fromShifts, ...fromPerf])).filter(Boolean);
  }, [shiftsData, perf]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
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
            <div className="badge">Admin</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8 }}>Dashboard</div>
            <div className="muted" style={{ marginTop: 4 }}>
              Menu • Cashflow • Kasir • QRIS • Performa Toko • QR Meja
            </div>
          </div>
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'menu', label: 'Menu' },
              { value: 'cashflow', label: 'Cashflow' },
              { value: 'kasir', label: 'Kasir' },
              { value: 'qris', label: 'Qris' },
              { value: 'performa', label: 'Performa Toko' },
              { value:'qr', label:'QR Print' },
            ]}
          />
        </div>
      </div>

      {tab === 'qr' ? (
  <PrintQRCodes />
) : null}
{tab === 'menu' ? (
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 8' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>Ringkasan Menu</div>
              <button className="btn primary" onClick={() => setProductModal(true)}>
                Input Menu
              </button>
            </div>
            <div className="hr" />
            {products.length === 0 ? <div className="muted">Belum ada menu.</div> : null}
            <table className="table">
              <thead>
                <tr>
                  <th>Menu</th>
                  <th>Harga</th>
                  <th>HPP</th>
                  <th style={{ width: 120 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <img className="menuImg" src={p.image ? backendOrigin() + p.image : ''} alt={p.name} />
                        <div>
                          <div style={{ fontWeight: 900 }}>{p.name}</div>
                          <div className="muted" style={{ fontSize: 12 }}>
                            {p.level ? `Level: ${p.level}` : 'Level: -'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 900 }}>{rupiah(p.price)}</td>
                    <td className="muted">{rupiah(p.hpp)}</td>
                    <td>
                      <button className="btn danger" onClick={() => deleteProduct(p.id)} disabled={busy}>
                        Hapus
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card" style={{ gridColumn: 'span 4' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Catatan</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Saat menu ditambahkan, otomatis muncul di <b>Kasir</b> (rincian order) dan <b>Order</b> (tanpa HPP).
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'cashflow' ? (
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 8' }}>
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
                <div style={{ fontWeight: 900, fontSize: 18 }}>Cashflow</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn ghost" onClick={() => setCashModal(true)}>
                  Pilih Range
                </button>
                <button
                  className="btn primary"
                  onClick={async () => {
                    const r = cashRange.mode === 'today' ? { mode: 'today' } : cashRange;
                    const q =
                      r.mode === 'today'
                        ? '?mode=today'
                        : `?start=${encodeURIComponent(r.start)}&end=${encodeURIComponent(r.end || r.start)}`;
                    await downloadPdf(`/admin/cashflow/pdf${q}`, 'cashflow.pdf');
                  }}
                  disabled={!cashflow}
                >
                  Export PDF
                </button>
              </div>
            </div>
            <div className="hr" />
            {!cashflow ? (
              <div className="muted">Loading...</div>
            ) : (
              <>
                <div className="row">
                  <div className="card" style={{ boxShadow: 'none', flex: 1 }}>
                    <div className="muted">Revenue</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{rupiah(cashflow.summary.revenue)}</div>
                  </div>
                  <div className="card" style={{ boxShadow: 'none', flex: 1 }}>
                    <div className="muted">HPP (COGS)</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{rupiah(cashflow.summary.cogs)}</div>
                  </div>
                  <div className="card" style={{ boxShadow: 'none', flex: 1 }}>
                    <div className="muted">Profit</div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{rupiah(cashflow.summary.profit)}</div>
                  </div>
                </div>

                <div className="hr" />
                <div className="row">
                  <div className="card" style={{ boxShadow: 'none', flex: 1 }}>
                    <div className="muted">Cash</div>
                    <div style={{ fontWeight: 900 }}>{rupiah(cashflow.summary.cash)}</div>
                  </div>
                  <div className="card" style={{ boxShadow: 'none', flex: 1 }}>
                    <div className="muted">QRIS</div>
                    <div style={{ fontWeight: 900 }}>{rupiah(cashflow.summary.qris)}</div>
                  </div>
                  <div className="card" style={{ boxShadow: 'none', flex: 1 }}>
                    <div className="muted">Orders (DONE)</div>
                    <div style={{ fontWeight: 900 }}>{cashflow.summary.ordersDone}</div>
                  </div>
                </div>

                <div className="hr" />
                <div style={{ fontWeight: 900 }}>List Nama Kasir (Shift pada range)</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {cashflow.cashiers.length ? cashflow.cashiers.join(', ') : 'Tidak ada shift'}
                </div>
              </>
            )}
          </div>

          <div className="card" style={{ gridColumn: 'span 4' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Range Aktif</div>
            <div className="muted" style={{ marginTop: 6 }}>{cashflow ? `${cashflow.range.start} s/d ${cashflow.range.end}` : '-'}</div>
            <div className="hr" />
            <div style={{ fontWeight: 900 }}>Cara pakai</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Klik <b>Pilih Range</b> untuk hari ini (mulai 00.00 WIB) atau custom tanggal.
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'kasir' ? (
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 8' }}>
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
                <div style={{ fontWeight: 900, fontSize: 18 }}>Rangkuman Kasir</div>
              </div>
              <button className="btn ghost" onClick={() => setShiftModal(true)}>
                Custom Range
              </button>
            </div>
            <div className="hr" />
            {!shiftsData ? (
              <div className="muted">Loading...</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nama Kasir</th>
                    <th>Log In</th>
                    <th>Log Out</th>
                    <th>Pesanan (handled)</th>
                  </tr>
                </thead>
                <tbody>
                  {(shiftsData.shifts || []).map((s) => (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 900 }}>{s.cashierName}</td>
                      <td className="muted">{s.startAt}</td>
                      <td className="muted">{s.endAt || '-'}</td>
                      <td style={{ fontWeight: 900 }}>{s.ordersHandled ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="card" style={{ gridColumn: 'span 4' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Range Aktif</div>
            <div className="muted" style={{ marginTop: 6 }}>{shiftsData ? `${shiftsData.range.start} s/d ${shiftsData.range.end}` : '-'}</div>
          </div>
        </div>
      ) : null}

      {tab === 'qris' ? (
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Upload QRIS</div>
            <div className="hr" />
            <div style={{ display: 'grid', gap: 10 }}>
              <input className="input" type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setQrisFile(e.target.files?.[0] || null)} />
              <button className="btn primary" onClick={uploadQris} disabled={!qrisFile || busy}>
                {busy ? 'Loading...' : 'OK'}
              </button>
            </div>
          </div>
          <div className="card" style={{ gridColumn: 'span 6' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>QRIS Aktif</div>
            <div className="hr" />
            {qris?.qrisImage ? (
              <img
                src={backendOrigin() + qris.qrisImage}
                alt="QRIS"
                style={{ width: '100%', maxWidth: 360, borderRadius: 16, border: '1px solid var(--border)' }}
              />
            ) : (
              <div className="muted">Belum ada QRIS.</div>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'performa' ? (
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 8' }}>
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
                <div style={{ fontWeight: 900, fontSize: 18 }}>Performa Toko</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn ghost" onClick={() => setPerfModal(true)}>
                  Custom
                </button>
                <button
                  className="btn primary"
                  onClick={async () => {
                    const r = perfRange.mode === 'today' ? { mode: 'today', cashier: perfRange.cashier } : perfRange;
                    const qBase =
                      r.mode === 'today'
                        ? '?mode=today'
                        : `?start=${encodeURIComponent(r.start)}&end=${encodeURIComponent(r.end || r.start)}`;
                    const qCashier = r.cashier ? `&cashier=${encodeURIComponent(r.cashier)}` : '';
                    await downloadPdf(`/admin/performance/pdf${qBase}${qCashier}`, 'performa.pdf');
                  }}
                  disabled={!perf}
                >
                  Export PDF
                </button>
              </div>
            </div>
            
            <div className="hr" />
            {!perf ? (
              <div className="muted">Loading...</div>
            ) : (
              <>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={perf.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="hr" />
                <div style={{ fontWeight: 900 }}>Nama Kasir (range)</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {(perf.cashiers || []).length ? perf.cashiers.join(', ') : 'Tidak ada shift'}
                </div>
              </>
            )}
          </div>
          <div className="card" style={{ gridColumn: 'span 4' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Filter</div>
            <div className="hr" />
            <div className="muted">Range aktif:</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{perf ? `${perf.range.start} s/d ${perf.range.end}` : '-'}</div>
            <div className="hr" />
            <div className="muted">Filter kasir:</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{perf?.filter?.cashier || '-'}</div>
          </div>
        </div>
      ) : null}

      {/* ✅ TAB BARU: QR MEJA */}
      {tab === 'qrmeja' ? (
        <div className="grid">
          <div className="card" style={{ gridColumn: 'span 8' }}>
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
                <div style={{ fontWeight: 900, fontSize: 18 }}>QR Code Meja</div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Total: {tables.length} meja. Download PNG per meja atau PDF untuk print.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="btn ghost" onClick={refreshTables}>
                  Refresh
                </button>

                <button
                  className="btn primary"
                  onClick={async () => {
                    await downloadFileWithToken('/admin/tables/pdf/print', 'QR-Meja-DipNFly.pdf');
                  }}
                  disabled={tables.length === 0}
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div className="hr" />

            {tables.length === 0 ? (
              <div className="muted">Belum ada data meja (cek backend /api/admin/tables).</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Meja</th>
                    <th>Kode</th>
                    <th style={{ width: 220 }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t) => (
                    <tr key={t.code}>
                      <td style={{ fontWeight: 900 }}>
                        {t.name} <span className="muted">({t.id})</span>
                      </td>
                      <td className="muted" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                        {t.code}
                      </td>
                      <td>
                        <button
                          className="btn primary"
                          onClick={async () => {
                            await downloadFileWithToken(
                              `/admin/tables/${encodeURIComponent(t.code)}/qrcode.png`,
                              `${t.id}-${t.name}.png`
                            );
                          }}
                        >
                          Download PNG
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card" style={{ gridColumn: 'span 4' }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Cara pakai</div>
            <div className="hr" />
            <div className="muted" style={{ display: 'grid', gap: 8 }}>
              <div>1) Download PDF lalu print.</div>
              <div>2) Tempel QR sesuai label Meja.</div>
              <div>3) Customer scan → masuk halaman Order tanpa lihat Admin/Kasir.</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modals */}
      <Modal
        open={productModal}
        title="Input Menu"
        onClose={() => setProductModal(false)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setProductModal(false)}>
              Batal
            </button>
            <button className="btn primary" onClick={createProduct} disabled={busy || !pForm.name || !pForm.price}>
              OK
            </button>
          </>
        }
      >
        <div className="twoCol">
          <div>
            <div className="label">Nama Menu</div>
            <input className="input" value={pForm.name} onChange={(e) => setPForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <div className="label">Level Menu (opsional)</div>
            <input className="input" value={pForm.level} onChange={(e) => setPForm((p) => ({ ...p, level: e.target.value }))} placeholder="Boleh dikosongkan" />
          </div>
          <div>
            <div className="label">HPP Menu</div>
            <input className="input" type="number" value={pForm.hpp} onChange={(e) => setPForm((p) => ({ ...p, hpp: e.target.value }))} />
          </div>
          <div>
            <div className="label">Harga Menu</div>
            <input className="input" type="number" value={pForm.price} onChange={(e) => setPForm((p) => ({ ...p, price: e.target.value }))} />
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="label">Gambar Menu (jpg/jpeg/png)</div>
          <input className="input" type="file" accept=".jpg,.jpeg,.png" onChange={(e) => setPForm((p) => ({ ...p, image: e.target.files?.[0] || null }))} />
        </div>
      </Modal>

      <Modal
        open={cashModal}
        title="Pilih Range Cashflow"
        onClose={() => setCashModal(false)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setCashModal(false)}>
              Batal
            </button>
            <button className="btn primary" onClick={async () => { setCashModal(false); await refreshCashflow(cashRange); }} disabled={cashRange.mode === 'custom' && !cashRange.start}>
              OK
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="label">Mode</div>
          <select className="input" value={cashRange.mode} onChange={(e) => setCashRange((p) => ({ ...p, mode: e.target.value }))}>
            <option value="today">Hari ini (00.00 WIB)</option>
            <option value="custom">Custom</option>
          </select>

          {cashRange.mode === 'custom' ? (
            <div className="twoCol">
              <div>
                <div className="label">Tanggal mulai (YYYY-MM-DD)</div>
                <input className="input" value={cashRange.start} onChange={(e) => setCashRange((p) => ({ ...p, start: e.target.value }))} placeholder="2026-01-30" />
              </div>
              <div>
                <div className="label">Tanggal akhir (YYYY-MM-DD)</div>
                <input className="input" value={cashRange.end} onChange={(e) => setCashRange((p) => ({ ...p, end: e.target.value }))} placeholder="Boleh kosong = sama dengan mulai" />
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={shiftModal}
        title="Custom Range Kasir"
        onClose={() => setShiftModal(false)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setShiftModal(false)}>
              Batal
            </button>
            <button className="btn primary" onClick={async () => { setShiftModal(false); await refreshShifts(shiftRange); }} disabled={shiftRange.mode === 'custom' && !shiftRange.start}>
              OK
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="label">Mode</div>
          <select className="input" value={shiftRange.mode} onChange={(e) => setShiftRange((p) => ({ ...p, mode: e.target.value }))}>
            <option value="today">Hari ini (00.00 WIB)</option>
            <option value="custom">Custom</option>
          </select>

          {shiftRange.mode === 'custom' ? (
            <div className="twoCol">
              <div>
                <div className="label">Tanggal mulai (YYYY-MM-DD)</div>
                <input className="input" value={shiftRange.start} onChange={(e) => setShiftRange((p) => ({ ...p, start: e.target.value }))} />
              </div>
              <div>
                <div className="label">Tanggal akhir (YYYY-MM-DD)</div>
                <input className="input" value={shiftRange.end} onChange={(e) => setShiftRange((p) => ({ ...p, end: e.target.value }))} />
              </div>
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={perfModal}
        title="Custom Performa Toko"
        onClose={() => setPerfModal(false)}
        actions={
          <>
            <button className="btn ghost" onClick={() => setPerfModal(false)}>
              Batal
            </button>
            <button className="btn primary" onClick={async () => { setPerfModal(false); await refreshPerf(perfRange); }} disabled={perfRange.mode === 'custom' && !perfRange.start}>
              OK
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="label">Mode</div>
          <select className="input" value={perfRange.mode} onChange={(e) => setPerfRange((p) => ({ ...p, mode: e.target.value }))}>
            <option value="today">Hari ini (chart per jam)</option>
            <option value="custom">Custom (chart per hari)</option>
          </select>

          {perfRange.mode === 'custom' ? (
            <div className="twoCol">
              <div>
                <div className="label">Tanggal mulai (YYYY-MM-DD)</div>
                <input className="input" value={perfRange.start} onChange={(e) => setPerfRange((p) => ({ ...p, start: e.target.value }))} />
              </div>
              <div>
                <div className="label">Tanggal akhir (YYYY-MM-DD)</div>
                <input className="input" value={perfRange.end} onChange={(e) => setPerfRange((p) => ({ ...p, end: e.target.value }))} />
              </div>
            </div>
          ) : null}

          <div>
            <div className="label">Filter Nama Kasir (opsional)</div>
            <select className="input" value={perfRange.cashier} onChange={(e) => setPerfRange((p) => ({ ...p, cashier: e.target.value }))}>
              <option value="">(Semua kasir)</option>
              {cashiers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
