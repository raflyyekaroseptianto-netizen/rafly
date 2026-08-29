/* ============================================================
   DASHBOARD.JS — render dashboard index.html
   ============================================================ */

const dref = { statusChart: null, perfChart: null };

document.getElementById("dt").textContent =
  new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

function badgeHtml(machine) {
  const st = machineStatus(machine);
  const meta = STATUS_META[st];
  return '<span class="badge ' + st + '"><span class="dot"></span>' + meta.label + "</span>";
}

function renderStats() {
  const alerts = MACHINES.filter((m) => machineStatus(m) === "alert").length;
  const maint = MACHINES.filter((m) => machineStatus(m) === "maintenance").length;
  const ops = MACHINES.length - alerts - maint;
  const parts = allParts();
  const low = parts.filter(isLowStock).length;
  const row = document.getElementById("statsRow");
  row.innerHTML =
    statCard("Total Mesin", MACHINES.length, "", "blue", "10 unit terdaftar") +
    statCard("Operasi Normal", ops, "", ops > 0 ? "green" : "slate", "termasuk standby") +
    statCard("Maintenance", maint, "", maint ? "blue" : "slate", "sedang perbaikan") +
    statCard("Alert", alerts, "", alerts ? "red" : "green", alerts ? "perlu tindakan" : "semua aman") +
    statCard("Total Stok", partTotalStock(), "pcs", "blue", parts.length + " item spare part") +
    statCard("Low Stock", low, "", low ? "red" : "green", "stok di bawah minimum");
}

function statCard(lbl, val, unit, cls, sub) {
  return (
    '<div class="card stat">' +
    '<span class="lbl">' + esc(lbl) + "</span>" +
    '<span class="val ' + cls + '">' + esc(val) + " " + (unit ? '<span style="font-size:12px">' + esc(unit) + "</span>" : "") + "</span>" +
    '<span class="sub">' + esc(sub) + "</span>" +
    "</div>"
  );
}

function renderAlerts() {
  const alerts = MACHINES.filter((m) => machineStatus(m) === "alert");
  const notif = document.getElementById("alertBanner");
  if (!alerts.length) {
    notif.innerHTML = "";
    return;
  }
  notif.innerHTML =
    '<div class="alert-banner">&#9888; ' + alerts.length + " mesin dalam status ALERT: " +
    alerts.map((a) => a.name).join(", ") + " &mdash; segera tindak lanjuti.</div>";
}

function renderMachines() {
  const grid = document.getElementById("coGrid");
  grid.innerHTML = MACHINES.map((m) => {
    const pp = primaryParam(m);
    const val = currentParam(m, pp);
    const st = machineStatus(m);
    return (
      '<a class="card mcard" href="machines.html?id=' + m.id + '">' +
      '<div class="top">' +
      '<div><div class="mname">' + esc(m.name) + '</div><div class="mloc">' + esc(m.location) + "</div></div>" +
      badgeHtml(m) +
      "</div>" +
      '<div class="metric">' +
      '<span class="lbl">' + esc(pp.label) + "</span>" +
      '<span class="val">' + val + '<span style="font-size:11px;color:var(--muted)">&nbsp;' + esc(pp.unit) + "</span></span>" +
      "</div>" +
      '<canvas class="spark" data-c="' + (STA_COLOR[st] || "#38bdf8") + '"></canvas>' +
      "</a>"
    );
  }).join("");

  requestAnimationFrame(function () {
    grid.querySelectorAll("canvas.spark").forEach((cv, i) => {
      const m = MACHINES[i];
      const pp = primaryParam(m);
      const trend = genSeri(pp, m.id, 14).map((x) => x.value);
      drawSpark(cv, trend, cv.dataset.c);
    });
  });
}

const STA_COLOR = { normal: "#22c55e", warning: "#f59e0b", alert: "#ef4444", maintenance: "#3b82f6", standby: "#64748b" };

