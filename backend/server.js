import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './src/routes/auth.js';
import adminRoutes from './src/routes/admin.js';
import kasirRoutes from './src/routes/kasir.js';
import customerRoutes from './src/routes/customer.js';

import { ensureDbSeeded } from './src/services/db.js';
import publicRoutes from "./src/routes/public.js";
import tablesRoutes from "./src/routes/tables.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use("/api/admin/tables", tablesRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kasir', kasirRoutes);
app.use('/api', customerRoutes);

// 👉 kalau publicRoutes itu beneran endpoint API, mending kasih prefix:
app.use("/api", publicRoutes);

// Serve frontend build (INI PATH YANG BENER sesuai Dockerfile kamu)
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// SPA fallback (HARUS PALING BAWAH)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8080;

await ensureDbSeeded();

app.listen(PORT, () => {
  console.log(`Dip N Fly backend running on :${PORT}`);
});
