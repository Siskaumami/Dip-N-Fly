import { Router } from "express";
import { db, initDb } from "../services/db.js";

const router = Router();

// QR scan -> backend: /t/:code
// backend redirect -> frontend: /m/:code
router.get("/t/:code", async (req, res) => {
  await initDb();
  const code = String(req.params.code);

  const exists = (db.data.tables || []).find((t) => t.code === code);
  if (!exists) return res.status(404).send("QR tidak valid");

  const frontend = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  return res.redirect(`${frontend}/m/${encodeURIComponent(code)}`);
});

export default router;
