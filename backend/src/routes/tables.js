import { Router } from "express";
import QRCode from "qrcode";
import { db, initDb } from "../services/db.js";
import { requireAuth } from "../middlewares/auth.js";
import { requireRole } from "../middlewares/roleCheck.js";
import { streamPdf } from "../utils/pdf.js";

const router = Router();
router.use(requireAuth, requireRole("admin"));

function pad2(n) {
  return String(n).padStart(2, "0");
}

function getFrontendOrigin(req) {
  return (
    process.env.FRONTEND_ORIGIN ||
    req.headers.origin ||
    "http://localhost:5173"
  );
}

async function ensure20Tables() {
  await initDb();
  if (!Array.isArray(db.data.tables)) db.data.tables = [];

  // ✅ kalau sudah ada 20 meja, skip
  if (db.data.tables.length >= 20) return db.data.tables;

  // ✅ bikin MEJA01..MEJA20 (merge kalau ada sebagian)
  const existing = new Set(db.data.tables.map((t) => String(t.code).toUpperCase()));

  for (let i = 1; i <= 20; i++) {
    const code = `MEJA${pad2(i)}`;
    if (!existing.has(code)) {
      db.data.tables.push({
        id: i,
        name: `Meja ${i}`,
        code
      });
    }
  }

  // sort by id
  db.data.tables.sort((a, b) => (a.id || 0) - (b.id || 0));

  // ✅ write hanya saat ada perubahan
  await db.write();
  return db.data.tables;
}

// list meja (auto create 20)
router.get("/", async (req, res) => {
  const tables = await ensure20Tables();
  const origin = getFrontendOrigin(req);

  const mapped = tables.map((t) => ({
    ...t,
    url: `${origin}/m/${encodeURIComponent(t.code)}`
  }));

  return res.json(mapped);
});

// download QR png per meja (QR menuju FRONTEND /m/:code)
router.get("/:code/qrcode.png", async (req, res) => {
  const tables = await ensure20Tables();
  const code = String(req.params.code || "").toUpperCase();

  const table = tables.find((t) => String(t.code).toUpperCase() === code);
  if (!table) return res.status(404).json({ message: "Table not found" });

  const origin = getFrontendOrigin(req);
  const url = `${origin}/m/${encodeURIComponent(code)}`;

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Disposition", `attachment; filename="${table.code}.png"`);

  const pngBuffer = await QRCode.toBuffer(url, { width: 512, margin: 2 });
  return res.end(pngBuffer);
});

// PDF buat print 20 QR (QR menuju FRONTEND /m/:code)
router.get("/pdf/print", async (req, res) => {
  const tables = await ensure20Tables();
  const origin = getFrontendOrigin(req);

  streamPdf(res, "QR_Meja_DipNFly", async (doc) => {
    doc.fontSize(16).text("QR Code Meja - Dip N Fly", { align: "center" });
    doc.moveDown(1);

    const colW = 260;
    const rowH = 300;
    let x = 50, y = 120;
    let col = 0;

    for (const t of tables) {
      const url = `${origin}/m/${encodeURIComponent(t.code)}`;
      const png = await QRCode.toBuffer(url, { width: 380, margin: 1 });

      doc.fontSize(12).text(`${t.name} (${t.code})`, x, y - 18);
      doc.image(png, x, y, { width: 220 });

      col++;
      if (col === 2) {
        col = 0;
        x = 50;
        y += rowH;
      } else {
        x += colW;
      }

      if (y > 650) {
        doc.addPage();
        x = 50;
        y = 120;
        col = 0;
      }
    }
  });
});

export default router;
