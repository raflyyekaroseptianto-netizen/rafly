/* ============================================================
   SPAREPARTS.JS — halaman manajemen spare parts (CRUD + stok)
   ============================================================ */

let editId = null;
let adjustId = null;
const catSelect = document.getElementById("fKategori");
const mesinSelect = document.getElementById("fMesin");

function renderStats() {
  const parts = allParts();
  const nilai = parts.reduce((s, p) => s + nb(p.qty) * nb(p.harga), 0);
  const low = parts.filter(isLowStock).length;
  const unit = parts.filter((p) => isLowStock(p)).map((p) => p.mesin);
document.getElementById("statsRow").innerHTML =
    statCard2("Total Item", parts.length, "", "blue", "jenis spare part") +
    statCard2("Total Stok", partTotalStock(), "pcs", "blue", "keseluruhan satuan") +
    '<div class="card stat"><span class="lbl">Nilai Inventaris</span><span class="val" style="font-size:18px;color:var(--green)">' + money(nilai) + "</span><span class=\"sub\">estimasi qty x harga</span></div>" +
    statCard2("Low Stock", low, "", low ? "red" : "green", low ? "perlu reorder" : "stok aman");
}

function statCard2(lbl, val, unit, cls, sub) {
  return (
    '<div class="card stat"><span class="lbl">' + esc(lbl) + '</span>' +
    '<span class="val ' + cls + '">' + esc(val) + (unit ? ' <span style="font-size:12px">' + esc(unit) + "</span>" : "") + "</span>" +
    '<span class="sub">' + esc(sub) + "</span></div>"
  );
}

function renderAlerts() {
  const low = allParts().filter(isLowStock);
  const b = document.getElementById("alertBanner");
  b.innerHTML = low.length
    ? '<div class="alert-banner">&#9888; ' + low.length + " spare part di bawah stok minimum: " +
      low.map((p) => p.nama + " (" + p.qty + "/" + p.minQty + ")").join(", ") + " &mdash; segera reorder.</div>"
    : "";
}

function filteredParts() {
  const q = (document.getElementById("qSearch").value || "").toLowerCase().trim();
  const c = document.getElementById("qCat").value;
  return allParts()
    .filter((p) => !q || (p.nama + " " + p.kode + " " + p.mesin + " " + p.supplier + " " + p.kategori).toLowerCase().includes(q))
    .filter((p) => c === "" ? true : (c === "__low" ? isLowStock(p) : p.kategori === c));
}

function renderParts() {
  const parts = filteredParts();
  const tb = document.getElementById("tblParts");
  const th = "<thead><tr><th>Kode</th><th>Nama Item</th><th>Kategori</th><th>Stok</th><th>Min</th><th>Harga</th><th>Lokasi</th><th>Mesin</th><th>Aksi</th></tr></thead>";
  if (!parts.length) {
    tb.innerHTML = th + '<tbody><tr><td colspan="9" class="empty">Tidak ada data ditemukan.</td></tr></tbody>';
    return;
  }
  tb.innerHTML = th + "<tbody>" + parts.map((p) => {
    const low = isLowStock(p);
    const stockHtml = '<span class="badge ' + (low ? "alert" : "normal") + '">' + p.qty + " " + esc(p.unit || "pcs") + "</span>";
    return (
      "<tr" + (low ? " class='row-low'" : "") + ">" +
      "<td><b>" + esc(p.kode) + "</b></td>" +
      "<td>" + esc(p.nama) + (p.catatan ? "<br/><span style='color:var(--muted);font-size:11px'>" + esc(p.catatan) + "</span>" : "") + "</td>" +
      "<td>" + esc(p.kategori) + "</td>" +
      "<td>" + stockHtml + "<br/><span style='color:var(--muted);font-size:11px'>min " + p.minQty + "</span></td>" +
      "<td>" + p.minQty + "</td>" +
      "<td>" + money(p.harga) + "</td>" +
      "<td>" + esc(p.lokasi || "-") + "</td>" +
      "<td>" + esc(p.mesin || "-") + "</td>" +
      '<td><div class="actions-row" style="flex-wrap:wrap">' +
      '<button class="btn sm" onclick="openAdjust(\'' + p.id + '\')">Stok</button>' +
      '<button class="btn sm" onclick="openPartModal(\'edit\',\'' + p.id + '\')">Edit</button>' +
      '<button class="btn sm danger" onclick="deletePart(\'' + p.id + '\')">Hapus</button>' +
      "</div></td></tr>"
    );
  }).join("") + "</tbody>";
}

