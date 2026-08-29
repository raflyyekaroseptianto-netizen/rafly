/* ============================================================
   PM.JS — jadwal preventive maintenance (1/3/6/12 bulan)
   ============================================================ */

let activeInterval = null;
let doneMachine = null, doneTask = null;

function renderStats() {
  const s = pmSummary();
  const el = document.getElementById("statsRow");
  el.innerHTML =
    statCard3("Total Tugas PM", s.total, "", "blue", "tiap mesin") +
    statCard3("Overdue", s.overdue, "", s.overdue ? "red" : "green", "lewati jadwal") +
    statCard3("Jatuh Tempo", s.due, "", s.due ? "amber" : "green", "dalam " + "" + "14 hari ke depan") +
    statCard3("Terjadwal", s.ok, "", "green", "jadwal aman");
}

function statCard3(lbl, val, unit, cls, sub) {
  return (
    '<div class="card stat"><span class="lbl">' + esc(lbl) + '</span>' +
    '<span class="val ' + cls + '">' + esc(val) + (unit ? ' <span style="font-size:12px">' + esc(unit) + "</span>" : "") + "</span>" +
    '<span class="sub">' + esc(sub) + "</span></div>"
  );
}

function findTask(machine, taskId) {
  return buildPmList(machine).find((t) => t.id === taskId);
}

function renderFilters() {
  const ms = document.getElementById("qMachine");
  ms.innerHTML = '<option value="">Semua Mesin</option>' +
    MACHINES.map((m) => '<option value="' + m.id + '">' + esc(m.name) + "</option>").join("");
  const chips = document.getElementById("intervalChips");
  chips.innerHTML =
    '<button class="tab-chip active" data-val="">Semua Interval</button>' +
    PM_INTERVALS.map((x) => '<button class="tab-chip" data-val="' + x.val + '">' + esc(x.label) + "</button>").join("");
  chips.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => {
    chips.querySelectorAll("button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    activeInterval = b.dataset.val ? Number(b.dataset.val) : null;
    renderTable();
  }));
}

