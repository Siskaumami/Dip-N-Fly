// backend/src/routes/admin.js
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

import { db, initDb } from '../services/db.js';
import { uploadImage } from '../services/upload.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { dateKeyWib, hourKeyWib, inRangeWib, nowWib } from '../utils/time.js';
import { streamPdf } from '../utils/pdf.js';

const router = Router();

router.use(requireAuth, requireRole('admin'));

// ===== helpers =====
function normalizeCode(v) {
  return String(v || '').trim().toUpperCase();
}

function formatRupiah(n) {
  const x = Math.round(Number(n || 0));
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getBaseFrontendUrl(req) {
  // Prioritas: FRONTEND_ORIGIN (set di Railway Variables)
  // Fallback: same-origin dari request (proxy railway)
  const env = (process.env.FRONTEND_ORIGIN || '').trim().replace(/\/+$/, '');
  if (env) return env;

  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString();
  const host = req.get('host');
  return `${proto}://${host}`;
}

// ===== PRODUCTS (Menu) =====
router.get('/products', async (_req, res) => {
  await initDb();
  return res.json(db.data.products || []);
});

router.post('/products', uploadImage.single('image'), async (req, res) => {
  await initDb();

  const { name, level, hpp, price } = req.body || {};
  if (!name || price === undefined || price === null || String(price).trim() === '') {
    return res.status(400).json({ message: 'name & price required' });
  }

  const imgPath = req.file ? `/uploads/${req.file.filename}` : null;

  const product = {
    id: uuidv4(),
    name: String(name),
    level: level ? String(level) : '',
    image: imgPath,
    hpp: hpp ? Number(hpp) : 0,
    price: Number(price),
    createdAt: new Date().toISOString()
  };

  db.data.products = db.data.products || [];
  db.data.products.unshift(product);
  await db.write();

  return res.json(product);
});

router.put('/products/:id', uploadImage.single('image'), async (req, res) => {
  await initDb();

  db.data.products = db.data.products || [];
  const p = db.data.products.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Not found' });

  const { name, level, hpp, price } = req.body || {};
  if (name !== undefined) p.name = String(name);
  if (level !== undefined) p.level = String(level || '');
  if (hpp !== undefined) p.hpp = Number(hpp || 0);
  if (price !== undefined) p.price = Number(price || 0);
  if (req.file) p.image = `/uploads/${req.file.filename}`;
  p.updatedAt = new Date().toISOString();

  await db.write();
  return res.json(p);
});

router.delete('/products/:id', async (req, res) => {
  await initDb();

  db.data.products = db.data.products || [];
  const before = db.data.products.length;
  db.data.products = db.data.products.filter((p) => p.id !== req.params.id);
  await db.write();

  return res.json({ ok: true, removed: before - db.data.products.length });
});

// ===== TABLES =====
router.get('/tables', async (_req, res) => {
  await initDb();
  return res.json(db.data.tables || []);
});

router.post('/tables', async (req, res) => {
  await initDb();

  const { name, code } = req.body || {};
  if (!name || !code) return res.status(400).json({ message: 'name & code required' });

  db.data.tables = db.data.tables || [];
  const c = normalizeCode(code);

  if (db.data.tables.some((t) => normalizeCode(t.code) === c)) {
    return res.status(409).json({ message: `Table code already exists: ${c}` });
  }

  const maxId = db.data.tables.reduce((m, t) => Math.max(m, Number(t.id || 0)), 0);
  const baseUrl = getBaseFrontendUrl(req);

  const t = {
    id: maxId + 1,
    name: String(name),
    code: c,
    url: `${baseUrl}/m/${c}`
  };

  db.data.tables.push(t);
  await db.write();
  return res.json(t);
});

router.put('/tables/:id', async (req, res) => {
  await initDb();

  db.data.tables = db.data.tables || [];
  const idNum = Number(req.params.id);
  const t = db.data.tables.find((x) => Number(x.id) === idNum);
  if (!t) return res.status(404).json({ message: 'Not found' });

  const { name, code } = req.body || {};
  if (name !== undefined) t.name = String(name);

  if (code !== undefined) {
    const c = normalizeCode(code);
    if (db.data.tables.some((x) => Number(x.id) !== idNum && normalizeCode(x.code) === c)) {
      return res.status(409).json({ message: `Table code already exists: ${c}` });
    }
    t.code = c;
  }

  const baseUrl = getBaseFrontendUrl(req);
  t.url = `${baseUrl}/m/${normalizeCode(t.code)}`;

  await db.write();
  return res.json(t);
});

router.delete('/tables/:id', async (req, res) => {
  await initDb();

  db.data.tables = db.data.tables || [];
  const idNum = Number(req.params.id);
  const before = db.data.tables.length;

  db.data.tables = db.data.tables.filter((x) => Number(x.id) !== idNum);
  await db.write();

  return res.json({ ok: true, removed: before - db.data.tables.length });
});

// ===== QR PRINT (PDF) =====
router.get('/tables/pdf/print', async (req, res) => {
  await initDb();

  const baseUrl = getBaseFrontendUrl(req);
  const tables = (db.data.tables || []).slice().sort((a, b) => Number(a.id) - Number(b.id));

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="QR-Meja-DipNFly.pdf"');

  const doc = new PDFDocument({ size: 'A4', margin: 24 });
  doc.pipe(res);

  const col = 3;
  const cellW = 180;
  const cellH = 250;
  const startX = 24;
  const startY = 24;

  for (let idx = 0; idx < tables.length; idx++) {
    const t = tables[idx];
    const code = normalizeCode(t.code);
    const url = `${baseUrl}/m/${code}`;

    const pngDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 220 });
    const base64 = pngDataUrl.split(',')[1];
    const img = Buffer.from(base64, 'base64');

    const r = Math.floor(idx / col);
    const c = idx % col;

    const x = startX + c * cellW;
    const y = startY + r * cellH;

    if (y + cellH > doc.page.height - 24) {
      doc.addPage();
      idx--; // ulangi item ini di page baru
      continue;
    }

    doc.roundedRect(x, y, cellW - 12, cellH - 12, 10).stroke();
    doc.fontSize(14).text(`${t.name || 'MEJA'} (${code})`, x, y + 10, { width: cellW - 12, align: 'center' });

    doc.image(img, x + 25, y + 40, { width: 120, height: 120 });
    doc.fontSize(8).text(url, x + 10, y + 170, { width: cellW - 32, align: 'center' });
  }

  doc.end();
});

