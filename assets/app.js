/* ============================================================
   APP.JS — Utilitas bersama, penyimpanan, status, chart
   ============================================================ */

/* --- helpers --- */
function round2(n) { return Math.round(n * 100) / 100; }
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function daysAgo(i) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - i);
  return d;
}
function todayStr() {
  const d = new Date();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const dd = ("0" + d.getDate()).slice(-2);
  return d.getFullYear() + "-" + m + "-" + dd;
}
function currentHour() { return new Date().getHours(); }
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function nb(n) { return n == null ? 0 : Number(n); }
function money(n) {
  return "Rp " + nb(n).toLocaleString("id-ID");
}

/* --- localStorage --- */
const store = {
  get: function (key, fallback) {
    try {
      const v = localStorage.getItem("smm_" + key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  },
  set: function (key, val) {
    try { localStorage.setItem("smm_" + key, JSON.stringify(val)); } catch (e) {}
  }
};

/* --- status --- */
const STATUS_META = {
  normal:      { label: "Operasi Normal", color: "#22c55e" },
  warning:     { label: "Perlu Perhatian", color: "#f59e0b" },
  alert:       { label: "ALERT", color: "#ef4444" },
  maintenance: { label: "Maintenance", color: "#3b82f6" },
  standby:     { label: "Standby", color: "#64748b" }
};

/* --- chart tema global --- */
Chart.defaults.color = "#8ea3bf";
Chart.defaults.borderColor = "rgba(142,163,191,.08)";
Chart.defaults.font.family = "Segoe UI, system-ui, sans-serif";
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.padding = 14;
Chart.defaults.plugins.tooltip.backgroundColor = "#16233f";
Chart.defaults.plugins.tooltip.borderColor = "#2a3b63";
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.titleColor = "#e2e8f0";
Chart.defaults.plugins.tooltip.bodyColor = "#c3d2e8";

function linha(color) { return "rgba(" + hexToRgb(color) + ",1)"; }
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255);
}

function mkChart(ctx, cfg) {
  const c = cfg;
  c.options = c.options || {};
  c.options.responsive = true;
  c.options.maintainAspectRatio = false;
  if (c.options.scales) {
    c.options.scales.x = c.options.scales.x || {};
    c.options.scales.y = c.options.scales.y || {};
    c.options.scales.x.grid = { color: "rgba(142,163,191,.07)" };
    c.options.scales.y.grid = { color: "rgba(142,163,191,.07)" };
    c.options.scales.y.ticks = { color: "#8ea3bf" };
    c.options.scales.x.ticks = { color: "#8ea3bf" };
  }
  return new Chart(ctx, c);
}

function fillArea(bg) { return { fill: true, backgroundColor: "rgba(" + hexToRgb(bg) + ",.16)", borderColor: bg, tension: 0.4, pointRadius: 3, pointHoverRadius: 5 }; }

/* --- sparkline mini tanpa chart.js --- */
function drawSpark(canvas, values, color) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  if (!values || values.length < 2) return;
  const min = Math.min(...values), max = Math.max(...values);
  const pad = 3;
  const span = (max - min) || 1;
  const xs = values.map((_, i) => pad + (i / (values.length - 1)) * (w - pad * 2));
  const ys = values.map(v => h - pad - ((v - min) / span) * (h - pad * 2));
  ctx.beginPath();
  xs.forEach((x, i) => i === 0 ? ctx.moveTo(x, ys[i]) : ctx.lineTo(x, ys[i]));
  ctx.strokeStyle = color || "#38bdf8";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.lineTo(xs[xs.length - 1], h);
  ctx.lineTo(xs[0], h);
  ctx.closePath();
  ctx.fillStyle = color ? "rgba(" + hexToRgb(color) + ",.12)" : "rgba(56,189,248,.12)";
  ctx.fill();
}

/* --- toast --- */
function toast(msg, isErr) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " error" : "");
  setTimeout(() => { t.className = "toast"; }, 3200);
}

/* --- date/time short --- */
function tsShort(iso) {
  const d = new Date(iso);
  return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
}