/* ============================================================
   INSPECTION.JS — form & riwayat pengecekan mesin
   (status OK / Abnormal / Troubleshoot per item)
   ============================================================ */

let inspMachine = null;

function getMachineFromUrl() {
  const id = new URLSearchParams(location.search).get("id");
  return MACHINES.find((m) => m.id === id) || MACHINES[0];
}

function renderTabs() {
  const t = document.getElementById("machineTabs");
  t.innerHTML = MACHINES.map((m) =>
    '<button class="tab-chip' + (m.id === inspMachine.id ? " active" : "") + '" data-id="' + m.id + '">' + esc(m.name) + "</button>"
  ).join("");
  t.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    location.href = "inspection.html?id=" + b.dataset.id;
  }));
}

function renderHead() {
  document.getElementById("mName").textContent = inspMachine.name;
  document.getElementById("mLoc").textContent = MACHINE_TYPES[inspMachine.type].label + " \u2022 " + inspMachine.location;
  const st = machineStatus(inspMachine);
  document.getElementById("mBadge").innerHTML = '<span class="badge ' + st + '"><span class="dot"></span>' + STATUS_META[st].label + "</span>";
}

function statusPill(key, label, cls, checked) {
  return (
    '<label class="chk ' + cls + '">' +
    '<input type="radio" name="chk-' + key + '" value="' + cls + '"' + (checked ? " checked" : "") + ">" +
    '<span class="sw"></span>' + label +
    "</label>"
  );
}

function renderItems() {
  const items = buildInspectionItems(inspMachine);
  const list = document.getElementById("checkList");
  list.className = "check-list";
  list.innerHTML = items.map((it) => {
    const pos = ["ok", "abnormal", "trouble"].indexOf(it.status);
    const selected = pos === -1 ? "ok" : it.status;
    return (
      '<div class="check-item" data-key="' + it.key + '">' +
      '<div class="ci-label">' + esc(it.label) +
      (it.auto !== "ok" ? "<small>Terisi otomatis dari parameter -> " + esc(INSPECT_STATUS[it.auto].label) + "</small>" : "") +
      "</div>" +
      '<div class="radios">' +
      statusPill(it.key, "OK", "ok", selected === "ok") +
      statusPill(it.key, "Abnormal", "ab", selected === "abnormal") +
      statusPill(it.key, "Troubleshoot", "tr", selected === "trouble") +
      "</div>" +
      '<input class="ci-note" data-note="' + it.key + '" placeholder="Catatan..." value="' + esc(it.note || "") + '" />' +
      "</div>"
    );
  }).join("");

  list.querySelectorAll('.chk input[type="radio"]').forEach((r) => r.addEventListener("change", updateSummary));
  list.querySelectorAll(".ci-note").forEach((n) => n.addEventListener("input", updateSummary));
  updateSummary();
}

function updateSummary() {
  const cnt = getFormStatus();
  const el = document.getElementById("sumLive");
  el.innerHTML =
    '<span class="sum-tag ok">' + cnt.ok + " OK</span>" +
    '<span class="sum-tag ab">' + cnt.abnormal + " Abnormal</span>" +
    '<span class="sum-tag tr">' + cnt.trouble + " Troubleshoot</span>" +
    (cnt.trouble ? '<span style="color:var(--red);font-weight:700;font-size:12px">Butuh tindakan segera!</span>' : "");
}

function getFormStatus() {
  let ok = 0, abnormal = 0, trouble = 0;
  document.querySelectorAll('#checkList .check-item').forEach((row) => {
    const sel = row.querySelector('input[type="radio"]:checked');
    const st = sel ? sel.value : "ok";
    if (st === "trouble") trouble++;
    else if (st === "abnormal") abnormal++;
    else ok++;
  });
  return { ok, abnormal, trouble };
}

function readItemStatus() {
  const out = {};
  document.querySelectorAll('#checkList .check-item').forEach((row) => {
    const key = row.dataset.key;
    const sel = row.querySelector('input[type="radio"]:checked');
    const note = row.querySelector(".ci-note");
    out[key] = {
      status: sel ? sel.value : "ok",
      note: note ? note.value.trim() : ""
    };
  });
  return out;
}

function resetForm() {
  document.querySelectorAll('#checkList input[type="radio"][value="ok"]').forEach((r) => { r.checked = true; });
  document.querySelectorAll("#checkList .ci-note").forEach((n) => { n.value = ""; });
  updateSummary();
}

