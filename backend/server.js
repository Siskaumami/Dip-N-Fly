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

app.use("/", publicRoutes);
app.use("/api/admin/tables", tablesRoutes);


// uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kasir', kasirRoutes);
app.use('/api', customerRoutes);

// Serve frontend build in production (optional)
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  const indexHtml = path.join(distPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) res.status(404).send('Frontend not built. Run frontend build first.');
  });
});

const PORT = process.env.PORT || 3001;

await ensureDbSeeded();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Dip N Fly backend running on :${PORT}`);
});
