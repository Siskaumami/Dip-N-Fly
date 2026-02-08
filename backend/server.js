import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// (opsional) kalau kamu pakai .env di local/railway variables
import "dotenv/config";

import authRoutes from "./src/routes/auth.js";
import adminRoutes from "./src/routes/admin.js";
import kasirRoutes from "./src/routes/kasir.js";
import customerRoutes from "./src/routes/customer.js";
import publicRoutes from "./src/routes/public.js";
import tablesRoutes from "./src/routes/tables.js";
import { ensureDbSeeded } from "./src/services/db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// uploads (jangan ketimpa SPA)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== API =====
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/admin/tables", tablesRoutes);
app.use("/api", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/kasir", kasirRoutes);
app.use("/api", customerRoutes);
app.use("/api", publicRoutes);

// ===== FRONTEND (Vite build) =====
// Pastikan hasil build ada di: backend/dist
const distPath = path.join(__dirname, "dist");

// 1) serve file static (assets, index.html)
// IMPORTANT: jangan pakai { fallthrough: false } biar route SPA bisa fallback ke index.html
app.use(express.static(distPath));

// 2) SPA fallback: hanya untuk request non-API & non-uploads
app.get("*", (req, res) => {
  // kalau request ke /api atau /uploads, jangan dibales index.html
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return res.status(404).send("Not Found");
  }

  res.sendFile(path.join(distPath, "index.html"), (err) => {
    if (err) {
      res.status(404).send("Frontend dist not found in backend/dist");
    }
  });
});

const PORT = process.env.PORT || 8080;

await ensureDbSeeded();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Dip N Fly backend running on :${PORT}`);
});
