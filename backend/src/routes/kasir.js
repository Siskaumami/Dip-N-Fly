import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

import { db, initDb } from '../services/db.js';
import { requireAuth } from '../middlewares/auth.js';
import { requireRole } from '../middlewares/roleCheck.js';
import { inRangeWib, nowWib } from '../utils/time.js';

const router = Router();
router.use(requireAuth, requireRole('kasir', 'admin')); // admin can also open kasir view if needed

function resolveTodayRange() {
  const t = nowWib();
  return { start: t.startOf('day').toISO(), end: t.endOf('day').toISO() };
}

router.post('/shift/login', async (req, res) => {
  await initDb();
  const { cashierName } = req.body || {};
  if (!cashierName) return res.status(400).json({ message: 'cashierName required' });

  const shift = {
    id: uuidv4(),
    cashierName: String(cashierName),
    startAt: new Date().toISOString(),
    endAt: null,
    createdBy: req.user.username
  };
  db.data.shifts.unshift(shift);
  await db.write();
  return res.json(shift);
});

router.post('/shift/logout', async (req, res) => {
  await initDb();
  const { shiftId } = req.body || {};
  const shift = db.data.shifts.find((s) => s.id === shiftId);
  if (!shift) return res.status(404).json({ message: 'Shift not found' });
  if (shift.endAt) return res.json(shift);

  shift.endAt = new Date().toISOString();

  // count orders touched during shift (order updatedAt between start-end and cashierName matches)
  const start = shift.startAt;
  const end = shift.endAt;
  const touched = db.data.orders.filter((o) => {
    const t = o.updatedAt || o.createdAt;
    return t >= start && t <= end && (o.cashierName || '') === shift.cashierName;
  });

  shift.ordersHandled = touched.length;
  shift.updatedAt = new Date().toISOString();
  await db.write();

  return res.json(shift);
});

router.get('/orders', async (req, res) => {
  await initDb();
  const { mode, start, end } = req.query || {};
  const range = mode === 'today' || (!start && !end) ? resolveTodayRange() : { start: String(start), end: String(end || start) };

  const orders = db.data.orders
    .filter((o) => inRangeWib(o.createdAt, range.start, range.end))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return res.json({ range, orders });
});

router.patch('/orders/:id/status', async (req, res) => {
  await initDb();
  const order = db.data.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Not found' });

  const { status, cashierName } = req.body || {};
  const allowed = ['NEW', 'PROCESS', 'DONE'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  order.status = status;
  if (cashierName) order.cashierName = String(cashierName);
  order.updatedAt = new Date().toISOString();
  await db.write();
  return res.json(order);
});

router.delete('/orders/:id', async (req, res) => {
  await initDb();
  const order = db.data.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Not found' });
  if (order.status !== 'NEW') return res.status(400).json({ message: 'Only NEW order can be deleted' });

  db.data.orders = db.data.orders.filter((o) => o.id !== req.params.id);
  await db.write();
  return res.json({ ok: true });
});

router.get('/summary/today', async (_req, res) => {
  await initDb();
  const range = resolveTodayRange();
  const done = db.data.orders.filter((o) => inRangeWib(o.createdAt, range.start, range.end) && o.status === 'DONE');
  const revenue = done.reduce((s, o) => s + (o.total || 0), 0);
  return res.json({ range, doneCount: done.length, revenue });
});

export default router;
