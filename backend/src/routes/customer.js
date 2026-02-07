import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { db, initDb } from '../services/db.js';

const router = Router();

function normUpper(s) {
  return String(s || '').trim().toUpperCase();
}

// Public menu for Order page (no HPP)
router.get('/menu', async (_req, res) => {
  await initDb();
  const menu = (db.data.products || []).map((p) => ({
    id: p.id,
    name: p.name,
    level: p.level || '',
    price: p.price,
    image: p.image || null
  }));
  return res.json(menu);
});

// Public get QRIS
router.get('/qris', async (_req, res) => {
  await initDb();
  return res.json({ qrisImage: db.data.settings?.qrisImage || null });
});

// Create order (guest)
router.post('/orders', async (req, res) => {
  await initDb();

  const { items, paymentMethod, tableCode } = req.body || {};

  // ✅ tableCode wajib ada (harus order dari /m/:tableCode)
  const table = normUpper(tableCode);
  if (!table) {
    return res.status(400).json({ message: 'tableCode required (scan QR meja dulu)' });
  }

  // ✅ validasi tableCode harus ada di daftar tables
  const tables = Array.isArray(db.data.tables) ? db.data.tables : [];
  const tableExists = tables.some((t) => normUpper(t.code) === table);
  if (!tableExists) {
    return res.status(400).json({ message: `Invalid tableCode: ${table}` });
  }

  const pm = normUpper(paymentMethod || 'CASH');
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items required' });
  }
  if (!['CASH', 'QRIS'].includes(pm)) {
    return res.status(400).json({ message: 'paymentMethod must be CASH or QRIS' });
  }

  // normalize items: [{productId, qty}]
  const normalized = [];
  for (const it of items) {
    const productId = it.productId || it.id;
    const qty = Number(it.qty || 1);

    const p = (db.data.products || []).find((x) => x.id === productId);
    if (!p) return res.status(400).json({ message: `Unknown product: ${productId}` });

    if (qty <= 0) continue;

    normalized.push({
      id: uuidv4(),
      productId: p.id,
      name: p.name,
      price: p.price,
      hpp: Number(p.hpp || 0),
      qty
    });
  }

  if (normalized.length === 0) {
    return res.status(400).json({ message: 'No valid items' });
  }

  const total = normalized.reduce((s, it) => s + it.price * it.qty, 0);
  const totalHpp = normalized.reduce((s, it) => s + it.hpp * it.qty, 0);

  const order = {
    id: uuidv4(),
    code: String(Math.floor(100000 + Math.random() * 900000)),
    tableCode: table, // ✅ sekarang pasti ada & valid
    items: normalized,
    total,
    totalHpp,
    paymentMethod: pm,
    status: 'NEW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    cashierName: ''
  };

  db.data.orders.unshift(order);
  await db.write();

  return res.json(order);
});

export default router;