function renderStatusChart() {
  const counts = { normal: 0, warning: 0, alert: 0, maintenance: 0, standby: 0 };
  MACHINES.forEach((m) => { counts[machineStatus(m)] += 1; });
  const labels = Object.keys(counts);
  dref.statusChart = mkChart(document.getElementById("statusChart"), {
    type: "doughnut",
    data: {
      labels: labels.map((k) => STATUS_META[k].label),
      datasets: [{
        data: labels.map((k) => counts[k]),
        backgroundColor: labels.map((k) => STATUS_META[k].color),
        borderColor: "#0f172a",
        borderWidth: 3,
        hoverOffset: 6
      }]
    },
    options: {
      cutout: "62%",
      plugins: { legend: { position: "bottom" } }
    }
  });
}

function renderPerfChart() {
  const chillers = MACHINES.filter((m) => m.type === "chiller");
  const pp = primaryParam(chillers[0]);
  const hari = 14;
  const labels = [], avg = [];
  const series = chillers.map((m) => genSeri(pp, m.id, hari));
  for (let i = 0; i < hari; i++) {
    labels.push(daysAgo(hari - 1 - i).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }));
    avg.push(round2(series.reduce((a, s) => a + s[i].value, 0) / series.length));
  }
  dref.perfChart = mkChart(document.getElementById("perfChart"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Rata-rata Chiller 1-4", data: avg, ...fillArea("#38bdf8") },
        { label: "Batas bawah (4°C)", data: labels.map(() => pp.min), borderColor: "rgba(239,68,68,.5)", borderDash: [6, 5], backgroundColor: "transparent", tension: 0, pointRadius: 0, fill: false },
        { label: "Batas atas (12°C)", data: labels.map(() => pp.max), borderColor: "rgba(239,68,68,.5)", borderDash: [6, 5], backgroundColor: "transparent", tension: 0, pointRadius: 0, fill: false }
      ]
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      scales: { y: { min: 0, max: 16 }, x: {} }
    }
  });
}

function renderSkemaTable() {
  const rows = MACHINES.map((m) => {
    const type = MACHINE_TYPES[m.type];
    const main = type.params.slice(0, 3).map((p) => {
      const v = currentParam(m, p);
      return esc(p.label) + ": <b>" + v + " " + esc(p.unit) + "</b>";
    }).join(" &nbsp;&bull;&nbsp; ");
    return "<tr><td><b>" + esc(m.name) + "</b><br/><span style='color:var(--muted);font-size:11px'>" + esc(m.location) + "</span></td>" +
      "<td>" + esc(type.label) + "</td>" +
      "<td>" + badgeHtml(m) + "</td>" +
      "<td style='font-size:12px'>" + main + "</td></tr>";
  }).join("");
  document.getElementById("tblSkema").innerHTML =
    "<thead><tr><th>Mesin</th><th>Tipe</th><th>Status</th><th>Parameter Utama</th></tr></thead><tbody>" + rows + "</tbody>";
}

function renderLowStock() {
  const low = allParts().filter(isLowStock);
  const tb = document.getElementById("tblLow");
  if (!low.length) {
    tb.innerHTML = '<tbody><tr><td class="empty" colspan="4">Tidak ada spare part di bawah stok minimum.</td></tr></tbody>';
    return;
  }
  tb.innerHTML =
    "<thead><tr><th>Kode</th><th>Item</th><th>Stok</th><th>Min</th></tr></thead><tbody>" +
    low.map((p) =>
      "<tr class='row-low'><td><b>" + esc(p.kode) + "</b></td><td>" + esc(p.nama) + "<br/><span style='color:var(--muted);font-size:11px'>" + esc(p.mesin) + "</span></td>" +
      "<td><span class='badge alert'>" + p.qty + " " + esc(p.unit || "pcs") + "</span></td><td>" + p.minQty + "</td></tr>"
    ).join("") + "</tbody>";
}

function loadAll() {
  renderStats();
  renderAlerts();
  renderMachines();
  renderStatusChart();
  renderPerfChart();
  renderSkemaTable();
  renderLowStock();
}

loadAll();

window.addEventListener("resize", function () {
  ["statusChart", "perfChart"].forEach((id) => { const c = dref[id]; if (c) c.resize(); });
});