/* ============================================================
   DATA MESIN & GENERATOR DATA DEMO (simulasi)
   Catatan: Data di bawah adalah data simulasi/demo sehingga
   dashboard bisa langsung terlihat hidup. Untuk data asli, bisa
   diganti dengan API / sensor / form pembacaan manual.
   ============================================================ */

window.MACHINE_TYPES = {
  chiller: {
    label: "Chiller",
    primary: "evo_temp",
    params: [
      { key: "evo_temp",     label: "Temp Evaporator",  unit: "°C",     base: 7,   min: 4,  max: 12 },
      { key: "cond_temp",    label: "Temp Condenser",   unit: "°C",     base: 34,  min: 25, max: 40 },
      { key: "ref_press",    label: "Tek. Refrigerant", unit: "bar",    base: 8,   min: 6,  max: 12 },
      { key: "comp_current", label: "Arus Kompresor",   unit: "A",      base: 55,  min: 30, max: 80 },
      { key: "runtime",      label: "Jam Operasi",      unit: "jam",    base: 16,  min: 0,  max: 24 }
    ]
  },
  ahu: {
    label: "AHU",
    primary: "supply_temp",
    params: [
      { key: "supply_temp", label: "Temp Supply",   unit: "°C",   base: 18,  min: 14, max: 22 },
      { key: "return_temp", label: "Temp Return",   unit: "°C",   base: 26,  min: 22, max: 30 },
      { key: "humidity",    label: "Kelembapan",    unit: "%",    base: 55,  min: 40, max: 65 },
      { key: "fan_rpm",     label: "Kipas / RPM",   unit: "RPM",  base: 1450,min: 800,max: 1750 },
      { key: "filter_dp",   label: "Filter AP",     unit: "Pa",   base: 120, min: 50, max: 250 }
    ]
  },
  pw: {
    label: "PW (Purified Water)",
    primary: "conductivity",
    params: [
      { key: "temp",         label: "Suhu Air",        unit: "°C",        base: 25,  min: 20, max: 30 },
      { key: "conductivity", label: "Konduktivitas",   unit: "µS/cm",     base: 1.2, min: 0.5, max: 2.5 },
      { key: "flow",         label: "Laju Alir",       unit: "m³/h",      base: 5,   min: 3,  max: 8 },
      { key: "pressure",     label: "Tekanan",         unit: "bar",       base: 4,   min: 3,  max: 6 }
    ]
  },
  wfi: {
    label: "WFI (Water for Injection)",
    primary: "conductivity",
    params: [
      { key: "temp",         label: "Suhu Air",      unit: "°C",    base: 85,  min: 80, max: 90 },
      { key: "conductivity", label: "Konduktivitas", unit: "µS/cm", base: 0.8, min: 0.3, max: 1.3 },
      { key: "flow",         label: "Laju Alir",     unit: "m³/h",  base: 3,   min: 2,  max: 6 },
      { key: "toc",          label: "TOC",           unit: "ppb",   base: 120, min: 0,  max: 500 },
      { key: "pressure",     label: "Tekanan",       unit: "bar",   base: 5,   min: 3.5,max: 6.5 }
    ]
  },
  boiler: {
    label: "Boiler",
    primary: "steam_press",
    params: [
      { key: "steam_temp",  label: "Temp Steam",    unit: "°C",  base: 175, min: 150, max: 190 },
      { key: "steam_press", label: "Tek. Steam",    unit: "bar", base: 8,   min: 6,   max: 10 },
      { key: "water_level", label: "Level Air",     unit: "%",   base: 50,  min: 20,  max: 80 },
      { key: "fuel_press",  label: "Tek. Bahan Bakar", unit: "bar", base: 2.5, min: 1.5, max: 4 },
      { key: "flue_temp",   label: "Temp Gas Buang",  unit: "°C", base: 220, min: 150, max: 280 }
    ]
  }
};

