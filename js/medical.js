// Medical view: offline self-assessment and decision support. It never diagnoses.
// Reuses helpers from app.js (records, showToast, localDate, setView).
(() => {
  "use strict";

  const MED_KEY = "amigos-medical-v1";
  const HOUR = 3600000;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const loadedAt = Date.now();
  const $ = selector => document.querySelector(selector);

  // Small DOM builder. Text always goes through textContent, never innerHTML.
  function h(tag, props = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value === false || value === null || value === undefined) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    node.append(...children.filter(child => child !== null && child !== undefined && child !== false));
    return node;
  }

  /* ---------- Reference data ---------- */

  // General healthy-adult references at rest, each with its published source.
  // No age-specific bands are applied: none is used without a reliable source.
  const VITALS = {
    bp: {
      name: "Blood pressure", unit: "mmHg", icon: "◍", staleHours: 24, step: 5, decimals: 0,
      device: "Upper-arm cuff monitor",
      format: r => `${r.v[0]}/${r.v[1]}`,
      fields: [["Systolic (top number)", 50, 260], ["Diastolic (bottom number)", 30, 160]],
      series: ["Systolic", "Diastolic"],
      bands: [{ lo: 90, hi: 120, i: 0 }, { lo: 60, hi: 80, i: 1 }],
      ref: {
        text: "Below 120/80 mmHg; low is commonly below 90/60",
        source: "American Heart Association (normal category); NHLBI (low blood pressure)"
      },
      check: r => r.v[0] >= 120 || r.v[1] >= 80 ? "Above the general adult reference (below 120/80)." :
        r.v[0] < 90 || r.v[1] < 60 ? "Below the general adult reference (90/60 or higher)." : null,
      symptom: "Dizziness",
      steps: [
        "Rest seated for 5 minutes. Avoid exercise and caffeine for 30 minutes before.",
        "Place the cuff on a bare upper arm, supported at heart level.",
        "Stay still and silent while the cuff inflates.",
        "Take two readings one minute apart and save both."
      ]
    },
    hr: {
      name: "Heart rate", unit: "bpm", icon: "♡", staleHours: 24, step: 5, decimals: 0,
      device: "Wrist pulse sensor",
      format: r => `${r.v[0]}`,
      fields: [["Resting heart rate", 20, 250]],
      series: ["Heart rate"],
      bands: [{ lo: 60, hi: 100, i: 0 }],
      ref: { text: "60–100 bpm at rest", source: "American Heart Association (resting heart rate, adults)" },
      check: r => r.v[0] > 100 ? "Above the general adult resting reference (60–100)." :
        r.v[0] < 60 ? "Below the general adult resting reference (60–100). Fit adults often rest lower; compare with your baseline." : null,
      symptom: "Palpitations",
      steps: [
        "Rest seated for 5 minutes before measuring.",
        "Keep the sensor snug against the skin and stay still.",
        "Wait for a stable number, about 30 seconds.",
        "For a manual count, count wrist pulses for 30 seconds and double it."
      ]
    },
    ecg: {
      name: "ECG", unit: "", icon: "⌁", staleHours: 24, noAuto: true, noTrend: true, decimals: 0,
      device: "Chest patch ECG",
      format: r => `${r.seconds || 30} s recording`,
      series: ["Heart rate during recording"],
      bands: [],
      ref: { text: "No numeric reference; recordings are read by the medical team", source: "Not interpreted by this app" },
      steps: [
        "Clean and dry the skin before attaching the patch or electrodes.",
        "Sit or float still, relax your shoulders and breathe normally.",
        "Record for the full 30 seconds without talking.",
        "Add any symptoms you feel during the recording in the Symptoms section."
      ]
    },
    spo2: {
      name: "SpO₂", unit: "%", icon: "○", staleHours: 24, step: 1, decimals: 0,
      device: "Fingertip pulse oximeter",
      format: r => `${r.v[0]}`,
      fields: [["Oxygen saturation", 50, 100]],
      series: ["SpO₂"],
      bands: [{ lo: 95, hi: 100, i: 0 }],
      ref: {
        text: "95–100% (sea-level air; cabin pressure can change this)",
        source: "Mayo Clinic (pulse oximetry, healthy adults)"
      },
      check: r => r.v[0] < 95 ? "Below the general adult reference (95–100%)." : null,
      symptom: "Shortness of breath",
      steps: [
        "Warm your hand and remove anything covering the fingernail.",
        "Clip the sensor on a finger and keep the hand still.",
        "Wait at least 30 seconds for a steady number.",
        "Save the steady value, not the first one shown."
      ]
    },
    rr: {
      name: "Respiratory rate", unit: "breaths/min", icon: "≈", staleHours: 24, step: 2, decimals: 0,
      device: "Manual count",
      format: r => `${r.v[0]}`,
      fields: [["Breaths per minute", 4, 60]],
      series: ["Respiratory rate"],
      bands: [{ lo: 12, hi: 20, i: 0 }],
      ref: { text: "12–20 breaths/min at rest", source: "Johns Hopkins Medicine (vital signs, adults)" },
      check: r => r.v[0] > 20 ? "Above the general adult resting reference (12–20)." :
        r.v[0] < 12 ? "Below the general adult resting reference (12–20)." : null,
      symptom: "Shortness of breath",
      steps: [
        "Rest for 5 minutes and breathe normally.",
        "Count each rise of the chest for a full 60 seconds.",
        "Try not to change your breathing while counting.",
        "Enter the count as breaths per minute."
      ]
    },
    temp: {
      name: "Temperature", unit: "°C", icon: "△", staleHours: 24, step: 0.3, decimals: 1,
      device: "Infrared thermometer",
      format: r => r.v[0].toFixed(1),
      fields: [["Body temperature", 30, 45]],
      series: ["Temperature"],
      bands: [{ lo: 36.1, hi: 37.2, i: 0 }],
      ref: { text: "36.1–37.2 °C", source: "MedlinePlus, U.S. National Library of Medicine (adults)" },
      check: r => r.v[0] > 37.2 ? "Above the general adult reference (36.1–37.2 °C)." :
        r.v[0] < 36.1 ? "Below the general adult reference (36.1–37.2 °C)." : null,
      symptom: "Unusual tiredness",
      steps: [
        "Wait 15 minutes after exercise, eating or drinking.",
        "Use the same site each time, for example the forehead.",
        "Hold the thermometer as its guide shows until it signals.",
        "Repeat once if the number looks unexpected."
      ]
    }
  };
  const ORDER = ["bp", "hr", "ecg", "spo2", "rr", "temp"];

  // Mission-approved alert limits are supplied by the mission medical team.
  // None are bundled: the app never invents them. Shape: { hr: "50–110 bpm" }.
  const MISSION_LIMITS = {};

  // Below is red, normal is green, over is orange. Each also has its own icon and words.
  const STATUS = {
    normal: { icon: "✓", label: "Normal" },
    below: { icon: "▼", label: "Below" },
    over: { icon: "▲", label: "Over" },
    recheck: { icon: "↻", label: "Needs recheck" },
    nodata: { icon: "?", label: "No data" }
  };

  const SYMPTOMS = ["Dizziness", "Headache", "Nausea", "Shortness of breath",
    "Chest discomfort", "Palpitations", "Unusual tiredness"
  ];

  const GROUPS = [
    { id: "circulation", label: "Blood pressure + heart rate + dizziness", vitals: ["bp", "hr"], symptom: "Dizziness" },
    { id: "breathing", label: "SpO₂ + respiratory rate + shortness of breath", vitals: ["spo2", "rr"], symptom: "Shortness of breath" },
    { id: "recovery", label: "Temperature + heart rate + tiredness", vitals: ["temp", "hr"], symptom: "Unusual tiredness" }
  ];

  /* ---------- Sample crew (prototype data) ---------- */

  const CREW = [{
    id: "c1", name: "Rana Haddad", role: "Flight engineer", age: 38, journalOwner: true,
    mission: "AMIGOS-1 analog mission", missionDay: 42, missionLength: 180,
    history: "Appendectomy (2015)", conditions: "None recorded",
    medications: "None", allergies: "Penicillin",
    baseline: { bp: "112/72 mmHg", hr: "58 bpm", spo2: "98%", rr: "14 breaths/min", temp: "36.6 °C" },
    baselineValue: { bp: 112, hr: 58, spo2: 98, rr: 14, temp: 36.6 }
  }, {
    id: "c2", name: "Marco Okafor", role: "Commander", age: 45,
    mission: "AMIGOS-1 analog mission", missionDay: 42, missionLength: 180,
    history: "Left knee arthroscopy (2019)", conditions: "Seasonal allergic rhinitis",
    medications: "Loratadine 10 mg, as needed", allergies: "None known",
    baseline: { bp: "118/76 mmHg", hr: "64 bpm", spo2: "98%", rr: "15 breaths/min", temp: "36.8 °C" },
    baselineValue: { bp: 118, hr: 64, spo2: 98, rr: 15, temp: 36.8 }
  }, {
    id: "c3", name: "Lena Varga", role: "Mission specialist", age: 33,
    mission: "AMIGOS-1 analog mission", missionDay: 42, missionLength: 180,
    history: "None recorded", conditions: "None recorded",
    medications: "None", allergies: "Latex",
    baseline: { hr: "66 bpm", temp: "36.5 °C" },
    baselineValue: { hr: 66, temp: 36.5 }
  }];

  // rows: [hoursAgo, ...values]
  function sample(crew, type, rows, extra = {}) {
    return rows.map((row, index) => ({
      id: `sample-${crew}-${type}-${index}`, crew, type, sample: true,
      at: loadedAt - row[0] * HOUR, v: row.slice(1),
      source: VITALS[type].device,
      ...(index === rows.length - 1 ? extra : {})
    }));
  }
  const SAMPLE_READINGS = [
    ...sample("c1", "bp", [[150, 112, 72], [126, 114, 74], [102, 110, 70], [78, 113, 73], [52, 108, 70], [27, 100, 64], [2, 88, 56]]),
    ...sample("c1", "hr", [[150, 58], [126, 60], [102, 57], [78, 61], [52, 59], [27, 72], [2, 84]]),
    ...sample("c1", "spo2", [[150, 98], [126, 98], [102, 97], [78, 98], [30, 97]]),
    ...sample("c1", "rr", [[126, 14], [78, 15], [52, 14], [5, 16]]),
    ...sample("c1", "temp", [[126, 36.6], [78, 36.7], [52, 36.5], [4, 36.8]]),
    ...sample("c1", "ecg", [[26, 61]], { seconds: 30 }),
    ...sample("c2", "bp", [[120, 118, 76], [72, 117, 78], [24, 119, 77], [1, 134, 70]],
      { quality: "poor", qualityNote: "movement detected while the cuff inflated" }),
    ...sample("c2", "hr", [[120, 64], [72, 66], [24, 63], [1, 67]]),
    ...sample("c2", "spo2", [[72, 97], [24, 98], [1, 98]]),
    ...sample("c2", "rr", [[72, 15], [1, 14]]),
    ...sample("c2", "temp", [[72, 36.8], [24, 36.9], [1, 37.0]]),
    ...sample("c3", "hr", [[6, 71]]),
    ...sample("c3", "temp", [[6, 36.4]])
  ];
  const SAMPLE_SYMPTOMS = [
    { id: "sample-s1", crew: "c1", name: "Dizziness", severity: 2, at: loadedAt - 3 * HOUR, note: "When standing up after exercise", sample: true },
    { id: "sample-s2", crew: "c1", name: "Dizziness", severity: 1, at: loadedAt - 27 * HOUR, note: "", sample: true }
  ];
  const SAMPLE_TESTS = {
    c1: [
      { name: "Body mass", value: "71.4", unit: "kg", hoursAgo: 20, source: "Body mass measurement device", trend: "→ Steady (baseline 71.0 kg)", status: "nodata", reason: "No general reference applies. Tracked against your baseline only." },
      { name: "Blood glucose (fingerstick)", value: "5.1", unit: "mmol/L", hoursAgo: 20, source: "Handheld glucose meter", trend: "– Not enough results", status: "nodata", reason: "Fasting state was not recorded, so no reference is applied." },
      { name: "Urine test strip", status: "nodata", reason: "No result on file." }
    ],
    c2: [
      { name: "Body mass", value: "82.0", unit: "kg", hoursAgo: 44, source: "Body mass measurement device", trend: "→ Steady (baseline 82.3 kg)", status: "nodata", reason: "No general reference applies. Tracked against your baseline only." },
      { name: "Blood glucose (fingerstick)", status: "nodata", reason: "No result on file." },
      { name: "Urine test strip", status: "nodata", reason: "No result on file." }
    ],
    c3: [
      { name: "Body mass", status: "nodata", reason: "No result on file." },
      { name: "Blood glucose (fingerstick)", status: "nodata", reason: "No result on file." },
      { name: "Urine test strip", status: "nodata", reason: "No result on file." }
    ]
  };

  /* ---------- Browser storage (same safety rules as the routine journal) ---------- */

  let store = { v: 1, activeCrew: "c1", measurements: [], symptoms: [] };
  let storeReady = true;
  try {
    const saved = JSON.parse(localStorage.getItem(MED_KEY) || "null");
    if (saved) {
      if (!Array.isArray(saved.measurements) || !Array.isArray(saved.symptoms)) throw new Error("Invalid medical store");
      store = saved;
    }
  } catch {
    // Never overwrite unreadable existing data.
    storeReady = false;
  }
  if (!CREW.some(member => member.id === store.activeCrew)) store.activeCrew = "c1";

  function saveStore() {
    if (!storeReady) {
      showToast("Existing medical data could not be read. Recover it before saving.");
      return false;
    }
    try {
      localStorage.setItem(MED_KEY, JSON.stringify(store));
      return true;
    } catch {
      showToast("Unable to save. Check your browser's storage settings and try again.");
      return false;
    }
  }

  let tab = "dash";
  let group = GROUPS[0].id;
  let detailType = null;
  let system = null; // selected body system, or null for all
  let picked = "bp"; // indicator shown in the trend chart

  const crew = () => CREW.find(member => member.id === store.activeCrew);
  const readingsFor = type => [...SAMPLE_READINGS, ...store.measurements]
    .filter(r => r.crew === store.activeCrew && r.type === type).sort((a, b) => a.at - b.at);
  const symptomsFor = () => [...SAMPLE_SYMPTOMS, ...store.symptoms]
    .filter(s => s.crew === store.activeCrew).sort((a, b) => b.at - a.at);

  /* ---------- Formatting ---------- */

  const formatTime = ts => new Date(ts).toLocaleString("en", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
  });

  function ago(ts) {
    const minutes = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 48 * 60) return `${Math.round(minutes / 60)} h ago`;
    return `${Math.round(minutes / 1440)} d ago`;
  }

  function dateKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function localDateTime(ts) {
    const d = new Date(ts);
    return new Date(ts - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  const pill = key => h("span", { class: `med-status med-${key}` },
    h("span", { "aria-hidden": "true", text: STATUS[key].icon }), STATUS[key].label);

  /* ---------- Assessment: reference comparison only, never a diagnosis ---------- */

  function assess(type, latest) {
    const def = VITALS[type];
    if (!latest) return { key: "nodata", reason: "No reading on file yet." };
    if (latest.quality === "poor") {
      return { key: "recheck", reason: `The device flagged this reading: ${latest.qualityNote}.` };
    }
    if (def.noAuto) {
      return { key: "nodata", reason: "Recording saved. This app does not interpret ECG; the medical team reviews it." };
    }
    if (Date.now() - latest.at > def.staleHours * HOUR) {
      return { key: "recheck", reason: `The last reading is ${ago(latest.at).replace(" ago", "")} old. Take a new one.` };
    }
    const problem = def.check(latest);
    return problem ? { key: problem.startsWith("Above") ? "over" : "below", reason: problem } :
      { key: "normal", reason: "Inside the general adult reference." };
  }

  function trendOf(type, list) {
    const def = VITALS[type];
    if (def.noTrend) return { icon: "–", text: "Not applicable" };
    if (list.length < 2) return { icon: "–", text: "Not enough readings" };
    const previous = list.slice(-4, -1);
    const average = previous.reduce((sum, r) => sum + r.v[0], 0) / previous.length;
    const change = list.at(-1).v[0] - average;
    const amount = `${Math.abs(change).toFixed(def.decimals)} ${def.unit}`;
    const versus = `vs previous ${previous.length}`;
    if (Math.abs(change) < def.step) return { icon: "→", text: `Steady ${versus}` };
    return change > 0 ? { icon: "↗", text: `Rising, +${amount} ${versus}` } :
      { icon: "↘", text: `Falling, −${amount} ${versus}` };
  }

  function baselineNote(type, latest) {
    const member = crew();
    const text = member.baseline[type];
    if (!text) return "Not recorded";
    const base = member.baselineValue[type];
    if (!latest || base === undefined) return text;
    const diff = latest.v[0] - base;
    const def = VITALS[type];
    if (Math.abs(diff) < def.step) return `${text} · latest is close to it`;
    return `${text} · latest is ${Math.abs(diff).toFixed(def.decimals)} ${diff > 0 ? "above" : "below"}`;
  }

  /* ---------- Routine journal link (entries written by the Daily check-in) ---------- */

  function routineByDate() {
    const map = {};
    const list = typeof records === "undefined" ? [] : records;
    list.forEach(record => {
      const existing = map[record.date];
      if (!existing || (record.updatedAt || "") > (existing.updatedAt || "")) map[record.date] = record;
    });
    return map;
  }

  /* ---------- Charts (inline SVG, drawn locally) ---------- */

  function chart(options) {
    const points = options.series.flatMap(s => s.points);
    if (!points.length) return h("p", { class: "med-nochart", text: "No readings in this period." });
    const axes = options.axes !== false;
    const width = Math.max(220, Math.floor(options.width));
    const height = options.height || 170;
    const [left, right, top, bottom] = axes ? [42, 14, 18, 26] : [4, 4, 5, 5];
    const bands = axes ? options.bands || [] : [];
    const values = points.map(p => p.v).concat(bands.flatMap(b => [b.lo, b.hi]));
    let low = Math.min(...values);
    let high = Math.max(...values);
    const pad = (high - low || 2) * 0.12;
    low -= pad;
    high += pad;
    const x = t => left + (t - options.from) / (options.to - options.from) * (width - left - right);
    const y = v => top + (high - v) / (high - low) * (height - top - bottom);
    const n = value => value.toFixed(1);
    let svg = "";
    if (axes) {
      bands.forEach(b => {
        svg += `<rect class="med-band" x="${left}" y="${n(y(b.hi))}" width="${width - left - right}" height="${n(y(b.lo) - y(b.hi))}"/>`;
      });
      const tick = new Date(options.from);
      tick.setHours(24, 0, 0, 0);
      for (; tick.getTime() < options.to; tick.setDate(tick.getDate() + 1)) {
        const tx = n(x(tick.getTime()));
        svg += `<line class="med-axis" x1="${tx}" x2="${tx}" y1="${top}" y2="${height - bottom}"/>` +
          `<text class="med-tick" x="${tx}" y="${height - 8}" text-anchor="middle">${tick.toLocaleDateString("en", { weekday: "short" })}</text>`;
      }
      [low + pad, (low + high) / 2, high - pad].forEach(value => {
        svg += `<text class="med-tick" x="${left - 7}" y="${n(y(value) + 4)}" text-anchor="end">${value.toFixed(options.decimals || 0)}</text>`;
      });
      svg += `<line class="med-axis" x1="${left}" x2="${width - right}" y1="${height - bottom}" y2="${height - bottom}"/>`;
    }
    (options.markers || []).forEach(t => {
      const mx = n(x(t));
      svg += `<line class="med-marker" x1="${mx}" x2="${mx}" y1="${top}" y2="${height - bottom}"/>` +
        `<text class="med-markertext" x="${mx}" y="${top - 5}" text-anchor="middle">◆</text>`;
    });
    options.series.forEach((s, index) => {
      const style = index % 2;
      svg += `<polyline class="med-line${style}" points="${s.points.map(p => `${n(x(p.t))},${n(y(p.v))}`).join(" ")}"/>`;
      s.points.forEach((p, pointIndex) => {
        const size = pointIndex === s.points.length - 1 ? 5 : 3;
        svg += style ?
          `<rect class="med-dot1" x="${n(x(p.t) - size)}" y="${n(y(p.v) - size)}" width="${size * 2}" height="${size * 2}"/>` :
          `<circle class="med-dot0" cx="${n(x(p.t))}" cy="${n(y(p.v))}" r="${size}"/>`;
      });
    });
    const wrap = h("div", { class: "med-chart" });
    // Numbers and fixed labels only: no user text reaches this markup.
    wrap.innerHTML = `<svg role="img" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${svg}</svg>`;
    wrap.firstChild.setAttribute("aria-label", options.label);
    return wrap;
  }

  function seriesFor(type, from) {
    const def = VITALS[type];
    const list = readingsFor(type).filter(r => r.at >= from);
    return def.series.map((label, index) => ({ label, points: list.map(r => ({ t: r.at, v: r.v[index] })) }));
  }

  function chartSummary(type, from) {
    const def = VITALS[type];
    const list = readingsFor(type).filter(r => r.at >= from);
    if (!list.length) return `${def.name}: no readings in the last 7 days.`;
    return `${def.name}, last 7 days: ${list.length} readings, latest ${def.format(list.at(-1))} ${def.unit}.`;
  }

  function chartKey(type, withMarker) {
    const def = VITALS[type];
    const parts = def.series.map((label, index) => `${index ? "■ dashed" : "● solid"} ${label}`);
    if (def.bands.length) parts.push("shaded band = general adult reference");
    if (withMarker) parts.push(`◆ ${withMarker} logged`);
    return h("p", { class: "med-chart-key", text: parts.join(" · ") });
  }

  /* ---------- Indicators: device vitals plus Daily check-in values ---------- */

  // Values written by the Daily check-in (Routines view).
  const ROUTINE = {
    sleep: {
      name: "Sleep", unit: "h", field: "sleepHours", decimals: 1, lo: 7, hi: 9, short: "the 7–9 h reference",
      ref: "7–9 h of sleep per night. Source: National Sleep Foundation (adults)."
    },
    mood: {
      name: "Mood", unit: "/ 5", field: "mood", lo: 3, hi: 5, short: "the 3–5 part of your scale",
      ref: "Your own 1–5 rating; 1–2 counts as low. Not a clinical score."
    },
    stress: {
      name: "Stress", unit: "/ 10", field: "stress", lo: 0, hi: 6, short: "the 0–6 part of your scale",
      ref: "Your own 0–10 rating; 7 or more counts as high. Not a clinical score."
    },
    water: {
      name: "Water", unit: "mL", field: "water", own: true, short: "your own 7-day average (±20%)",
      ref: "Compared with your own 7-day average. The mission fluid plan is not loaded."
    },
    activity: {
      name: "Exercise", unit: "min", field: "activity", own: true, short: "your own 7-day average (±20%)",
      ref: "Compared with your own 7-day average. The mission exercise plan is not loaded."
    }
  };

  const SYSTEMS = [
    { id: "mind", name: "Sleep & mood", ids: ["sleep", "mood", "stress"], note: "Sleep, mood and stress from your Daily check-in." },
    { id: "resp", name: "Respiratory", ids: ["spo2", "rr"], note: "Oxygen saturation and breathing rate." },
    { id: "cardio", name: "Cardiovascular", ids: ["hr", "bp", "ecg"], note: "Heart rate, blood pressure and ECG recordings." },
    { id: "fluids", name: "Fluids & temperature", ids: ["temp", "water"], note: "Body temperature, with water intake from your Daily check-in." },
    { id: "muscle", name: "Muscle & bone", ids: ["activity"], note: "Exercise minutes from your Daily check-in." }
  ];
  const ALL_IDS = ["hr", "bp", "spo2", "rr", "temp", "ecg", "sleep", "mood", "stress", "water", "activity"];

  const zoneOf = (value, lo, hi) => value < lo ? "below" : value > hi ? "over" : "normal";
  // Ring percent: the normal range always spans 25–75% of the circle.
  const percentOf = (value, lo, hi) => Math.min(100, Math.max(3, 25 + (value - lo) / (hi - lo) * 50));
  const mean = list => list.reduce((sum, n) => sum + n, 0) / list.length;

  function vitalIndicator(id) {
    const def = VITALS[id];
    const list = readingsFor(id);
    const latest = list.at(-1);
    const status = assess(id, latest);
    const out = {
      id, kind: "vital", name: def.name, unit: def.unit, zone: status.key, reason: status.reason, pct: null,
      bigText: latest ? def.format(latest) : "–",
      valueText: latest ? `${def.format(latest)} ${def.unit}`.trim() : "no reading",
      when: latest ? `${ago(latest.at)} · ${latest.source}${latest.sample ? " (sample)" : ""}` : "Not measured",
      refText: `${def.ref.text}. Source: ${def.ref.source}.`,
      decimals: def.decimals, bands: def.bands, series: seriesFor(id, Date.now() - WEEK)
    };
    if (!latest || def.noAuto) return out;
    // Draw the ring from the value that is out of range (for example diastolic), else the first.
    const band = def.bands.find(b => zoneOf(latest.v[b.i], b.lo, b.hi) !== "normal") || def.bands[0];
    out.pct = percentOf(latest.v[band.i], band.lo, band.hi);
    const week = list.filter(r => r.at >= Date.now() - WEEK);
    if (week.length >= 2) {
      const average = { v: def.series.map((_, i) => Number(mean(week.map(r => r.v[i])).toFixed(def.decimals))) };
      const problem = def.check(average);
      out.avgText = `${def.format(average)} ${def.unit}`;
      out.avgZone = problem ? (problem.startsWith("Above") ? "over" : "below") : "normal";
    }
    return out;
  }

  function routineIndicator(id) {
    const def = ROUTINE[id];
    const member = crew();
    const out = {
      id, kind: "routine", name: def.name, unit: def.unit, zone: "nodata", pct: null, bigText: "–",
      valueText: "not recorded", when: "From your Daily check-in", refText: def.ref,
      decimals: def.decimals || 0, bands: [], series: [{ label: def.name, points: [] }]
    };
    if (!member.journalOwner) {
      out.reason = `The routine journal on this device is not linked to ${member.name}.`;
      return out;
    }
    const journal = routineByDate();
    const entries = Object.values(journal)
      .filter(e => e[def.field] !== null && e[def.field] !== undefined && e[def.field] !== "")
      // Plot each check-in at midday, but never later than now.
      .map(e => ({ t: Math.min(new Date(`${e.date}T12:00`).getTime(), Date.now()), v: Number(e[def.field]), date: e.date }))
      .filter(e => Number.isFinite(e.v) && e.t >= Date.now() - WEEK).sort((a, b) => a.t - b.t);
    out.series[0].points = entries;
    const today = localDate();
    const current = entries.findLast(e => e.date === today || e.date === dateKey(Date.now() - DAY));
    if (!current) {
      out.reason = journal[today] ? "Not recorded in today's check-in." : "No check-in for today yet.";
      return out;
    }
    out.bigText = String(current.v);
    out.valueText = `${current.v} ${def.unit}`;
    out.when = `${current.date === today ? "Today's" : "Yesterday's"} check-in`;
    let lo = def.lo;
    let hi = def.hi;
    if (def.own) {
      const earlier = entries.filter(e => e !== current);
      const average = earlier.length ? mean(earlier.map(e => e.v)) : 0;
      if (earlier.length < 3 || average <= 0) {
        out.reason = "Needs 3 earlier check-ins to compare with your average.";
        return out;
      }
      lo = average * 0.8;
      hi = average * 1.2;
      out.avgText = `${Math.round(average)} ${def.unit}`;
    } else if (entries.length >= 2) {
      const average = mean(entries.map(e => e.v));
      out.avgText = `${average.toFixed(1)} ${def.unit}`;
      out.avgZone = zoneOf(average, lo, hi);
    }
    out.bands = [{ lo, hi, i: 0 }];
    out.zone = zoneOf(current.v, lo, hi);
    out.pct = percentOf(current.v, lo, hi);
    out.reason = out.zone === "normal" ? `Inside ${def.short}.` : `${out.zone === "below" ? "Below" : "Above"} ${def.short}.`;
    return out;
  }

  const indicator = id => VITALS[id] ? vitalIndicator(id) : routineIndicator(id);
  const flagged = x => x.zone === "below" || x.zone === "over";

  /* ---------- Recommendations ---------- */

  // Prototype rule set. Each rule looks at the current test, its 7-day average and
  // related indicators (temperature, mood, stress, fluids, sleep, symptoms). It only
  // prompts to recheck, complete data, follow the mission plan or contact the medical
  // team. Replace with mission-approved guidance before operational use.
  function buildRecommendations() {
    const list = [];
    const all = Object.fromEntries(ALL_IDS.map(id => [id, indicator(id)]));
    const recentSymptoms = symptomsFor().filter(s => Date.now() - s.at < DAY);
    const used = new Set();
    const lower = x => ["ECG", "SpO₂"].includes(x.name) ? x.name : x.name.toLowerCase();
    const word = zone => STATUS[zone].label.toLowerCase();
    const line = x => `${x.name} now ${x.valueText} (${word(x.zone)})` +
      (x.avgText ? ` · 7-day average ${x.avgText}${x.avgZone ? ` (${word(x.avgZone)})` : ""}` : "");
    const symptomLine = name => {
      const s = recentSymptoms.find(item => item.name === name);
      return s ? `${s.name} logged ${formatTime(s.at)}, strength ${s.severity}/5` : null;
    };
    const measure = id => ["Measure again", () => openDetail(id), "medical"];
    const checkin = ["Open check-in", () => setView("checkin"), "routines"];
    const { bp, hr, temp, water, sleep, mood, stress } = all;

    // Blood pressure together with body fluids and dizziness.
    if (bp.zone === "below" && water.zone !== "normal" && water.zone !== "over") {
      list.push({
        title: "Check your fluids, then recheck blood pressure",
        action: "Log today's water in the Daily check-in and follow your mission fluid plan, then repeat the reading. If it stays below the reference or you feel dizzy, contact the medical team using your mission procedure.",
        why: [line(bp), water.zone === "nodata" ? "Water: not recorded in the Daily check-in" : line(water), symptomLine("Dizziness")],
        button: measure("bp")
      });
      used.add("bp").add("water");
    }
    // Temperature together with heart rate.
    const baseHr = crew().baselineValue.hr;
    const hrNow = readingsFor("hr").at(-1);
    const hrRaised = hr.zone === "over" || (hrNow && baseHr && hrNow.v[0] - baseHr >= 15);
    if (temp.zone === "over" && hrRaised) {
      list.push({
        title: "Recheck temperature and heart rate together",
        action: "Rest for 15 minutes, then repeat both. If both are still raised, contact the medical team using your mission procedure.",
        why: [line(temp), line(hr), baseHr ? `Heart rate baseline ${baseHr} bpm` : null, symptomLine("Unusual tiredness")],
        button: measure("temp")
      });
      used.add("temp").add("hr");
    }
    // Mood and stress together with sleep.
    const shortSleep = sleep.zone === "below" || sleep.avgZone === "below";
    if ((mood.zone === "below" || stress.zone === "over") && shortSleep) {
      list.push({
        title: "Protect your sleep window",
        action: "Low mood or high stress is showing alongside short sleep. Keep to your scheduled sleep period tonight. If this continues for several days, talk to the medical team using your mission procedure.",
        why: [line(mood), line(stress), line(sleep)],
        button: checkin
      });
      used.add("mood").add("stress").add("sleep");
    }
    // Every other indicator: compare the current test with its 7-day average.
    ALL_IDS.forEach(id => {
      const x = all[id];
      if (used.has(id)) return;
      const vital = x.kind === "vital";
      if (flagged(x) && x.avgZone === x.zone) {
        list.push({
          title: `${x.name} has stayed ${x.zone === "below" ? "below" : "over"} the normal range`,
          action: "The current result and the 7-day average are both outside the normal range. Contact the medical team using your mission procedure.",
          why: [line(x), `Reference: ${x.refText}`, symptomLine(VITALS[id]?.symptom)],
          button: vital ? measure(id) : checkin
        });
      } else if (flagged(x)) {
        list.push({
          title: vital ? `Recheck your ${lower(x)}` : `${x.name} is ${x.zone === "below" ? "below" : "over"} your normal range`,
          action: vital ?
            "This result differs from your 7-day average. Repeat the measurement using the steps shown. If it is still outside the normal range, contact the medical team using your mission procedure." :
            "Follow your mission plan today and log it in the Daily check-in. If it continues for several days, tell the medical team.",
          why: [line(x), `Reference: ${x.refText}`, symptomLine(VITALS[id]?.symptom)],
          button: vital ? measure(id) : checkin
        });
      } else if (x.zone === "normal" && x.avgZone && x.avgZone !== "normal") {
        list.push({
          title: `Keep watching your ${lower(x)}`,
          action: `The current result is normal, but the 7-day average is ${x.avgZone === "below" ? "below" : "over"} the normal range. Keep recording it daily so the medical team can see whether it settles.`,
          why: [line(x), `Reference: ${x.refText}`],
          button: vital ? measure(id) : checkin
        });
      } else if (x.zone === "recheck") {
        list.push({
          title: `Take a new ${lower(x)} reading`,
          action: "A fresh reading is needed before this result can be compared with the normal range.",
          why: [x.reason, `Last reading: ${x.valueText} · ${x.when}`],
          button: ["Measure now", () => openDetail(id), "medical"]
        });
      }
    });
    recentSymptoms.filter(s => s.severity >= 4).forEach(s => {
      list.push({
        title: `Tell the medical team about your ${s.name.toLowerCase()}`,
        action: "You rated this symptom strong or severe. Contact the medical team now using your mission procedure. This app does not judge urgency.",
        why: [`${s.name} logged ${formatTime(s.at)}, strength ${s.severity}/5`],
        button: ["Open case summary", () => openTab("summary"), "medical"]
      });
    });
    if (crew().journalOwner && !routineByDate()[localDate()]) {
      list.push({
        title: "Complete today's check-in",
        action: "Sleep, mood, stress, water and exercise feed the Medical view and its recommendations.",
        why: [`No Daily check-in saved for today (${localDate()})`],
        button: checkin
      });
    }
    return list;
  }

  // The same list is shown in the Medical view and in the Daily check-in.
  function recommendationCard(item, inRoutines) {
    const [label, run, view] = item.button;
    let button = null;
    if (!inRoutines) {
      button = h("button", { class: "secondary", type: "button", text: label, onclick: run });
    } else if (view === "medical") {
      button = h("button", {
        class: "secondary", type: "button", text: "Open in Medical view",
        onclick: () => { setView("medical"); run(); }
      });
    }
    return h("article", { class: "med-reco" },
      h("div", {},
        h("h3", { text: item.title }),
        h("p", { text: item.action }),
        h("div", { class: "med-why-title", text: "Prompted by" }),
        h("ul", { class: "med-why" }, ...item.why.filter(Boolean).map(text => h("li", { text })))),
      button);
  }

  const RULE_NOTE = "Prototype rules, not yet mission-approved. Decision support only, never a diagnosis.";

  let stripOpen = false;

  function renderRoutineStrip() {
    const box = $("#routine-recos");
    const items = buildRecommendations();
    box.replaceChildren();
    box.hidden = !items.length;
    if (!items.length) return;
    const details = h("details", { class: "med-profile", open: stripOpen },
      h("summary", {}, `${items.length} recommendation${items.length > 1 ? "s" : ""} `,
        h("span", { text: `· ${crew().name} · same list as the Medical view` })),
      ...items.map(item => recommendationCard(item, true)),
      h("p", { class: "med-quiet med-rule-note", text: RULE_NOTE }));
    details.addEventListener("toggle", () => { stripOpen = details.open; });
    box.append(details);
  }

  /* ---------- Navigation inside the Medical view ---------- */

  function openTab(name) {
    tab = name;
    document.querySelectorAll("[name=medtab]").forEach(input => { input.checked = input.value === name; });
    render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openDetail(type) {
    detailType = type;
    if (tab !== "dash") openTab("dash");
    else render();
    $("#med-detail").scrollIntoView({ block: "start" });
    $("#med-detail h2")?.focus();
  }

  function openRelated(id) {
    group = id;
    openTab("related");
  }

  /* ---------- Rendering ---------- */

  function renderIdentity() {
    const member = crew();
    const initials = member.name.split(" ").map(part => part[0]).join("");
    $("#med-identity").replaceChildren(
      h("span", { class: "med-avatar", "aria-hidden": "true", text: initials }),
      h("span", {},
        h("small", { text: "SHOWING DATA FOR" }),
        h("b", { text: member.name }),
        h("span", { text: `${member.role} · Age ${member.age} · Mission day ${member.missionDay} of ${member.missionLength}` })));
    $("#med-profile-name").textContent = `· ${member.name}`;
    const facts = [
      ["Age", `${member.age} years`], ["Role", member.role],
      ["Mission", `${member.mission}, day ${member.missionDay} of ${member.missionLength}`],
      ["Medical history", member.history], ["Relevant conditions", member.conditions],
      ["Medications", member.medications], ["Allergies", member.allergies],
      ["Personal baselines", ORDER.filter(type => member.baseline[type])
        .map(type => `${VITALS[type].name} ${member.baseline[type]}`).join(" · ") || "Not recorded"]
    ];
    $("#med-profile-body").replaceChildren(...facts.map(([label, value]) =>
      h("div", {}, h("small", { text: label }), h("b", { text: value }))));
    document.querySelectorAll("[data-med-name]").forEach(node => { node.textContent = member.name; });
    $("#med-updated").textContent = `Updated ${new Date().toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}`;
  }

  // Percent circle. Numbers only reach this markup.
  function ring(x) {
    const radius = 25;
    const length = 2 * Math.PI * radius;
    const wrap = h("span", { class: `med-ring med-ring-${x.zone}`, "aria-hidden": "true" });
    wrap.innerHTML = `<svg viewBox="0 0 64 64" width="64" height="64">` +
      `<circle class="med-ring-track" cx="32" cy="32" r="${radius}"/>` +
      (x.pct === null ? "" : `<circle class="med-ring-fill" cx="32" cy="32" r="${radius}" ` +
        `stroke-dasharray="${(length * x.pct / 100).toFixed(1)} ${length.toFixed(1)}" transform="rotate(-90 32 32)"/>`) +
      `<text class="med-ring-text" x="32" y="37" text-anchor="middle">${x.pct === null ? "–" : `${Math.round(x.pct)}%`}</text></svg>`;
    return wrap;
  }

  function ringCard(x) {
    return h("button", {
        class: `med-ring-card${picked === x.id ? " is-picked" : ""}`, type: "button",
        "aria-pressed": picked === x.id ? "true" : "false",
        onclick: () => { picked = x.id; render(); }
      },
      ring(x),
      h("span", { class: "med-ring-body" },
        h("span", { class: "med-ring-name", text: x.name }),
        h("span", { class: "med-ring-value" }, x.bigText, x.unit && x.bigText !== "–" ? h("small", { text: x.unit }) : null),
        pill(x.zone)),
      h("span", { class: "med-ring-foot" },
        h("span", { text: x.reason }),
        h("span", { text: x.avgText ? `7-day average ${x.avgText}${x.avgZone ? ` · ${STATUS[x.avgZone].label}` : ""}` : "7-day average: not enough results" }),
        h("span", { text: x.when })));
  }

  // Worst zone across a body system's indicators.
  function systemZone(item, all) {
    const zones = item.ids.map(id => all[id].zone);
    return ["below", "over", "recheck"].find(zone => zones.includes(zone)) ||
      (zones.includes("normal") ? "normal" : "nodata");
  }

  const BODY_MARKS = {
    mind: [110, 34, "SLEEP / MOOD"], resp: [93, 112, "RESPIRATORY"], cardio: [120, 128, "CARDIO"],
    fluids: [110, 178, "FLUIDS / TEMP"], muscle: [86, 256, "MUSCLE / BONE"]
  };

  function bodyFigure(all) {
    const on = id => system === id ? " is-on" : "";
    let marks = "";
    SYSTEMS.forEach(item => {
      const [x, y, label] = BODY_MARKS[item.id];
      const zone = systemZone(item, all);
      marks += `<g class="med-mark med-mark-${zone}${on(item.id)}" data-system="${item.id}" role="button" tabindex="0" ` +
        `aria-pressed="${system === item.id}" aria-label="${item.name}: ${STATUS[zone].label}">` +
        `<line x1="${x + 10}" y1="${y}" x2="194" y2="${y}"/><circle class="med-mark-halo" cx="${x}" cy="${y}" r="10"/>` +
        `<circle class="med-mark-core" cx="${x}" cy="${y}" r="4.5"/>` +
        `<text x="199" y="${y + 4}">${label} ${STATUS[zone].icon}</text></g>`;
    });
    const wrap = h("div", { class: "med-body" });
    wrap.innerHTML = `<svg viewBox="34 4 286 388" role="group" aria-label="Body systems. Select one to filter the current tests.">` +
      `<ellipse class="med-skin" cx="110" cy="38" rx="22" ry="27"/>` +
      `<path class="med-skin" d="M96 68 L124 68 C132 78 150 80 158 90 C166 100 168 120 170 150 L176 200 C178 214 166 216 164 204 L156 150 L152 118 L150 170 C150 190 154 200 154 214 L150 290 L146 372 C146 384 124 384 124 372 L122 300 L114 226 L110 222 L106 226 L98 300 L96 372 C96 384 74 384 74 372 L70 290 L66 214 C66 200 70 190 70 170 L68 118 L64 150 L56 204 C54 216 42 214 44 200 L50 150 C52 120 54 100 62 90 C70 80 88 78 96 68 Z"/>` +
      `<path class="med-organ${on("mind")}" d="M94 34 C94 18 126 18 126 34 C126 44 118 46 110 46 C102 46 94 44 94 34 Z M110 20 L110 46"/>` +
      `<path class="med-organ${on("resp")}" d="M104 96 C92 98 84 112 84 134 C92 140 102 138 104 132 Z M116 96 C128 98 136 112 136 134 C128 140 118 138 116 132 Z M110 86 L110 100"/>` +
      `<path class="med-organ${on("cardio")}" d="M120 138 C108 130 108 118 116 118 C119 118 120 121 120 122 C120 121 122 118 125 118 C132 118 132 130 120 138 Z"/>` +
      `<path class="med-organ${on("fluids")}" d="M110 162 C118 172 122 178 122 184 C122 191 117 196 110 196 C103 196 98 191 98 184 C98 178 102 172 110 162 Z"/>` +
      `<path class="med-organ${on("muscle")}" d="M82 230 C80 226 86 224 86 229 C87 224 93 226 90 231 L89 281 C93 285 87 289 86 284 C85 289 79 285 83 281 Z"/>` +
      marks + `</svg>`;
    const choose = event => {
      const mark = event.target.closest("[data-system]");
      if (!mark || (event.type === "keydown" && !["Enter", " "].includes(event.key))) return;
      event.preventDefault();
      pickSystem(mark.dataset.system);
    };
    wrap.addEventListener("click", choose);
    wrap.addEventListener("keydown", choose);
    return wrap;
  }

  function pickSystem(id) {
    system = system === id ? null : id;
    const visible = system ? SYSTEMS.find(item => item.id === system).ids : ALL_IDS;
    if (!visible.includes(picked)) picked = visible[0];
    render();
  }

  function readingForm(type) {
    const def = VITALS[type];
    if (!def.fields) {
      return h("p", { class: "helper-note", text: `ECG is saved by the ${def.device.toLowerCase()}. Manual entry is not available.` });
    }
    const error = h("div", { class: "med-error", role: "alert" });
    const inputs = def.fields.map(([label, min, max]) => h("label", {}, `${label} (${def.unit})`,
      h("input", { type: "number", min, max, step: def.decimals ? "0.1" : "1", required: true, inputmode: "decimal" })));
    const time = h("input", { type: "datetime-local", required: true, value: localDateTime(Date.now()) });
    const source = h("select", {},
      h("option", { text: def.device }), def.device === "Manual count" ? null : h("option", { text: "Manual entry" }));
    const form = h("form", { novalidate: true },
      h("div", { class: "two-column" }, ...inputs,
        h("label", {}, "Measured at", time), h("label", {}, "Source / device", source)),
      error,
      h("div", { class: "step-actions" },
        h("span", { class: "med-caption", text: `Saved for ${crew().name}.` }),
        h("button", { class: "primary", type: "submit" }, "Save reading ", h("span", { "aria-hidden": "true", text: "✓" }))));
    form.addEventListener("submit", event => {
      event.preventDefault();
      const values = inputs.map(label => label.querySelector("input"));
      const invalid = [...values, time].find(input => !input.checkValidity());
      if (invalid) {
        invalid.reportValidity();
        return;
      }
      const at = new Date(time.value).getTime();
      if (!Number.isFinite(at) || at > Date.now() + 60000) {
        error.textContent = "Choose a measurement time that is not in the future.";
        return;
      }
      const v = values.map(input => Number(input.value));
      if (type === "bp" && v[1] >= v[0]) {
        error.textContent = "Check the numbers: the top (systolic) value must be higher than the bottom (diastolic) value.";
        return;
      }
      store.measurements.push({ id: crypto.randomUUID(), crew: store.activeCrew, type, v, at, source: source.value });
      if (!saveStore()) {
        store.measurements.pop();
        return;
      }
      showToast(`${def.name} reading saved for ${crew().name}.`);
      render();
      renderRoutineStrip();
    });
    return form;
  }

  function table(headers, rows) {
    return h("div", { class: "med-table-wrap" }, h("table", { class: "med-table" },
      h("thead", {}, h("tr", {}, ...headers.map(text => h("th", { scope: "col", text })))),
      h("tbody", {}, ...rows.map(cells => h("tr", {}, ...cells.map(cell =>
        cell instanceof Node ? h("td", {}, cell) : h("td", { text: cell, class: cell === "–" || cell === "Not recorded" ? "med-na" : null })))))));
  }

  function renderDetail() {
    const box = $("#med-detail");
    box.replaceChildren();
    if (!detailType) return;
    const type = detailType;
    const def = VITALS[type];
    const from = Date.now() - WEEK;
    const list = readingsFor(type);
    const width = box.clientWidth - 62;
    const rows = list.slice(-6).reverse().map(r => [
      `${def.format(r)} ${def.unit}`.trim(), `${formatTime(r.at)} · ${ago(r.at)}`,
      r.source + (r.sample ? " (sample)" : ""),
      r.sample ? "–" : h("button", {
        class: "med-link is-delete", type: "button", text: "Delete",
        onclick: () => {
          if (!confirm("Delete this reading? This cannot be undone.")) return;
          const previous = store.measurements;
          store.measurements = previous.filter(item => item.id !== r.id);
          if (!saveStore()) store.measurements = previous;
          render();
          renderRoutineStrip();
        }
      })
    ]);
    box.append(h("section", { class: "step-panel", "aria-labelledby": "med-detail-heading" },
      h("div", { class: "panel-heading" },
        h("span", { class: "section-icon", "aria-hidden": "true", text: def.icon }),
        h("div", {},
          h("p", { class: "eyebrow", text: `DETAIL · ${crew().name.toUpperCase()}` }),
          h("h2", { id: "med-detail-heading", tabindex: "-1", text: def.name }),
          h("p", { text: `${def.ref.text}. Source: ${def.ref.source}.` })),
        h("button", { class: "secondary", type: "button", text: "Close", onclick: () => { detailType = null; render(); } })),
      h("h3", { class: "med-sub med-first", text: "Last 7 days" }),
      chart({
        series: seriesFor(type, from), bands: def.bands, from, to: Date.now(), width,
        decimals: def.decimals, label: chartSummary(type, from)
      }),
      chartKey(type),
      h("h3", { class: "med-sub", text: "Recent readings" }),
      rows.length ? table(["Value", "Measured", "Source / device", ""], rows) :
        h("p", { class: "med-quiet", text: "No readings on file yet." }),
      h("h3", { class: "med-sub", text: "How to measure" }),
      h("ol", { class: "med-steps" }, ...def.steps.map(text => h("li", { text }))),
      h("p", { class: "helper-note", text: "General technique. If your device's mission procedure differs, follow the procedure." }),
      h("h3", { class: "med-sub", text: def.fields ? "Add a reading" : "Recording" }),
      readingForm(type)));
  }

  function renderDashboard() {
    const member = crew();
    const all = Object.fromEntries(ALL_IDS.map(id => [id, indicator(id)]));
    const current = system && SYSTEMS.find(item => item.id === system);
    const visible = current ? current.ids : ALL_IDS;
    if (!visible.includes(picked)) picked = visible[0];

    // Body systems: the figure and a matching list of buttons.
    $("#med-body").replaceChildren(bodyFigure(all));
    $("#med-systems").replaceChildren(
      h("p", { class: "med-quiet", text: current ? current.note : "Tap a marker or a system to filter the current tests." }),
      ...SYSTEMS.map(item => h("button", {
          class: `med-system${system === item.id ? " is-on" : ""}`, type: "button",
          "aria-pressed": system === item.id ? "true" : "false", onclick: () => pickSystem(item.id)
        },
        h("span", { text: item.name }), pill(systemZone(item, all)))));

    // Current tests as percent circles.
    $("#med-cards-title").textContent = current ? `Current tests · ${current.name}` : "Current tests";
    $("#med-cards-sub").textContent = member.name.toUpperCase();
    $("#med-cards").replaceChildren(...visible.map(id => ringCard(all[id])));

    // 7-day trend for the picked test.
    const x = all[picked];
    const points = x.series.reduce((count, s) => count + s.points.length, 0);
    const trendBox = $("#med-trend");
    trendBox.replaceChildren(
      h("div", { class: "med-pane-head" },
        h("h3", {}, "7-day trend · ", h("b", { text: x.name })),
        h("button", {
          class: "med-link", type: "button",
          text: x.kind === "vital" ? (VITALS[x.id].fields ? "Details & measure" : "How to record") : "Open check-in",
          onclick: () => x.kind === "vital" ? openDetail(x.id) : setView("checkin")
        })));
    trendBox.append(
      chart({
        series: x.series, bands: x.bands, from: Date.now() - WEEK, to: Date.now(),
        width: trendBox.clientWidth, height: 150, decimals: x.decimals,
        label: `${x.name}, last 7 days: ${points} result${points === 1 ? "" : "s"}, latest ${x.valueText}.`
      }),
      h("p", { class: "med-chart-key", text: `${x.bands.length ? "Shaded band = normal range. " : ""}${x.refText}` }));

    // Quick assessment and recommendations (same list as the Daily check-in).
    const results = ALL_IDS.filter(id => id !== "ecg").map(id => all[id]);
    const out = results.filter(flagged);
    const open = results.filter(r => r.zone === "recheck" || r.zone === "nodata");
    const banner = out.length ? ["over", "▲", `${out.length} result${out.length > 1 ? "s" : ""} outside the normal range`, out.map(r => r.name).join(", ")] :
      open.length ? ["nodata", "?", "Some results are missing or need a recheck", open.map(r => r.name).join(", ")] :
      ["normal", "✓", "Looking good", "All current results are in the normal range."];
    const recommendations = buildRecommendations();
    $("#med-recos").replaceChildren(
      h("div", { class: `med-banner med-banner-${banner[0]}` },
        h("span", { class: "med-banner-icon", "aria-hidden": "true", text: banner[1] }),
        h("span", {}, h("b", { text: banner[2] }), h("span", { text: banner[3] }))),
      ...(recommendations.length ? recommendations.map(item => recommendationCard(item, false)) :
        [h("p", { class: "med-quiet", text: `No recommendations for ${member.name} right now.` })]),
      h("p", { class: "med-quiet med-rule-note", text: RULE_NOTE }),
      h("div", { class: "med-call" },
        h("b", { text: "Contact the medical team" }),
        h("span", { text: "For severe chest pain, trouble breathing, fainting, confusion or any rapidly worsening symptom, contact the medical team immediately using your mission procedure." })));

    // Record a new check-in.
    const next = ["bp", "hr", "spo2", "rr", "temp"].find(id => all[id].zone !== "normal") || "bp";
    $("#med-record").replaceChildren(
      h("div", {},
        h("h2", { text: "Record a new check-in" }),
        h("p", { class: "med-quiet", text: "Enter today's measurements and how you are feeling." })),
      h("div", { class: "med-record-actions" },
        h("button", { class: "primary", type: "button", text: "+ Log measurements", onclick: () => openDetail(next) }),
        h("button", { class: "secondary", type: "button", text: "Daily check-in", onclick: () => setView("checkin") }),
        h("button", { class: "secondary", type: "button", text: "Log a symptom", onclick: () => openTab("symptoms") })));

    // Daily health routine: what is done today across both views.
    const fresh = ["bp", "hr", "spo2", "rr", "temp"].filter(id => {
      const latest = readingsFor(id).at(-1);
      return latest && Date.now() - latest.at < DAY;
    }).length;
    const entry = member.journalOwner ? routineByDate()[localDate()] : null;
    const logged = value => value !== null && value !== undefined && value !== "";
    const unlinked = member.journalOwner ? null : "Journal not linked";
    const tasks = [
      ["Vitals check", fresh === 5, `${fresh} of 5 measured in the last 24 h`],
      ["Sleep & mood", Boolean(entry), unlinked || (entry ? "Check-in saved today" : "Check-in not saved yet")],
      ["Exercise", Boolean(entry) && logged(entry.activity), unlinked || (entry && logged(entry.activity) ? `${entry.activity} min logged` : "Not logged today")],
      ["Fluids", Boolean(entry) && logged(entry.water), unlinked || (entry && logged(entry.water) ? `${entry.water} mL logged` : "Not logged today")]
    ];
    $("#med-routine").replaceChildren(
      h("div", { class: "med-pane-head" },
        h("h2", { text: "Daily health routine" }),
        h("span", { text: `${tasks.filter(task => task[1]).length} / ${tasks.length} DONE` })),
      h("div", { class: "med-tasks" }, ...tasks.map(([name, done, text]) =>
        h("div", { class: `med-task${done ? " is-done" : ""}` },
          h("b", {}, h("span", { "aria-hidden": "true", text: done ? "✓ " : "○ " }), name),
          h("span", { text: `${done ? "Done" : "To do"} · ${text}` })))));

    renderDetail();

    $("#med-tests").replaceChildren(table(["Test", "Result", "Measured", "Source / device", "Trend", "Status"],
      SAMPLE_TESTS[member.id].map(test => [
        test.name,
        test.value ? `${test.value} ${test.unit}` : "–",
        test.value ? `${formatTime(loadedAt - test.hoursAgo * HOUR)} · ${ago(loadedAt - test.hoursAgo * HOUR)}` : "–",
        test.source ? `${test.source} (sample)` : "–",
        test.trend || "–",
        h("div", {}, pill(test.status), h("small", { text: test.reason }))
      ])));
  }

  function renderRelated() {
    const member = crew();
    const groupsBox = $("#med-groups");
    if (groupsBox.querySelectorAll("label").length === 0) {
      GROUPS.forEach(item => groupsBox.append(h("label", {},
        h("input", { type: "radio", name: "medgroup", value: item.id }), h("span", { text: item.label }))));
      groupsBox.addEventListener("change", event => {
        group = event.target.value;
        renderRelated();
      });
    }
    groupsBox.querySelectorAll("input").forEach(input => { input.checked = input.value === group; });
    const current = GROUPS.find(item => item.id === group);
    const to = Date.now();
    const from = to - WEEK;
    const box = $("#med-related");
    box.replaceChildren();
    const width = box.clientWidth - 34;
    const marks = symptomsFor().filter(s => s.name === current.symptom && s.at >= from);
    current.vitals.forEach(type => {
      const def = VITALS[type];
      const latest = readingsFor(type).at(-1);
      box.append(h("div", { class: "med-chart-block" },
        h("div", { class: "med-card-head" },
          h("h3", { text: `${def.name}${latest ? ` · latest ${def.format(latest)} ${def.unit}` : ""}` }),
          pill(assess(type, latest).key)),
        chart({
          series: seriesFor(type, from), bands: def.bands, from, to, width, height: 150,
          decimals: def.decimals, markers: marks.map(s => s.at), label: chartSummary(type, from)
        }),
        chartKey(type, marks.length ? current.symptom.toLowerCase() : null)));
    });
    box.append(h("p", { class: "med-chart-key", text: marks.length ?
      `${current.symptom} was logged ${marks.length} time${marks.length > 1 ? "s" : ""} in the last 7 days. Shown together for context only; this does not show a cause.` :
      `No ${current.symptom.toLowerCase()} logged in the last 7 days.` }));

    box.append(h("h2", { class: "med-h2", text: "Routine and symptoms, same 7 days" }));
    if (!member.journalOwner) {
      box.append(h("p", { class: "med-quiet", text: `The routine journal on this device is not linked to ${member.name}. Only symptoms are shown.` }));
    }
    const routine = member.journalOwner ? routineByDate() : {};
    const allSymptoms = symptomsFor();
    const show = (value, unit) => value === null || value === undefined || value === "" ? "Not recorded" : `${value}${unit}`;
    const rows = [];
    for (let offset = 0; offset < 7; offset++) {
      const day = new Date();
      day.setDate(day.getDate() - offset);
      const key = dateKey(day.getTime());
      const entry = routine[key];
      const felt = allSymptoms.filter(s => dateKey(s.at) === key).map(s => `${s.name} ${s.severity}/5`);
      rows.push([
        offset === 0 ? "Today" : day.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" }),
        show(entry?.sleepHours, " h"), show(entry?.activity, " min"), show(entry?.water, " mL"),
        show(entry?.caffeine, ""), "Not tracked", felt.join(", ") || "None logged"
      ]);
    }
    box.append(table(["Day", "Sleep", "Exercise", "Water", "Caffeinated drinks", "Meals", "Symptoms"], rows));
    if (member.journalOwner && !routine[localDate()]) {
      box.append(h("div", { class: "med-missing med-gap" },
        h("span", {}, h("span", { "aria-hidden": "true", text: "? " }), "Today's routine check-in is missing."),
        h("button", { class: "secondary", type: "button", text: "Open check-in", onclick: () => setView("checkin") })));
    }
  }

  function renderSymptoms() {
    const form = $("#med-symptom-form");
    if (!form.elements.at.value) form.elements.at.value = localDateTime(Date.now());
    const list = symptomsFor().slice(0, 12);
    $("#med-symptom-list").replaceChildren(list.length ? table(["Symptom", "Strength", "Noticed", "Note", ""],
      list.map(s => [
        s.name, `${s.severity} / 5`, `${formatTime(s.at)} · ${ago(s.at)}`,
        (s.note || "–") + (s.sample ? " (sample)" : ""),
        s.sample ? "–" : h("button", {
          class: "med-link is-delete", type: "button", text: "Delete",
          onclick: () => {
            if (!confirm("Delete this symptom entry? This cannot be undone.")) return;
            const previous = store.symptoms;
            store.symptoms = previous.filter(item => item.id !== s.id);
            if (!saveStore()) store.symptoms = previous;
            render();
            renderRoutineStrip();
          }
        })
      ])) : h("div", { class: "empty", text: `No symptoms logged for ${crew().name}.` }));
  }

  function summarySections() {
    const member = crew();
    const routine = member.journalOwner ? routineByDate() : {};
    const week = Date.now() - WEEK;
    const felt = symptomsFor().filter(s => s.at >= week);
    const days = Object.keys(routine).sort().reverse().slice(0, 3);
    return [
      ["Crew member", [
        `${member.name}, ${member.role}, age ${member.age}`,
        `${member.mission}, day ${member.missionDay} of ${member.missionLength}`
      ]],
      ["Health profile", [
        `Medical history: ${member.history}`, `Relevant conditions: ${member.conditions}`,
        `Medications: ${member.medications}`, `Allergies: ${member.allergies}`,
        `Personal baselines: ${ORDER.filter(type => member.baseline[type]).map(type => `${VITALS[type].name} ${member.baseline[type]}`).join("; ") || "not recorded"}`
      ]],
      ["Latest measurements", ORDER.map(type => {
        const def = VITALS[type];
        const list = readingsFor(type);
        const latest = list.at(-1);
        const status = assess(type, latest);
        return latest ?
          `${def.name}: ${def.format(latest)} ${def.unit} | ${STATUS[status.key].label} | ${formatTime(latest.at)} | ${latest.source}${latest.sample ? " (sample)" : ""} | Trend: ${trendOf(type, list).text}` :
          `${def.name}: no reading | ${STATUS.nodata.label}`;
      })],
      ["Symptoms, last 7 days", felt.length ? felt.map(s =>
        `${s.name}, strength ${s.severity}/5, ${formatTime(s.at)}${s.note ? ` - ${s.note}` : ""}${s.sample ? " (sample)" : ""}`) : ["None logged"]],
      ["Routine context, latest check-ins", !member.journalOwner ? ["Routine journal on this device is not linked to this crew member"] :
        days.length ? days.map(key => {
          const e = routine[key];
          return `${key}: sleep ${e.sleepHours ?? "not recorded"} h, exercise ${e.activity ?? "not recorded"} min, water ${e.water ?? "not recorded"} mL, caffeinated drinks ${e.caffeine ?? "not recorded"}, meals not tracked`;
        }) : ["No routine check-ins saved"]],
      ["Recommendations shown to the crew member", (list => list.length ? list.map(item =>
        `${item.title} (prompted by: ${item.why.filter(Boolean).join("; ")})`) : ["None"])(buildRecommendations())],
      ["Notes", [
        "Self-assessment and decision-support summary. Not a diagnosis.",
        "Statuses compare readings with general healthy-adult references. Mission-approved alert limits were not loaded.",
        "Recommendations come from a prototype rule set that is not yet mission-approved."
      ]]
    ];
  }

  function renderSummary() {
    const member = crew();
    const sections = summarySections();
    const consent = h("input", { type: "checkbox" });
    const exportButton = h("button", { class: "primary", type: "button", disabled: true }, "Export summary ", h("span", { "aria-hidden": "true", text: "↗" }));
    consent.addEventListener("change", () => { exportButton.disabled = !consent.checked; });
    exportButton.addEventListener("click", () => {
      const generated = new Date();
      const text = [`AMIGOS case summary`, `Generated: ${generated.toLocaleString("en")}`,
        `Sharing authorized by crew member on this device: ${generated.toISOString()}`, "",
        ...sections.flatMap(([title, lines]) => [title.toUpperCase(), ...lines.map(line => `- ${line}`), ""])
      ].join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      link.download = `amigos-case-summary-${member.name.toLowerCase().replace(/\s+/g, "-")}-${localDate()}.txt`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      showToast("Case summary exported as a file. Nothing was sent over a network.");
    });
    $("#med-summary").replaceChildren(
      h("section", { class: "step-panel" },
        h("div", { class: "panel-heading" },
          h("span", { class: "section-icon", "aria-hidden": "true", text: "▤" }),
          h("div", {},
            h("p", { class: "eyebrow", text: "CASE SUMMARY" }),
            h("h2", { text: `Summary for ${member.name}` }),
            h("p", { text: "One page for the medical team. It stays on this device until you export it." }))),
        ...sections.map(([title, lines]) => h("div", { class: "med-summary-section med-gap" },
          h("h3", { text: title }), h("ul", {}, ...lines.map(line => h("li", { text: line }))))),
        h("label", { class: "med-auth" }, consent,
          h("span", {}, `I am ${member.name}, or I have their permission, and I authorize sharing this summary with the mission medical team.`,
            h("span", { class: "field-hint", text: "Export creates a text file on this device. Hand it over through your mission's approved channel." }))),
        h("div", { class: "step-actions" },
          h("span", { class: "med-caption", text: "Export is locked until sharing is authorized." }), exportButton)));
  }

  function render() {
    renderIdentity();
    document.querySelectorAll("[data-med-tab]").forEach(panel => { panel.hidden = panel.dataset.medTab !== tab; });
    if (tab === "dash") renderDashboard();
    if (tab === "related") renderRelated();
    if (tab === "symptoms") renderSymptoms();
    if (tab === "summary") renderSummary();
  }

  /* ---------- Wiring ---------- */

  const crewSelect = $("#med-crew");
  CREW.forEach(member => crewSelect.append(h("option", { value: member.id, text: `${member.name} · ${member.role}` })));
  crewSelect.value = store.activeCrew;
  crewSelect.addEventListener("change", () => {
    store.activeCrew = crewSelect.value;
    detailType = null;
    system = null;
    if (storeReady) saveStore();
    render();
    renderRoutineStrip();
    showToast(`Now showing data for ${crew().name}.`);
  });

  document.querySelectorAll("[name=medtab]").forEach(input => {
    input.addEventListener("change", () => openTab(input.value));
  });

  SYMPTOMS.forEach(name => $("#med-symptom-chips").append(h("label", {},
    h("input", { type: "radio", name: "symptom", value: name, required: true }), h("span", { text: name }))));

  $("#med-symptom-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = $("#med-symptom-error");
    error.textContent = "";
    if (!form.elements.symptom.value) {
      error.textContent = "Choose what you are noticing.";
      return;
    }
    if (!form.elements.symptomSeverity.value) {
      error.textContent = "Choose how strong it is.";
      return;
    }
    const at = new Date(form.elements.at.value).getTime();
    if (!Number.isFinite(at) || at > Date.now() + 60000) {
      error.textContent = "Choose a time that is not in the future.";
      return;
    }
    store.symptoms.push({
      id: crypto.randomUUID(), crew: store.activeCrew, name: form.elements.symptom.value,
      severity: Number(form.elements.symptomSeverity.value), at, note: form.elements.note.value.trim()
    });
    if (!saveStore()) {
      store.symptoms.pop();
      return;
    }
    form.reset();
    showToast(`Symptom saved for ${crew().name}.`);
    render();
    renderRoutineStrip();
  });

  document.addEventListener("amigos:view", event => {
    renderRoutineStrip();
    if (event.detail === "medical") render();
  });

  // Redraw charts when the width changes. Height-only changes (an on-screen
  // keyboard) are ignored so a half-filled form is never cleared.
  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      if (!$("#medical-view").hidden) render();
    }, 200);
  });

  renderRoutineStrip();
  if (!storeReady) showToast("Saved medical entries could not be read. New entries will not be saved.");
})();