function fillSelects() {
  catSelect.innerHTML = SPARE_CATEGORIES.map((c) => "<option>" + esc(c) + "</option>").join("");
  const opts = {};
  MACHINES.forEach((m) => { opts[m.name] = 1; });
  allParts().forEach((p) => { if (p.mesin) opts[p.mesin] = 1; });
  opts["Semua Mesin"] = 1;
  const mesinOpts = Object.keys(opts).sort((a, b) => a.localeCompare(b, "id"));
  mesinSelect.innerHTML = mesinOpts.map((m) => "<option>" + esc(m) + "</option>").join("");
  const qc = document.getElementById("qCat");
  qc.innerHTML = '<option value="">Semua Kategori</option><option value="__low">Hanya Low Stock</option>' +
    SPARE_CATEGORIES.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("");
}

function openModal() { document.getElementById("ovl").classList.add("show"); }
function closeModal() { document.getElementById("ovl").classList.remove("show"); }

function openPartModal(mode, id) {
  editId = mode === "edit" ? id : null;
  document.getElementById("mTitle").textContent = editId ? "Edit Spare Part" : "Tambah Spare Part";
  if (editId) {
    const p = allParts().find((x) => x.id === editId);
    document.getElementById("fKode").value = p.kode;
    document.getElementById("fNama").value = p.nama;
    catSelect.value = p.kategori;
    mesinSelect.value = p.mesin || "Semua Mesin";
    document.getElementById("fQty").value = p.qty;
    document.getElementById("fMin").value = p.minQty;
    document.getElementById("fUnit").value = p.unit || "";
    document.getElementById("fHarga").value = p.harga || "";
    document.getElementById("fLokasi").value = p.lokasi || "";
    document.getElementById("fSupplier").value = p.supplier || "";
    document.getElementById("fNote").value = p.catatan || "";
  } else {
    document.getElementById("fKode").value = nextKode(allParts());
    ["fNama", "fQty", "fMin", "fUnit", "fHarga", "fLokasi", "fSupplier", "fNote"].forEach((i) => document.getElementById(i).value = "");
    catSelect.value = SPARE_CATEGORIES[0];
    mesinSelect.value = MACHINES[0].name;
  }
  openModal();
  document.getElementById("fNama").focus();
}

function savePart() {
  const nama = document.getElementById("fNama").value.trim();
  const qty = parseInt(document.getElementById("fQty").value, 10);
  const minQty = parseInt(document.getElementById("fMin").value, 10);
  const harga = parseFloat(document.getElementById("fHarga").value) || 0;
  if (!nama) return toast("Nama spare part wajib diisi.", true);
  if (isNaN(qty) || isNaN(minQty) || qty < 0 || minQty < 0) return toast("Stok & stok minimum harus angka valid.", true);

  const parts = allParts();
  const data = {
    id: editId || (document.getElementById("fKode").value || nextKode(parts)),
    kode: document.getElementById("fKode").value || nextKode(parts),
    nama: nama,
    kategori: catSelect.value,
    mesin: mesinSelect.value,
    qty: qty,
    minQty: minQty,
    unit: document.getElementById("fUnit").value.trim() || "pcs",
    harga: harga,
    lokasi: document.getElementById("fLokasi").value.trim(),
    supplier: document.getElementById("fSupplier").value.trim(),
    catatan: document.getElementById("fNote").value.trim(),
    updatedAt: new Date().toISOString()
  };

  if (editId) {
    const i = parts.findIndex((x) => x.id === editId);
    parts[i] = { ...parts[i], ...data };
  } else {
    parts.unshift(data);
  }
  saveParts(parts);
  closeModal();
  refreshUi();
  toast(editId ? "Spare part diperbarui." : "Spare part ditambahkan.");
  editId = null;
}