window.MACHINES = [
  { id: "chiller-1", type: "chiller", name: "Chiller 1", location: "Ruang Mesin Utama" },
  { id: "chiller-2", type: "chiller", name: "Chiller 2", location: "Ruang Mesin Utama" },
  { id: "chiller-3", type: "chiller", name: "Chiller 3", location: "Ruang Mesin Utama" },
  { id: "chiller-4", type: "chiller", name: "Chiller 4", location: "Ruang Mesin Cadangan" },
  { id: "ahu-1",     type: "ahu",     name: "AHU 1",     location: "Lantai 1 Area Produksi" },
  { id: "ahu-2",     type: "ahu",     name: "AHU 2",     location: "Lantai 2 Area Produksi" },
  { id: "ahu-3",     type: "ahu",     name: "AHU 3",     location: "Ruang Steril / Lab" },
  { id: "pw",        type: "pw",      name: "PW",        location: "Ruang Water Treatment" },
  { id: "wfi",       type: "wfi",     name: "WFI",       location: "Ruang Distillasi" },
  { id: "boiler",    type: "boiler",  name: "Boiler",    location: "Ruang Boiler" }
];

/* --- Generator bilangan semu (deterministik) --- */
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function genSeri(param, machineId, hari) {
  const rnd = seeded(hashStr(machineId + ":" + param.key + ":" + daysAgo(0).toISOString().slice(0, 10)));
  const out = [];
  const range = Math.max(param.max - param.min, 1);
  for (let i = hari - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const drift = (rnd() - 0.5) * range * 0.4;
    const noise = (rnd() - 0.5) * range * 0.12;
    let v = param.base + drift + noise;
    v = clamp(v, param.min, param.max);
    out.push({ date: d.toISOString().slice(0, 10), value: round2(v) });
  }
  return out;
}

function genJam(param, machineId, jml) {
  const rnd = seeded(hashStr(machineId + ":h:" + param.key + ":" + todayStr()));
  const out = [];
  const range = Math.max(param.max - param.min, 1);
  const now = new Date();
  for (let i = jml - 1; i >= 0; i--) {
    const hh = now.getHours();
    const t = new Date(now);
    t.setHours(hh - i, 0, 0, 0);
    const drift = (rnd() - 0.5) * range * 0.35;
    const noise = (rnd() - 0.5) * range * 0.1;
    let v = clamp(param.base + drift + noise, param.min, param.max);
    out.push({ hour: ("0" + (hh - i) % 24).slice(-2), value: round2(v) });
  }
  return out;
}

function paramLevel(p, value) {
  const range = Math.max(p.max - p.min, 1);
  const oob = Math.abs(value - p.base) / range;
  if (oob > 0.55) return "trouble";
  if (oob > 0.35) return "abnormal";
  return "ok";
}

function machineStatus(machine) {
  const flags = store.get("flags", {});
  if (flags[machine.id] === "maintenance") return "maintenance";
  const type = MACHINE_TYPES[machine.type];
  let warn = 0, bad = 0;
  for (const p of type.params) {
    const v = currentParam(machine, p);
    const oob = Math.abs(v - p.base) / Math.max(p.max - p.min, 1);
    if (oob > 0.55) bad++;
    else if (oob > 0.35) warn++;
  }
  if (bad > 0) return "alert";
  const insp = latestInspection(machine);
  if (insp && insp.hasTrouble && insp.ageDays <= 1) return "alert";
  if (warn > 0) return "warning";
  if (insp && insp.hasAbnormal && insp.ageDays <= 2) return "warning";
  return "normal";
}

function primaryParam(machine) {
  const type = MACHINE_TYPES[machine.type];
  return type.params.find((p) => p.key === type.primary);
}

function currentParam(machine, param) {
  const readings = store.get("readings", {});
  const list = readings[machine.id] || [];
  if (list.length) {
    const last = list[list.length - 1];
    const v = last.values[param.key];
    if (v !== undefined && v !== null) return Number(v);
  }
  return genParams(machine, param).value;
}