function saveInspection() {
  const cnt = getFormStatus();
  const by = (document.getElementById("inspBy").value || "").trim();
  const inspectData = readItemStatus();
  const all = store.get("inspections", {});
  if (!all[inspMachine.id]) all[inspMachine.id] = [];
  const record = {
    ts: new Date().toISOString(),
    by: by || "Tidak disebutkan",
    items: buildInspectionItems(inspMachine).map((it) => ({
      key: it.key,
      label: it.label,
      status: inspectData[it.key] ? inspectData[it.key].status : it.status,
      note: inspectData[it.key] ? inspectData[it.key].note : ""
    }))
  };
  all[inspMachine.id].unshift(record);
  if (all[inspMachine.id].length > 100) all[inspMachine.id] = all[inspMachine.id].slice(0, 100);
  store.set("inspections", all);

  const logs = store.get("logs", {});
  if (!logs[inspMachine.id]) logs[inspMachine.id] = [];
  logs[inspMachine.id].unshift({
    ts: record.ts,
    text: "Hasil pengecekan: " + cnt.ok + " OK, " + cnt.abnormal + " Abnormal, " + cnt.trouble + " Troubleshoot" + (cnt.trouble ? " — segera tindak lanjuti!" : "")
  });
  store.set("logs", logs);

  if (cnt.trouble && document.getElementById("inspAutoMaint").checked) {
    const flags = store.get("flags", {});
    flags[inspMachine.id] = "maintenance";
    store.set("flags", flags);
  }

  renderHead();
  renderHistory();
  if (cnt.trouble) {
    if (document.getElementById("inspAutoMaint").checked) toast("Pengecekan disimpan. Mesin ditandai MAINTENANCE.");
    else toast("Pengecekan disimpan. Terdapat item Troubleshoot!");
  } else {
    toast("Hasil pengecekan disimpan (" + cnt.ok + " OK, " + cnt.abnormal + " Abnormal).");
  }
}

function renderHistory() {
  const all = store.get("inspections", {});
  const list = all[inspMachine.id] || [];
  const el = document.getElementById("histList");
  if (!list.length) {
    el.innerHTML = '<div class="empty">Belum ada riwayat pengecekan.</div>';
    return;
  }
  el.innerHTML = list.slice(0, 20).map((r, idx) => {
    const cnt = countInspection(r.items);
    const when = new Date(r.ts).toLocaleDateString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) +
      " &middot; " + new Date(r.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    const rows = r.items.map((it) =>
      '<div class="hd-row"><span class="hd-label">' + esc(it.label) + "</span>" +
      '<span class="sum-tag ' + it.status + '" style="font-size:10.5px;padding:2px 8px">' + esc(INSPECT_STATUS[it.status].label) + "</span></div>" +
      (it.note ? '<span class="hd-note">' + esc(it.note) + "</span>" : "")
    ).join("");
    return (
      '<div class="hist-card' + (idx === 0 ? " open" : "") + '">' +
      '<div class="hc-head">' +
      '<div><div style="font-size:12.5px;font-weight:700">' + esc(r.by) + '</div><div class="hc-when">' + when + "</div></div>" +
      '<div style="display:flex;gap:8px"><button class="hc-tgl" onclick="toggleHist(this)">Detail</button>' +
      '<button class="hc-del" onclick="delInspection(' + idx + ')">Hapus</button></div>' +
      "</div>" +
      '<div class="hc-tags">' +
      '<span class="sum-tag ok" style="font-size:10.5px;padding:2px 8px" title="OK">' + cnt.ok + ' <span class="dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#22c55e"></span></span>' +
      '<span class="sum-tag ab" style="font-size:10.5px;padding:2px 8px" title="Abnormal">' + cnt.abnormal + '</span>' +
      '<span class="sum-tag tr" style="font-size:10.5px;padding:2px 8px" title="Troubleshoot">' + cnt.trouble + "</span>" +
      "</div>" +
      '<div class="hc-detail">' + rows + "</div>" +
      "</div>"
    );
  }).join("");
}

function toggleHist(btn) {
  btn.closest(".hist-card").classList.toggle("open");
  btn.textContent = btn.closest(".hist-card").classList.contains("open") ? "Tutup" : "Detail";
}

function delInspection(idx) {
  if (!confirm("Hapus catatan pengecekan ini?")) return;
  const all = store.get("inspections", {});
  all[inspMachine.id].splice(idx, 1);
  if (!all[inspMachine.id].length) delete all[inspMachine.id];
  store.set("inspections", all);
  renderHead();
  renderHistory();
  toast("Catatan pengecekan dihapus.");
}

seedInspections();
inspMachine = getMachineFromUrl();
renderTabs();
renderHead();
renderItems();
renderHistory();