function deletePart(id) {
  if (!confirm("Hapus spare part ini?")) return;
  saveParts(allParts().filter((x) => x.id !== id));
  refreshUi();
  toast("Spare part dihapus.");
}

function openAdjust(id) {
  adjustId = id;
  const p = allParts().find((x) => x.id === id);
  document.getElementById("adjTitle").textContent = "Penyesuaian Stok — " + p.kode;
  document.getElementById("adjSub").textContent = p.nama + " | Stok saat ini: " + p.qty + " " + p.unit;
  document.getElementById("adjQty").value = "";
  document.getElementById("adjNote").value = "";
  document.getElementById("ovlAdjust").classList.add("show");
  document.getElementById("adjQty").focus();
}
function closeAdj() { document.getElementById("ovlAdjust").classList.remove("show"); }

function applyAdjust() {
  const p = allParts().find((x) => x.id === adjustId);
  if (!p) return;
  const v = parseFloat(document.getElementById("adjQty").value);
  const mode = document.getElementById("adjMode").value;
  if (isNaN(v) || v < 0) return toast("Masukkan jumlah yang valid.", true);
  const before = p.qty;
  if (mode === "in") p.qty = nb(p.qty) + v;
  else if (mode === "out") p.qty = Math.max(0, nb(p.qty) - v);
  else p.qty = v;
  p.qty = round2(p.qty);
  p.catatan = [p.catatan, "[" + new Date().toLocaleString("id-ID") + "] " + adjNoteText(mode, before, p.qty)].filter(Boolean).join(" | ");
  p.updatedAt = new Date().toISOString();
  saveParts(allParts().map((x) => x.id === p.id ? p : x));
  closeAdj();
  refreshUi();
  toast("Stok " + p.nama + " diperbarui: " + before + " -> " + p.qty + " " + p.unit);
}

function adjNoteText(mode, before, after) {
  const note = document.getElementById("adjNote").value.trim();
  const tag = mode === "in" ? "BARU MASUK" : mode === "out" ? "PEMAKAIAN" : "SESUAIKAN";
  return tag + " @ " + before + "->" + after + (note ? " — " + note : "");
}

function exportParts() {
  const blob = new Blob([JSON.stringify(allParts(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "spareparts-" + todayStr() + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Data diekspor.");
}

function importParts(ev) {
  const file = ev.target.files[0];
  if (!file) return;
  const rd = new FileReader();
  rd.onload = function () {
    try {
      const data = JSON.parse(rd.result);
      if (!Array.isArray(data)) throw new Error("format");
      const clean = data.map((p) => ({
        id: p.id || genPartId(),
        kode: p.kode || nextKode(data),
        nama: p.nama || "Tanpa Nama",
        kategori: p.kategori || "Lainnya",
        mesin: p.mesin || "",
        qty: nb(p.qty),
        minQty: nb(p.minQty),
        unit: p.unit || "pcs",
        harga: nb(p.harga),
        lokasi: p.lokasi || "",
        supplier: p.supplier || "",
        catatan: p.catatan || "",
        updatedAt: p.updatedAt || new Date().toISOString()
      }));
      saveParts(clean);
      refreshUi();
      toast("Impor berhasil: " + clean.length + " item.");
    } catch (e) { toast("File JSON tidak valid.", true); }
    ev.target.value = "";
  };
  rd.readAsText(file);
}

function refreshUi() {
  renderStats();
  renderAlerts();
  renderParts();
}

fillSelects();
refreshUi();