/* nilai dasar saat ini (dengan sedikit noise) utk param tunggal */
function genParams(machine, param) {
  const rnd = seeded(hashStr(machine.id + ":" + param.key + ":now:" + todayStr() + ":" + currentHour()));
  const range = Math.max(param.max - param.min, 1);
  const drift = (rnd() - 0.5) * range * 0.18;
  const v = clamp(param.base + drift, param.min, param.max);
  return { value: round2(v) };
}

/* ============================================================
   FORMULIR PENGECEKAN MESIN (OK / Abnormal / Troubleshoot)
   ============================================================ */

const INSPECT_GENERAL = [
  { key: "kebersihan", label: "Kebersihan & kerapian area mesin" },
  { key: "bocor",        label: "Kebocoran (air / oli / refrigeran)" },
  { key: "suara",        label: "Suara / getaran tidak normal" },
  { key: "listrik",      label: "Kabel & panel listrik aman" },
  { key: "instrumen",    label: "Instrumen, indikator & alarm berfungsi" },
  { key: "pelumasan",    label: "Level pelumasan / oli memadai" }
];

const INSPECT_STATUS = {
  ok:       { label: "OK",          color: "#22c55e" },
  abnormal: { label: "Abnormal",    color: "#f59e0b" },
  trouble:  { label: "Troubleshoot", color: "#ef4444" }
};

function buildInspectionItems(machine) {
  const items = INSPECT_GENERAL.map((g) => ({ key: g.key, label: g.label, status: "ok", auto: "ok", note: "" }));
  const type = MACHINE_TYPES[machine.type];
  type.params.forEach((p) => {
    const v = currentParam(machine, p);
    items.push({
      key: "p_" + p.key,
      label: p.label + " (" + v + " " + p.unit + ")",
      status: paramLevel(p, v),
      auto: paramLevel(p, v),
      note: ""
    });
  });
  return items;
}

function latestInspection(machine) {
  const all = store.get("inspections", {});
  const list = all[machine.id] || [];
  if (!list.length) return null;
  const rec = list[0];
  const ageDays = (Date.now() - new Date(rec.ts).getTime()) / 86400000;
  const items = rec.items || [];
  const trouble = items.filter((i) => i.status === "trouble").length;
  const abnormal = items.filter((i) => i.status === "abnormal").length;
  return { rec, ageDays, hasTrouble: trouble > 0, hasAbnormal: abnormal > 0, trouble, abnormal, ok: items.length - trouble - abnormal };
}

function countInspection(items) {
  const ok = items.filter((i) => i.status === "ok").length;
  const abnormal = items.filter((i) => i.status === "abnormal").length;
  const trouble = items.filter((i) => i.status === "trouble").length;
  return { ok, abnormal, trouble };
}

function seedInspections() {
  if (store.get("inspections", null)) return;
  const out = {};
  const base = new Date();
  MACHINES.forEach((m, i) => {
    const rnd = seeded(hashStr("ins:" + m.id + ":" + todayStr()));
    const baseItems = buildInspectionItems(m);
    const items = baseItems.map((it) => {
      let status = it.auto;
      if (status === "ok") {
        const r = rnd();
        if (r < 0.18) status = "trouble";
        else if (r < 0.45) status = "abnormal";
      }
      return { key: it.key, label: it.label, status: status, note: status === "ok" ? "" : (status === "trouble" ? "Perlu penanganan segera" : "Perlu dimonitor") };
    });
    const d = new Date(base);
    d.setDate(d.getDate() - (1 + (i % 3)));
    d.setHours(8 + (i % 9), 20 + (i % 30), 0, 0);
    out[m.id] = [{ ts: d.toISOString(), by: "Petugas " + (i + 1), items: items }];
  });
  store.set("inspections", out);
}