// ===== QRIS =====
router.post('/qris', uploadImage.single('qris'), async (req, res) => {
  await initDb();
  if (!req.file) return res.status(400).json({ message: 'qris image required' });

  db.data.settings = db.data.settings || {};
  db.data.settings.qrisImage = `/uploads/${req.file.filename}`;
  db.data.settings.qrisUpdatedAt = new Date().toISOString();

  await db.write();
  return res.json({ qrisImage: db.data.settings.qrisImage });
});

router.get('/qris', async (_req, res) => {
  await initDb();
  db.data.settings = db.data.settings || {};
  return res.json({
    qrisImage: db.data.settings.qrisImage || null,
    updatedAt: db.data.settings.qrisUpdatedAt || null
  });
});

// ===== CASHFLOW =====
function resolveRange(req) {
  const { start, end, mode } = req.query || {};
  if (mode === 'today' || (!start && !end)) {
    const t = nowWib();
    const s = t.startOf('day').toISO();
    const e = t.endOf('day').toISO();
    return { start: s, end: e };
  }
  return { start: String(start), end: String(end || start) };
}

function ordersInRange(range) {
  db.data.orders = db.data.orders || [];
  return db.data.orders.filter((o) => inRangeWib(o.createdAt, range.start, range.end));
}

function shiftsInRange(range) {
  db.data.shifts = db.data.shifts || [];
  return db.data.shifts.filter((s) => {
    const startOk = inRangeWib(s.startAt, range.start, range.end);
    const endIso = s.endAt || new Date().toISOString();
    const endOk = inRangeWib(endIso, range.start, range.end);
    return startOk || endOk;
  });
}

router.get('/cashflow', async (req, res) => {
  await initDb();

  const range = resolveRange(req);
  const orders = ordersInRange(range).filter((o) => o.status === 'DONE');

  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const cogs = orders.reduce((sum, o) => sum + (o.totalHpp || 0), 0);
  const profit = revenue - cogs;

  const cash = orders.filter((o) => o.paymentMethod === 'CASH').reduce((s, o) => s + (o.total || 0), 0);
  const qris = orders.filter((o) => o.paymentMethod === 'QRIS').reduce((s, o) => s + (o.total || 0), 0);

  const shiftCashiers = shiftsInRange(range).map((s) => s.cashierName);
  const cashiers = Array.from(new Set(shiftCashiers)).filter(Boolean);

  return res.json({
    range,
    summary: {
      ordersDone: orders.length,
      revenue,
      cogs,
      profit,
      cash,
      qris
    },
    cashiers,
    shifts: shiftsInRange(range)
  });
});

