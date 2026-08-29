/* ============================================================
   MACHINES.JS — halaman detail mesin + grafik analisis
   ============================================================ */

let machine = null;
let charts = { trend: null, hour: null, health: null };

function getMachineFromUrl() {
  const id = new URLSearchParams(location.search).get("id");
  return MACHINES.find((m) => m.id === id) || MACHINES[0];
}

function isOob(p, v) {
  const range = Math.max(p.max - p.min, 1);
  const oob = Math.abs(v - p.base) / range;
  return { oob, level: oob > 0.55 ? "bad" : oob > 0.35 ? "warn" : "ok" };
}

function addLog(text) {
  const logs = store.get("logs", {});
  if (!logs[machine.id]) logs[machine.id] = [];
  logs[machine.id].unshift({ ts: new Date().toISOString(), text });
  if (logs[machine.id].length > 60) logs[machine.id] = logs[machine.id].slice(0, 60);
  store.set("logs", logs);
}

function machineLogs() {
  const logs = store.get("logs", {});
  return logs[machine.id] || [];
}

function renderTabs() {
  const t = document.getElementById("machineTabs");
  t.innerHTML = MACHINES.map((m) =>
    '<button class="tab-chip' + (m.id === machine.id ? " active" : "") + '" data-id="' + m.id + '">' + esc(m.name) + "</button>"
  ).join("");
  t.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    location.href = "machines.html?id=" + b.dataset.id;
  }));
}

function renderHead() {
  document.getElementById("mName").textContent = machine.name;
  document.getElementById("mLoc").textContent = MACHINE_TYPES[machine.type].label + " \u2022 " + machine.location;
  document.getElementById("mBadge").innerHTML = badge(machine);
  const btn = document.getElementById("btnMaint");
  const flags = store.get("flags", {});
  btn.textContent = flags[machine.id] === "maintenance" ? "Selesai Maintenance" : "Tandai Maintenance";
  btn.classList.toggle("danger", flags[machine.id] === "maintenance");
  const st = machineStatus(machine);
  document.getElementById("alertBanner").innerHTML = st === "alert"
    ? '<div class="alert-banner">&#9888; Ditemukan parameter di luar toleransi pada ' + esc(machine.name) + " — segera lakukan tindakan.</div>"
    : "";
}

function badge(m) {
  const st = machineStatus(m);
  return '<span class="badge ' + st + '"><span class="dot"></span>' + STATUS_META[st].label + "</span>";
}

function renderParams() {
  const type = MACHINE_TYPES[machine.type];
  document.getElementById("paramGrid").innerHTML = type.params.map((p) => {
    const v = currentParam(machine, p);
    const lv = isOob(p, v);
    return (
      '<div class="param ' + lv.level + '">' +
      '<div class="pl">' + esc(p.label) + "</div>" +
      '<div class="pv">' + v + '<span class="pu">' + esc(p.unit) + "</span></div>" +
      "</div>"
    );
  }).join("");

  const sel = document.getElementById("selParam");
  sel.innerHTML = type.params.map((p) =>
    '<option value="' + p.key + '"' + (p.key === type.primary ? " selected" : "") + ">" + esc(p.label) + "</option>"
  ).join("");
}

function renderLog() {
  const list = machineLogs();
  const el = document.getElementById("logList");
  if (!list.length) {
    el.innerHTML = '<div class="empty">Belum ada pembacaan/log.</div>';
    return;
  }
  el.innerHTML = list.slice(0, 12).map((l) =>
    '<div class="log-item"><span class="when">' + tsShort(l.ts) + "</span><span>" + esc(l.text) + "</span></div>"
  ).join("");
}

