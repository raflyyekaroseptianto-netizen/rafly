/* ============================================================
   SPAREPARTS-STORE — data inventaris & helper (dipakai dashboard
   dan halaman spare parts). Data disimpan di localStorage.
   ============================================================ */

const SPARE_CATEGORIES = ["Bearing", "Seal & Gasket", "Filter", "Belt", "Instrument", "Elektrikal", "Lubricant", "Pipa & Fitting"];

const SPARE_DEFAULT = [
  { id: "sp-001", kode: "SP-001", nama: "Bearing SKF 6304 2RS",        kategori: "Bearing",        qty: 4,  minQty: 2,  unit: "pcs",    harga: 185000, lokasi: "Rack A-1", mesin: "Chiller 1",   supplier: "PT Teknik Utama", updatedAt: new Date().toISOString() },
  { id: "sp-002", kode: "SP-002", nama: "O-ring NBR 3/8 inch",         kategori: "Seal & Gasket",  qty: 10, minQty: 5,  unit: "pcs",    harga: 25000,  lokasi: "Rack A-2", mesin: "Chiller 1-4", supplier: "CV Sinar Seal",   updatedAt: new Date().toISOString() },
  { id: "sp-003", kode: "SP-003", nama: "Filter Udara Panel AHU 592x592", kategori: "Filter",      qty: 6,  minQty: 3,  unit: "pcs",    harga: 320000, lokasi: "Rack B-1", mesin: "AHU 1-3",    supplier: "PT Filtrindo",    updatedAt: new Date().toISOString() },
  { id: "sp-004", kode: "SP-004", nama: "Belt V-Belt B55",             kategori: "Belt",           qty: 8,  minQty: 4,  unit: "pcs",    harga: 95000,  lokasi: "Rack B-2", mesin: "AHU 1",      supplier: "PT Sinar Bearing", updatedAt: new Date().toISOString() },
  { id: "sp-005", kode: "SP-005", nama: "Sensor Suhu PT100",           kategori: "Instrument",     qty: 2,  minQty: 1,  unit: "pcs",    harga: 450000, lokasi: "Rack C-1", mesin: "Semua Mesin",supplier: "PT Omega Teknik",  updatedAt: new Date().toISOString() },
  { id: "sp-006", kode: "SP-006", nama: "Pressure Switch 0-6 bar",     kategori: "Instrument",     qty: 3,  minQty: 2,  unit: "pcs",    harga: 220000, lokasi: "Rack C-2", mesin: "Boiler",     supplier: "PT Omega Teknik",  updatedAt: new Date().toISOString() },
  { id: "sp-007", kode: "SP-007", nama: "Filter Cartridge 5 micron",   kategori: "Filter",         qty: 12, minQty: 6,  unit: "pcs",    harga: 150000, lokasi: "Rack D-1", mesin: "PW / WFI",   supplier: "PT Filtrindo",    updatedAt: new Date().toISOString() },
  { id: "sp-008", kode: "SP-008", nama: "Gasket Flange DN50",          kategori: "Seal & Gasket",  qty: 20, minQty: 10, unit: "pcs",    harga: 12000,  lokasi: "Rack D-2", mesin: "Semua Mesin",supplier: "CV Sinar Seal",   updatedAt: new Date().toISOString() },
  { id: "sp-009", kode: "SP-009", nama: "Oil Lubricant ISO VG 68",     kategori: "Lubricant",      qty: 2,  minQty: 4,  unit: "liter",  harga: 85000,  lokasi: "Rack E-1", mesin: "Boiler / Chiller", supplier: "PT Pelumas Jaya",   updatedAt: new Date().toISOString() },
  { id: "sp-010", kode: "SP-010", nama: "Kontaktor Magnetik 220V 65A", kategori: "Elektrikal",     qty: 1,  minQty: 2,  unit: "pcs",    harga: 280000, lokasi: "Rack F-1", mesin: "Chiller 4",   supplier: "PT Sakura Elektrik", updatedAt: new Date().toISOString() }
];

function genPartId() {
  return "sp-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function nextKode(parts) {
  const max = parts.reduce((m, p) => {
    const n = parseInt(String(p.kode).replace(/\D/g, ""), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  const k = "SP-" + String(max + 1).padStart(3, "0");
  return k;
}

function allParts() {
  let p = store.get("spareparts", null);
  if (!p) {
    p = SPARE_DEFAULT.map((x) => ({ ...x }));
    store.set("spareparts", p);
  }
  return Array.isArray(p) ? p : [];
}

function saveParts(parts) { store.set("spareparts", parts); }

function isLowStock(p) { return Number(p.qty) <= Number(p.minQty); }

function partTotalStock() { return allParts().reduce((s, p) => s + Number(p.qty || 0), 0); }
function partLowCount() { return allParts().filter(isLowStock).length; }