router.get('/cashflow/pdf', async (req, res) => {
  await initDb();

  const range = resolveRange(req);
  const orders = ordersInRange(range).filter((o) => o.status === 'DONE');

  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const cogs = orders.reduce((sum, o) => sum + (o.totalHpp || 0), 0);
  const profit = revenue - cogs;

  const cash = orders.filter((o) => o.paymentMethod === 'CASH').reduce((s, o) => s + (o.total || 0), 0);
  const qris = orders.filter((o) => o.paymentMethod === 'QRIS').reduce((s, o) => s + (o.total || 0), 0);

  streamPdf(res, `Cashflow_${range.start}_to_${range.end}`, (doc) => {
    doc.fontSize(12).text(`Range: ${range.start} s/d ${range.end}`);
    doc.moveDown(0.5);
    doc.text(`Orders Done: ${orders.length}`);
    doc.text(`Revenue: Rp ${formatRupiah(revenue)}`);
    doc.text(`COGS (HPP): Rp ${formatRupiah(cogs)}`);
    doc.text(`Profit: Rp ${formatRupiah(profit)}`);
    doc.moveDown(0.5);
    doc.text(`Cash: Rp ${formatRupiah(cash)}`);
    doc.text(`QRIS: Rp ${formatRupiah(qris)}`);
    doc.moveDown(1);

    doc.fontSize(12).text('Rincian Orders (DONE):');
    doc.moveDown(0.5);
    orders.slice(0, 60).forEach((o) => {
      doc.fontSize(10).text(
        `- ${dateKeyWib(o.createdAt)} #${o.code}  Rp ${formatRupiah(o.total)}  (${o.paymentMethod})  Kasir: ${o.cashierName || '-'}`
      );
    });
    if (orders.length > 60) {
      doc.moveDown(0.5);
      doc.fontSize(10).text(`...(${orders.length - 60} data lainnya)`);
    }
  });
});

// ===== PERFORMANCE =====
function buildPerformanceTable(orders, singleDay) {
  if (singleDay) {
    const buckets = Array.from({ length: 24 }).map((_, i) => ({ label: String(i).padStart(2, '0'), count: 0 }));
    orders.forEach((o) => {
      const hk = hourKeyWib(o.createdAt);
      const idx = Number(hk);
      const qty = (o.items || []).reduce((s, it) => s + (it.qty || 0), 0);
      buckets[idx].count += qty;
    });
    return buckets;
  }

  const map = new Map();
  orders.forEach((o) => {
    const dk = dateKeyWib(o.createdAt);
    const qty = (o.items || []).reduce((s, it) => s + (it.qty || 0), 0);
    map.set(dk, (map.get(dk) || 0) + qty);
  });

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, count]) => ({ label, count }));
}

router.get('/performance', async (req, res) => {
  await initDb();

  const range = resolveRange(req);
  const cashier = (req.query.cashier || '').toString().trim();

  const orders = ordersInRange(range).filter((o) => o.status === 'DONE' || o.status === 'PROCESS' || o.status === 'NEW');
  const cashiers = Array.from(new Set(shiftsInRange(range).map((s) => s.cashierName))).filter(Boolean);

  const filtered = cashier ? orders.filter((o) => o.cashierName === cashier) : orders;

  const startDay = dateKeyWib(new Date(range.start).toISOString());
  const endDay = dateKeyWib(new Date(range.end).toISOString());
  const isSingleDay = startDay === endDay;

  const chart = buildPerformanceTable(filtered, isSingleDay);
  return res.json({ range, cashiers, chart, filter: { cashier: cashier || null } });
});

router.get('/performance/pdf', async (req, res) => {
  await initDb();

  const range = resolveRange(req);
  const cashier = (req.query.cashier || '').toString().trim();

  const orders = ordersInRange(range).filter((o) => o.status === 'DONE' || o.status === 'PROCESS' || o.status === 'NEW');
  const filtered = cashier ? orders.filter((o) => o.cashierName === cashier) : orders;

  const startDay = dateKeyWib(new Date(range.start).toISOString());
  const endDay = dateKeyWib(new Date(range.end).toISOString());
  const isSingleDay = startDay === endDay;

  const title = `Performa_Toko_${range.start}_to_${range.end}${cashier ? `_kasir_${cashier}` : ''}`;
  streamPdf(res, title, (doc) => {
    doc.fontSize(12).text(`Range: ${range.start} s/d ${range.end}`);
    if (cashier) doc.text(`Filter Kasir: ${cashier}`);
    doc.moveDown(1);

    doc.fontSize(12).text(isSingleDay ? 'Chart per Jam (qty menu dipesan)' : 'Chart per Hari (qty menu dipesan)');
    doc.moveDown(0.5);

    const rows = buildPerformanceTable(filtered, isSingleDay);
    rows.slice(0, 40).forEach((r) => doc.fontSize(10).text(`${r.label}: ${r.count}`));
    if (rows.length > 40) doc.fontSize(10).text(`...(${rows.length - 40} data lainnya)`);
  });
});

// ===== SHIFTS =====
router.get('/shifts', async (req, res) => {
  await initDb();

  const range = resolveRange(req);
  const shifts = shiftsInRange(range).sort((a, b) => (a.startAt < b.startAt ? 1 : -1));
  return res.json({ range, shifts });
});

export default router;
