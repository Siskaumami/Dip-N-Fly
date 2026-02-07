import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, "..", "..", "db.json");

const adapter = new JSONFile(dbFile);

export const db = new Low(adapter, {
  users: [],
  products: [],
  orders: [],
  shifts: [],
  settings: { qrisImage: null },
  tables: []
});

export async function initDb() {
  // ✅ READ saja. JANGAN write di sini (biang EPERM di Windows)
  await db.read();

  // ✅ pastikan struktur default lengkap
  db.data ||= {
    users: [],
    products: [],
    orders: [],
    shifts: [],
    settings: { qrisImage: null },
    tables: []
  };

  if (!Array.isArray(db.data.users)) db.data.users = [];
  if (!Array.isArray(db.data.products)) db.data.products = [];
  if (!Array.isArray(db.data.orders)) db.data.orders = [];
  if (!Array.isArray(db.data.shifts)) db.data.shifts = [];
  if (!db.data.settings) db.data.settings = { qrisImage: null };
  if (!Array.isArray(db.data.tables)) db.data.tables = [];
}

export function nowIso() {
  return new Date().toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

export async function ensureDbSeeded() {
  await initDb();

  // ✅ Seed tables stabil: MEJA01..MEJA20 (konsisten dengan tables.js)
  if (!Array.isArray(db.data.tables)) db.data.tables = [];
  if (db.data.tables.length === 0) {
    db.data.tables = Array.from({ length: 20 }).map((_, i) => {
      const n = i + 1;
      return {
        id: n,
        name: `Meja ${n}`,
        code: `MEJA${pad2(n)}`
      };
    });
  }

  // ✅ seed user admin/kasir (tetap seperti sebelumnya)
  const hasAdmin = db.data.users.some((u) => u.username === "admindipnfly");
  const hasKasir = db.data.users.some((u) => u.username === "kasirdipnfly");

  if (!hasAdmin) {
    db.data.users.push({
      id: uuidv4(),
      username: "admindipnfly",
      passwordHash: bcrypt.hashSync("dipnflymalang8", 10),
      role: "admin"
    });
  }

  if (!hasKasir) {
    db.data.users.push({
      id: uuidv4(),
      username: "kasirdipnfly",
      passwordHash: bcrypt.hashSync("dipnflymalang88", 10),
      role: "kasir"
    });
  }

  // ✅ ensure uploads folder
  const uploadsDir = path.join(__dirname, "..", "..", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // ✅ TULIS SEKALI DI SINI
  await db.write();
}
