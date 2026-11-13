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

  const STATUS = {
    within: { icon: "✓", label: "Within reference" },
    outside: { icon: "▲", label: "Outside reference" },
    recheck: { icon: "↻", label: "Needs recheck" },
    nodata: { icon: "?", label: "Insufficient data" }
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
    return problem ? { key: "outside", reason: problem } :
      { key: "within", reason: "Inside the general adult reference." };
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

  /* ---------- Recommendations ---------- */

  // Prototype rule set: prompts to recheck, complete data or contact the medical
  // team. Replace with mission-approved guidance before operational use.
  function buildRecommendations() {
    const list = [];
    const recentSymptoms = symptomsFor().filter(s => Date.now() - s.at < DAY);
    ORDER.forEach(type => {
      const def = VITALS[type];
      const latest = readingsFor(type).at(-1);
      const status = assess(type, latest);
      const lower = def.name === "ECG" || def.name === "SpO₂" ? def.name : def.name.toLowerCase();
      if (status.key === "outside") {
        const related = recentSymptoms.find(s => s.name === def.symptom);
        const why = [
          `${def.name} ${def.format(latest)} ${def.unit} · ${formatTime(latest.at)} · ${latest.source}`,
          `General adult reference: ${def.ref.text}`
        ];
        if (related) why.push(`${related.name} logged ${formatTime(related.at)}, strength ${related.severity}/5`);
        list.push({
          title: `Recheck your ${lower}`,
          action: related ?
            "Repeat the measurement using the steps shown. If the repeat is also outside the reference, or the symptom continues, contact the medical team using your mission procedure." :
            "Repeat the measurement using the steps shown. If it is still outside the reference, contact the medical team using your mission procedure.",
          why, target: "medical", button: ["Measure again", () => openDetail(type)]
        });
        const match = related && GROUPS.find(g => g.vitals.includes(type) && g.symptom === related.name);
        if (match) {
          list.push({
            title: `Look at ${lower} next to your routine`,
            action: "See these readings beside your sleep, activity, water and symptoms, so you can describe the full picture to the medical team.",
            why: [why[0], why[2]], target: "both", button: ["View together", () => openRelated(match.id)]
          });
        }
      }
      if (status.key === "recheck") {
        list.push({
          title: `Take a new ${lower} reading`,
          action: "A fresh reading is needed before this result can be compared with a reference.",
          why: [status.reason, `Last reading: ${def.format(latest)} ${def.unit} · ${formatTime(latest.at)} · ${latest.source}`],
          target: "medical", button: ["Measure now", () => openDetail(type)]
        });
      }
    });
    recentSymptoms.filter(s => s.severity >= 4).forEach(s => {
      list.push({
        title: `Tell the medical team about your ${s.name.toLowerCase()}`,
        action: "You rated this symptom strong or severe. Contact the medical team now using your mission procedure. This app does not judge urgency.",
        why: [`${s.name} logged ${formatTime(s.at)}, strength ${s.severity}/5`],
        target: "both", button: ["Open case summary", () => openTab("summary")]
      });
    });
    if (crew().journalOwner && !routineByDate()[localDate()]) {
      list.push({
        title: "Complete today's check-in",
        action: "Sleep, activity and water help put your measurements in context.",
        why: [`No routine check-in saved for today (${localDate()})`],
        target: "routines", button: ["Open check-in", () => setView("checkin")]
      });
    }
    return list;
  }

  const TARGET_LABEL = { medical: "Shown in: Medical view", routines: "Shown in: Routines", both: "Shown in: Medical view and Routines" };

  function recommendationCard(item, inRoutines) {
    const body = h("div", {},
      h("div", { class: "med-reco-tags" },
        h("span", { class: "tag", text: TARGET_LABEL[item.target] }),
        h("span", { class: "med-rule", text: "Prototype rule · not yet mission-approved" })),
      h("h3", { text: item.title }),
      h("p", { text: item.action }),
      h("div", { class: "med-why-title", text: "Prompted by" }),
      h("ul", { class: "med-why" }, ...item.why.filter(Boolean).map(line => h("li", { text: line }))));
    let button = null;
    if (!inRoutines) {
      button = h("button", { class: "secondary", type: "button", text: item.button[0], onclick: item.button[1] });
    } else if (item.target === "both") {
      button = h("button", {
        class: "secondary", type: "button", text: "Open in Medical view",
        onclick: () => { setView("medical"); item.button[1](); }
      });
    }
    return h("article", { class: "med-reco" }, body, button);
  }

  function renderRoutineStrip() {
    const box = $("#routine-recos");
    const items = buildRecommendations().filter(item => item.target !== "medical");
    box.replaceChildren();
    box.hidden = !items.length;
    if (!items.length) return;
    box.append(h("h2", { class: "med-h2", text: `From the Medical view · ${crew().name}` }),
      ...items.map(item => recommendationCard(item, true)));
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

  function vitalCard(type) {
    const def = VITALS[type];
    const list = readingsFor(type);
    const latest = list.at(-1);
    const status = assess(type, latest);
    const trend = trendOf(type, list);
    const from = Date.now() - WEEK;
    const value = latest ?
      h("div", { class: "med-value" }, def.format(latest), def.unit ? h("small", { text: def.unit }) : null) :
      h("div", { class: "med-value is-empty", text: "No reading" });
    const facts = h("dl", { class: "med-facts" },
      h("dt", { text: "Measured" }), h("dd", { text: latest ? `${formatTime(latest.at)} · ${ago(latest.at)}` : "Not measured" }),
      h("dt", { text: "Source" }), h("dd", { text: latest ? latest.source + (latest.sample ? " (sample)" : "") : "–" }));
    const spark = def.noTrend || list.length < 2 ? null : chart({
      series: [seriesFor(type, from)[0]], from, to: Date.now(), width: 110, height: 34, axes: false,
      label: `${def.name} trend: ${trend.text}`
    });
    const limit = MISSION_LIMITS[type];
    return h("article", { class: `med-card${detailType === type ? " is-open" : ""}` },
      h("div", { class: "med-card-head" },
        h("h3", {}, h("span", { "aria-hidden": "true", text: `${def.icon} ` }), def.name), pill(status.key)),
      value,
      h("p", { class: "med-reason", text: status.reason }),
      facts,
      h("div", { class: "med-trend" },
        h("span", {}, h("b", { "aria-hidden": "true", text: trend.icon }), `Trend: ${trend.text}`), spark),
      h("div", { class: "med-refs" },
        h("div", {}, h("b", { text: "General healthy-adult reference" }), `${def.ref.text}. Source: ${def.ref.source}.`),
        h("div", { class: "med-limit" }, h("b", { text: "Mission-approved alert limit" }),
          limit || "Not loaded. Supplied by the mission medical team."),
        def.noTrend ? null : h("div", {}, h("b", { text: "Your baseline" }), baselineNote(type, latest))),
      h("button", {
        class: "secondary", type: "button",
        text: def.noAuto ? "Details & how to record" : "Details & measure",
        onclick: () => openDetail(type)
      }));
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
    const width = $("#med-cards").clientWidth - 92;
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
    const recommendations = buildRecommendations();
    const here = recommendations.filter(item => item.target !== "routines");
    const elsewhere = recommendations.length - here.length;
    $("#med-recos").replaceChildren(
      ...(here.length ? here.map(item => recommendationCard(item, false)) :
        [h("p", { class: "med-quiet", text: `No recommendations for ${member.name} right now.` })]),
      elsewhere ? h("p", { class: "med-quiet" }, `${elsewhere} more in Routines. `,
        h("button", { class: "med-link", type: "button", text: "Open Daily check-in", onclick: () => setView("checkin") })) : null);

    $("#med-cards-title").textContent = `Latest measurements · ${member.name}`;
    $("#med-legend").replaceChildren(...Object.keys(STATUS).map(key => h("li", {}, pill(key))));
    $("#med-cards").replaceChildren(...ORDER.map(vitalCard));
    renderDetail();

    const missing = [];
    ORDER.forEach(type => {
      if (!readingsFor(type).length) {
        missing.push([`No ${VITALS[type].name} reading on file.`, VITALS[type].fields ? "Measure now" : "How to record", () => openDetail(type)]);
      }
    });
    if (!member.journalOwner) {
      missing.push([`The routine journal on this device is not linked to ${member.name}, so sleep, activity and water are unavailable.`]);
    } else if (!routineByDate()[localDate()]) {
      missing.push(["No routine check-in saved for today.", "Open check-in", () => setView("checkin")]);
    }
    if (!symptomsFor().some(s => Date.now() - s.at < DAY)) {
      missing.push(["No symptoms logged in the last 24 hours. Log one only if you notice something.", "Log a symptom", () => openTab("symptoms")]);
    }
    missing.push(["Meals are not tracked in Routines yet, so nutrition cannot be shown beside your measurements."]);
    $("#med-missing").replaceChildren(...missing.map(([text, label, run]) => h("div", { class: "med-missing" },
      h("span", {}, h("span", { "aria-hidden": "true", text: "? " }), text),
      label ? h("button", { class: "secondary", type: "button", text: label, onclick: run }) : null)));

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