function renderInspection() {
  const insp = latestInspection(machine);
  const el = document.getElementById("inspCard");
  if (!el) return;
  if (!insp) {
    el.innerHTML = '<span class="sub">Belum ada catatan pengecekan.</span>';
    return;
  }
  const when = new Date(insp.rec.ts).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) + " " +
    new Date(insp.rec.ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const days = Math.max(0, Math.ceil(insp.ageDays));
  el.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
    '<span class="badge ' + (insp.hasTrouble ? "alert" : insp.hasAbnormal ? "warning" : "normal") + '"><span class="dot"></span>' +
    (insp.hasTrouble ? "Butuh tindakan" : insp.hasAbnormal ? "Perlu perhatian" : "Semua OK") + "</span>" +
    '<span style="color:var(--muted);font-size:12px">' + esc(insp.rec.by) + " &middot; " + when + " &middot; " +
    insp.ok + " OK / " + insp.abnormal + " Abnormal / " + insp.trouble + " Trouble" +
    (days > 0 ? " &middot; " + days + " hari lalu" : " &middot; hari ini") + "</span>" +
    '<a class="btn sm" style="margin-left:auto" href="inspection.html?id=' + machine.id + '">Buka Form Pengecekan</a>' +
    "</div>";
}

function scoreHealth() {
  const type = MACHINE_TYPES[machine.type];
  let ok = 0, warn = 0, bad = 0;
  type.params.forEach((p) => {
    const lv = isOob(p, currentParam(machine, p));
    if (lv.level === "ok") ok++;
    else if (lv.level === "warn") warn++;
    else bad++;
  });
  return { ok, warn, bad, pct: type.params.length ? Math.round((ok / type.params.length) * 100) : 0 };
}

function renderTrendChart() {
  const type = MACHINE_TYPES[machine.type];
  const key = document.getElementById("selParam").value;
  const p = type.params.find((x) => x.key === key) || type.params[0];
  const seri = genSeri(p, machine.id, 14);
  toolsChart(charts.trend, "chTrend");
  charts.trend = mkChart(document.getElementById("chTrend"), {
    type: "line",
    data: {
      labels: seri.map((x) => x.date.slice(8, 10) + "/" + x.date.slice(5, 7)),
      datasets: [
        { label: esc(p.label) + " (" + esc(p.unit) + ")", data: seri.map((x) => x.value), ...fillArea("#38bdf8") },
        { label: "Batas min " + p.min, data: seri.map(() => p.min), borderColor: "rgba(239,68,68,.45)", borderDash: [6, 5], backgroundColor: "transparent", tension: 0, pointRadius: 0, fill: false },
        { label: "Batas max " + p.max, data: seri.map(() => p.max), borderColor: "rgba(239,68,68,.45)", borderDash: [6, 5], backgroundColor: "transparent", tension: 0, pointRadius: 0, fill: false },
        { label: "Target " + p.base, data: seri.map(() => p.base), borderColor: "rgba(34,197,94,.5)", borderDash: [4, 4], backgroundColor: "transparent", tension: 0, pointRadius: 0, fill: false }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { filter: (item) => item.text.indexOf("Target") === -1 && item.text.indexOf("Batas") === -1 } } },
      scales: { x: {}, y: { min: Math.max(0, p.min - 2), max: p.max + 2 } }
    }
  });
}

