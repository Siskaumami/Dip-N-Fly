# Dip N Fly online

Website mobile-friendly (React) + Backend Node.js (Express) untuk:
- Admin: Menu, Cashflow (+ export PDF), Kasir (shift), Upload QRIS, Performa Toko (+ export PDF)
- Kasir: Log In / Log Out shift, kelola order (NEW → PROCESS → DONE, hapus NEW)
- Order (guest): pilih menu, cart, checkout Cash / QRIS

## Akun
- Admin: **admindipnfly** / **dipnflymalang8**
- Kasir: **kasirdipnfly** / **dipnflymalang88**

## Jalankan (Local)
### 1) Backend
```bash
cd backend
npm install
npm run dev
```
Backend jalan di `http://localhost:3001` dan API di `http://localhost:3001/api`.

### 2) Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend jalan di `http://localhost:5173`.

> Catatan: data tersimpan di `backend/db.json` (auto-created). Upload tersimpan di `backend/uploads/`.

## Build + Run (Production sederhana)
```bash
cd frontend
npm install
npm run build

cd ../backend
npm install
npm start
```
Backend akan serve `frontend/dist` jika sudah dibuild.

## Docker (opsional)
```bash
docker build -t dipnfly-online .
docker run -p 3001:3001 dipnfly-online
```

## Endpoint penting
- POST `/api/login`
- Admin:
  - GET/POST `/api/admin/products`
  - POST `/api/admin/qris`
  - GET `/api/admin/cashflow` + `/api/admin/cashflow/pdf`
  - GET `/api/admin/performance` + `/api/admin/performance/pdf`
  - GET `/api/admin/shifts`
- Kasir:
  - POST `/api/kasir/shift/login`, POST `/api/kasir/shift/logout`
  - GET `/api/kasir/orders`, PATCH `/api/kasir/orders/:id/status`, DELETE `/api/kasir/orders/:id`
- Guest:
  - GET `/api/menu`
  - POST `/api/orders`
  - GET `/api/qris`