function collectRows() {
  const q = (document.getElementById("qSearch").value || "").toLowerCase().trim();
  const mid = document.getElementById("qMachine").value;
  const st = document.getElementById("qStatus").value;
  const rows = [];
  MACHINES.forEach((m) => {
    buildPmList(m).forEach((t) => {
      const info = pmTaskInfo(m, t);
      rows.push({ m, t, info });
    });
  });
  return rows.filter((r) => {
    if (activeInterval && r.t.interval !== activeInterval) return false;
    if (mid && r.m.id !== mid) return false;
    if (st && r.info.status !== st) return false;
    if (q && !(r.t.label + " " + r.m.name + " " + r.m.type).toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => {
    const ad = a.info.nextDue ? a.info.nextDue : "0";
    const bd = b.info.nextDue ? b.info.nextDue : "0";
    return String(ad).localeCompare(String(bd));
  });
}

const PM_STATUS_META = {
  overdue: { label: "Overdue", color: "#ef4444", cls: "alert" },
  due:     { label: "Jatuh Tempo", color: "#f59e0b", cls: "warning" },
  ok:      { label: "Terjadwal", color: "#22c55e", cls: "normal" }
};

function intervalLabel(iv) {
  const f = PM_INTERVALS.find((x) => x.val === iv);
  return f ? f.shot : iv + " bln";
}

function renderTable() {
  const rows = collectRows();
  const tb = document.getElementById("tblPm");
  const th = "<thead><tr><th>Mesin</th><th>Interval</th><th>Tugas PM</th><th>Terakhir Selesai</th><th>Jatuh Tempo</th><th>Status</th><th>Aksi</th></tr></thead>";
  if (!rows.length) {
    tb.innerHTML = th + '<tbody><tr><td colspan="7" class="empty">Tidak ada tugas PM ditemukan.</td></tr></tbody>';
    return;
  }
  const now = Date.now();
  tb.innerHTML = th + "<tbody>" + rows.map((r) => {
    const i = r.info;
    const meta = PM_STATUS_META[i.status];
    const last = i.lastDone ? new Date(i.lastDone).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Belum pernah";
    const due = i.nextDue ? new Date(i.nextDue).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "Segera";
    const daysTxt = i.daysLeft === null ? "" : (i.daysLeft < 0 ? "(" + Math.abs(i.daysLeft) + " hari lalu)" : "(" + i.daysLeft + " hari lagi)");
    const late = i.status === "overdue" && i.daysLeft !== null && Math.abs(i.daysLeft) > (i.interval * 30);
    return (
      "<tr" + (i.status === "overdue" ? " class='row-low'" : "") + ">" +
      "<td><b>" + esc(r.m.name) + "</b><br/><span style='color:var(--muted);font-size:11px'>" + esc(MACHINE_TYPES[r.m.type].label) + "</span></td>" +
      "<td><span class='badge standby'>" + intervalLabel(r.t.interval) + "</span></td>" +
      "<td>" + esc(r.t.label) + (late ? "<br/><span style='color:var(--red);font-size:11px'>&#9888; melewati siklus</span>" : "") + "</td>" +
      "<td>" + last + "</td>" +
      "<td>" + due + "<br/><span style='color:var(--muted);font-size:11px'>" + daysTxt + "</span></td>" +
      '<td><span class="badge ' + meta.cls + '"><span class="dot"></span>' + meta.label + "</span></td>" +
      '<td><div class="actions-row" style="flex-wrap:wrap">' +
      '<button class="btn sm primary" onclick="openDone(\'' + r.m.id + '\',\'' + r.t.id + '\')">Selesai</button>' +
      '<button class="btn sm" onclick="openHist(\'' + r.m.id + '\',\'' + r.t.id + '\')">Riwayat</button>' +
      "</div></td></tr>"
    );
  }).join("") + "</tbody>";
}

function openDone(machineId, taskId) {
  const m = MACHINES.find((x) => x.id === machineId);
  const t = findTask(m, taskId);
  doneMachine = m;
  doneTask = t;
  document.getElementById("dnTitle").textContent = "Tandai Selesai — " + m.name;
  document.getElementById("dnSub").textContent = t.label + " (interval " + intervalLabel(t.interval) + ")";
  document.getElementById("dnBy").value = store.get("pmuser", "");
  document.getElementById("dnNote").value = "";
  document.getElementById("ovlDone").classList.add("show");
  document.getElementById("dnBy").focus();
}
function closeDone() { document.getElementById("ovlDone").classList.remove("show"); }

function confirmDone() {
  const by = document.getElementById("dnBy").value.trim();
  const note = document.getElementById("dnNote").value.trim();
  markPmDone(doneMachine, doneTask, by, note);
  store.set("pmuser", by);
  const logs = store.get("logs", {});
  if (!logs[doneMachine.id]) logs[doneMachine.id] = [];
  logs[doneMachine.id].unshift({ ts: new Date().toISOString(), text: "PM selesai: [" + intervalLabel(doneTask.interval) + "] " + doneTask.label + (note ? " — " + note : "") });
  store.set("logs", logs);
  closeDone();
  renderStats();
  renderTable();
  toast("PM ditandai selesai. Jadwal berikutnya dihitung ulang.");
}

function openHist(machineId, taskId) {
  const m = MACHINES.find((x) => x.id === machineId);
  const t = findTask(m, taskId);
  const info = pmTaskInfo(m, t);
  document.getElementById("htTitle").textContent = "Riwayat PM — " + m.name;
  document.getElementById("htSub").textContent = t.label;
  const el = document.getElementById("htList");
  if (!info.log.length) {
    el.innerHTML = '<div class="empty">Belum ada riwayat penyelesaian.</div>';
  } else {
    el.innerHTML = info.log.map((l) =>
      '<div class="log-item"><span class="when">' + tsShort(l.ts) + "</span><span><b>" + esc(l.by) + "</b>" + (l.note ? " — " + esc(l.note) : "") + "</span></div>"
    ).join("");
  }
  document.getElementById("ovlHist").classList.add("show");
}
function closeHist() { document.getElementById("ovlHist").classList.remove("show"); }

seedPm();
renderStats();
renderFilters();
renderTable();