function renderHourChart() {
  const pp = primaryParam(machine);
  const seri = genJam(pp, machine.id, 24);
  toolsChart(charts.hour, "chHour");
  const okData = seri.map((x) => isOob(pp, x.value).level !== "bad" ? x.value : null);
  const badData = seri.map((x) => isOob(pp, x.value).level === "bad" ? x.value : null);
  charts.hour = mkChart(document.getElementById("chHour"), {
    type: "bar",
    data: {
      labels: seri.map((x) => x.hour),
      datasets: [
        { label: "Normal / aman", data: okData, backgroundColor: "rgba(34,197,94,.55)", borderRadius: 4, stack: "s" },
        { label: "Di luar batas", data: badData, backgroundColor: "rgba(239,68,68,.7)", borderRadius: 4, stack: "s" }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { x: { title: { display: true, text: "Jam", color: "#8ea3bf" } }, y: { title: { display: true, text: esc(pp.label) + " (" + esc(pp.unit) + ")", color: "#8ea3bf" } } }
    }
  });
}

function renderHealthChart() {
  const h = scoreHealth();
  toolsChart(charts.health, "chHealth");
  charts.health = mkChart(document.getElementById("chHealth"), {
    type: "doughnut",
    data: {
      labels: ["Normal", "Perlu Perhatian", "Kritis"],
      datasets: [{
        data: [h.ok, h.warn, h.bad],
        backgroundColor: ["#22c55e", "#f59e0b", "#ef4444"],
        borderColor: "#0f172a",
        borderWidth: 3,
        hoverOffset: 5
      }]
    },
    options: {
      cutout: "68%",
      plugins: {
        legend: { position: "bottom" },
        centerText: { value: h.pct }
      }
    }
  });
  charts.health.config.options.plugins.centerText.value = h.pct;
}

const centerTextPlugin = {
  id: "centerText",
  afterDatasetsDraw(chart) {
    const meta = chart.getDatasetMeta(0);
    if (!meta.data || !meta.data[0]) return;
    const x = meta.data[0].x;
    const y = meta.data[0].y;
    const val = chart.config.options.plugins.centerText.value;
    const { ctx } = chart;
    ctx.save();
    ctx.font = "800 28px Segoe UI";
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(val + "%", x, y - 2);
    ctx.font = "12px Segoe UI";
    ctx.fillStyle = "#8ea3bf";
    ctx.fillText("sehat", x, y + 20);
    ctx.restore();
  }
};
Chart.register(centerTextPlugin);

function toolsChart(chart, id) {
  if (chart) { chart.destroy(); chart = null; }
  const cv = document.getElementById(id);
  if (cv && cv.getContext) cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
}

function renderCharts() {
  renderTrendChart();
  renderHourChart();
  renderHealthChart();
}

function loadMachine() {
  seedInspections();
  renderTabs();
  renderHead();
  renderParams();
  renderInspection();
  renderLog();
  renderCharts();
}

/* --- maintenance toggle --- */
function toggleMaint() {
  const flags = store.get("flags", {});
  if (flags[machine.id] === "maintenance") {
    delete flags[machine.id];
    addLog("Maintenance selesai — mesin kembali beroperasi.");
    toast("Status maintenance dicabut.");
  } else {
    flags[machine.id] = "maintenance";
    addLog("Mesin ditandai MAINTENANCE.");
    toast("Mesin ditandai maintenance.");
  }
  store.set("flags", flags);
  renderHead();
}

/* --- pembacaan manual --- */
function openReadModal() {
  const type = MACHINE_TYPES[machine.type];
  document.getElementById("rdTitle").textContent = "Pembacaan Manual — " + machine.name;
  document.getElementById("readGrid").innerHTML = type.params.map((p, i) => {
    const v = currentParam(machine, p);
    return (
      '<div class="field param" style="gap:6px">' +
      '<label>' + esc(p.label) + ' (' + esc(p.unit) + ')</label>' +
      '<input type="number" step="any" data-k="' + p.key + '" value="' + v + '" style="background:var(--panel)" />' +
      "</div>"
    );
  }).join("");
  document.getElementById("rdNote").value = "";
  document.getElementById("ovlRead").classList.add("show");
}
function closeRead() { document.getElementById("ovlRead").classList.remove("show"); }

function saveReading() {
  const readings = store.get("readings", {});
  if (!readings[machine.id]) readings[machine.id] = [];
  const values = {};
  document.querySelectorAll("#readGrid input").forEach((inp) => {
    const v = parseFloat(inp.value);
    values[inp.dataset.k] = isNaN(v) ? 0 : round2(v);
  });
  const note = document.getElementById("rdNote").value.trim();
  readings[machine.id].push({ ts: new Date().toISOString(), values, note });
  if (readings[machine.id].length > 200) readings[machine.id] = readings[machine.id].slice(-200);
  store.set("readings", readings);
  addLog("Pembacaan manual disimpan." + (note ? " — " + note : ""));
  closeRead();
  renderHead();
  renderParams();
  renderLog();
  renderCharts();
  toast("Pembacaan manual disimpan.");
}

function goBack() {
  if (history.length > 1) history.back();
  else location.href = "index.html";
}

window.addEventListener("resize", function () { Object.keys(charts).forEach((k) => { if (charts[k]) charts[k].resize(); }); });

machine = getMachineFromUrl();
loadMachine();