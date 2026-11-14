// Laboratory and Assessment views: offline self-assessment and decision support.
// They never diagnose. Content comes from js/data.js; helpers (records, showToast,
// localDate, setView) come from app.js.
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
  const DATA = AMIGOS.data;

  // Build the shape the rest of this file uses from the tests in js/data.js.
  const STALE_HOURS = { Daily: 24, Weekly: 8 * 24, Monthly: 32 * 24 };
  const VITALS = {};
  DATA.tests.forEach(test => {
    const numeric = test.input === "number";
    const fields = test.fields || [];
    const decimals = test.decimals || 0;
    const bands = fields.map((f, i) => ({ lo: f.lo, hi: f.hi, i }))
      .filter(b => b.lo !== undefined && b.hi !== undefined);
    VITALS[test.id] = {
      ...test, decimals, bands,
      noAuto: !numeric, noTrend: !numeric, noRange: !bands.length,
      step: test.step || 1,
      staleHours: STALE_HOURS[test.frequency] || Infinity,
      format: r => numeric ? r.v.map(n => Number(n).toFixed(decimals)).join("/") :
        test.input === "image" ? "Image saved" : "Recording saved",
      fields: numeric ? fields.map(f => [f.label, f.min, f.max]) : null,
      series: fields.length ? fields.map(f => f.short || f.label) : [test.name],
      ref: { text: test.refText, source: test.source },
      check: r => {
        for (const b of bands) {
          if (r.v[b.i] < b.lo) return `Below the reference: ${test.refText}.`;
          if (r.v[b.i] > b.hi) return `Above the reference: ${test.refText}.`;
        }
        return null;
      }
    };
  });
  const ORDER = DATA.tests.map(test => test.id);

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

  const GROUPS = [
    { id: "circulation", label: "Blood pressure + heart rate + dizziness", vitals: ["bp", "hr"], symptom: "Dizziness" },
    { id: "breathing", label: "SpO₂ + respiratory rate + shortness of breath", vitals: ["spo2", "rr"], symptom: "Shortness of breath" },
    { id: "recovery", label: "Temperature + heart rate + tiredness", vitals: ["temp", "hr"], symptom: "Unusual tiredness" }
  ];

  /* ---------- Sample crew (prototype data) ---------- */

  const CREW = DATA.crew;

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
    ...sample("c3", "temp", [[6, 36.4]]),
    ...sample("c1", "glucose", [[20, 92]]),
    ...sample("c1", "hgb", [[200, 14.1]]),
    ...sample("c1", "urine", [[44, 1.018]]),
    ...sample("c1", "mass", [[164, 71.2], [20, 71.4]]),
    ...sample("c2", "mass", [[44, 82.0]])
  ];
  const SAMPLE_SYMPTOMS = [
    { id: "sample-s1", crew: "c1", name: "Dizziness", severity: 2, at: loadedAt - 3 * HOUR, note: "When standing up after exercise", sample: true },
    { id: "sample-s2", crew: "c1", name: "Dizziness", severity: 1, at: loadedAt - 27 * HOUR, note: "", sample: true }
  ];
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
  // Tests the user has unticked as not carried on this vehicle, and the assessment period.
  if (!Array.isArray(store.unavailable)) store.unavailable = [];
  if (![7, 30, 90].includes(store.period)) store.period = 7;
  const available = id => !store.unavailable.includes(id);
  const span = () => store.period * DAY;

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

  const crew = () => CREW.find(member => member.id === AMIGOS.crewId());
  const readingsFor = type => [...SAMPLE_READINGS, ...store.measurements]
    .filter(r => r.crew === AMIGOS.crewId() && r.type === type).sort((a, b) => a.at - b.at);
  const symptomsFor = () => [...SAMPLE_SYMPTOMS, ...store.symptoms]
    .filter(s => s.crew === AMIGOS.crewId()).sort((a, b) => b.at - a.at);

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

  // Text with web addresses turned into links.
  function withLinks(text) {
    return String(text).split(/(https?:\/\/[^\s;,)]+)/).map(part => /^https?:\/\//.test(part) ?
      h("a", { href: part, target: "_blank", rel: "noopener noreferrer", text: part }) : part);
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
    if (def.noRange) return { key: "nodata", reason: "No general reference. Followed against your own earlier results." };
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
    // Only the active crew member's check-ins (older entries belong to the first crew member).
    const list = (typeof records === "undefined" ? [] : records)
      .filter(record => (record.crew || CREW[0].id) === AMIGOS.crewId());
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
      // About eight date labels whatever the period: weekdays for a week, dates beyond that.
      const days = (options.to - options.from) / DAY;
      const stride = Math.max(1, Math.ceil(days / 8));
      const format = days > 10 ? { day: "numeric", month: "short" } : { weekday: "short" };
      const tick = new Date(options.from);
      tick.setHours(24, 0, 0, 0);
      for (; tick.getTime() < options.to; tick.setDate(tick.getDate() + stride)) {
        const tx = n(x(tick.getTime()));
        svg += `<line class="med-axis" x1="${tx}" x2="${tx}" y1="${top}" y2="${height - bottom}"/>` +
          `<text class="med-tick" x="${tx}" y="${height - 8}" text-anchor="middle">${tick.toLocaleDateString("en", format)}</text>`;
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
    if (!list.length) return `${def.name}: no readings in the selected period.`;
    return `${def.name}, selected period: ${list.length} readings, latest ${def.format(list.at(-1))} ${def.unit}.`;
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
      name: "Sleep", unit: "h", get: e => e.sleepHours, decimals: 1, lo: 7, hi: 9, short: "the 7–9 h reference",
      ref: "7–9 h of sleep per night."
    },
    mind: {
      name: "Mind & mood", unit: "/ 5", get: e => e.mind ?? e.mood, decimals: 1, lo: 3, hi: 5, short: "the 3–5 part of the scale",
      ref: "Average of your daily mental health answers (1–5); below 3 counts as low. Not a clinical score."
    },
    nutrition: {
      name: "Appetite", unit: "/ 5", get: e => e.appetite, lo: 3, hi: 5, short: "the 3–5 part of the scale",
      ref: "Your own 1–5 appetite rating; 1–2 counts as low. Not a clinical score."
    },
    water: {
      name: "Water", unit: "mL", get: e => e.water, own: true, short: "your own average for the period (±20%)",
      ref: "Compared with your own average for the period. The mission fluid plan is not loaded."
    },
    activity: {
      name: "Exercise", unit: "min", get: e => e.activity, own: true, short: "your own average for the period (±20%)",
      ref: "Compared with your own average for the period. The mission exercise plan is not loaded."
    }
  };

  // Body systems from js/data.js, each with its available tests and daily indicators.
  const systems = () => DATA.systems.map(item => ({
    ...item,
    ids: [...ORDER.filter(id => VITALS[id].system === item.id && available(id)), ...item.routine]
  }));
  const allIds = () => systems().flatMap(item => item.ids);

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
      refText: `${def.ref.text}.`,
      decimals: def.decimals, bands: def.bands, series: seriesFor(id, Date.now() - span())
    };
    if (!latest || def.noAuto || def.noRange) return out;
    // Draw the ring from the value that is out of range (for example diastolic), else the first.
    const band = def.bands.find(b => zoneOf(latest.v[b.i], b.lo, b.hi) !== "normal") || def.bands[0];
    out.pct = percentOf(latest.v[band.i], band.lo, band.hi);
    const week = list.filter(r => r.at >= Date.now() - span());
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
    const out = {
      id, kind: "routine", name: def.name, unit: def.unit, zone: "nodata", pct: null, bigText: "–",
      valueText: "not recorded", when: "From your Daily check-in", refText: def.ref,
      decimals: def.decimals || 0, bands: [], series: [{ label: def.name, points: [] }]
    };
    const journal = routineByDate();
    const entries = Object.values(journal)
      .map(e => ({ raw: def.get(e), date: e.date }))
      .filter(e => e.raw !== null && e.raw !== undefined && e.raw !== "")
      // Plot each check-in at midday, but never later than now.
      .map(e => ({ t: Math.min(new Date(`${e.date}T12:00`).getTime(), Date.now()), v: Number(e.raw), date: e.date }))
      .filter(e => Number.isFinite(e.v) && e.t >= Date.now() - span()).sort((a, b) => a.t - b.t);
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

  // PLACEHOLDER rule set until the research team's table is loaded. Each rule looks at
  // the current result, its average over the chosen period and related indicators
  // (temperature, mind and mood, fluids, sleep, symptoms). It says what the person can
  // do, with a mental approach where it fits, and when to contact the flight surgeon.
  // It never names a condition.
  const activitiesFor = tags => DATA.activities.filter(a => a.goodFor.some(tag => tags.includes(tag)))
    .slice(0, 3).map(a => a.name);
  const ACTIVITY_TAGS = { mind: ["mood", "connection", "calm"], sleep: ["sleep", "calm"], activity: ["activity", "energy"] };

  function buildRecommendations() {
    const list = [];
    const ids = allIds();
    const has = id => ids.includes(id);
    const all = Object.fromEntries([...ORDER, ...Object.keys(ROUTINE)].map(id => [id, indicator(id)]));
    const recentSymptoms = symptomsFor().filter(s => Date.now() - s.at < DAY);
    const catalog = Object.fromEntries(DATA.symptoms.map(item => [item.name, item]));
    const used = new Set();
    const lower = x => ["ECG", "SpO₂"].includes(x.name) ? x.name : x.name.toLowerCase();
    const word = zone => STATUS[zone].label.toLowerCase();
    const line = x => `${x.name} now ${x.valueText} (${word(x.zone)})` +
      (x.avgText ? ` · period average ${x.avgText}${x.avgZone ? ` (${word(x.avgZone)})` : ""}` : "");
    const symptomLine = name => {
      const item = recentSymptoms.find(entry => entry.name === name);
      return item ? `${item.name} logged ${formatTime(item.at)}, strength ${item.severity}/5` : null;
    };
    const linkedSymptom = id => (DATA.symptoms.find(item => item.tests.includes(id) && symptomLine(item.name)) || {}).name;
    const measure = id => ["Measure again", () => openDetail(id)];
    const checkin = ["Open check-in", () => setView("checkin"), "routines"];
    const { bp, hr, temp, water, sleep, mind } = all;

    // Signs and symptoms decide first: fast response, or tests for a better recommendation.
    const seen = new Set();
    recentSymptoms.forEach(entry => {
      const info = catalog[entry.name];
      if (!info || seen.has(entry.name)) return;
      seen.add(entry.name);
      const logged = `${entry.name} logged ${formatTime(entry.at)}, strength ${entry.severity}/5`;
      if (info.urgency === "now" || entry.severity >= 4) {
        list.push({
          urgent: true,
          title: `Contact the flight surgeon now: ${entry.name.toLowerCase()}`,
          action: "This needs a fast response. Contact the flight surgeon using your mission procedure. Run tests only if that does not delay the call.",
          why: [logged, info.urgency === "now" ? "This symptom is marked as needing a fast response" : "You rated it strong or severe"],
          rule: "now", symptoms: [info],
          button: ["Open case summary", () => openTab("summary")]
        });
      } else if (info.urgency === "tests") {
        const missing = info.tests.filter(id => has(id) && !((readingsFor(id).at(-1) || {}).at >= entry.at - HOUR));
        if (missing.length) {
          list.push({
            title: `Run tests for your ${entry.name.toLowerCase()}`,
            action: `These results will give you a better recommendation: ${missing.map(id => VITALS[id].name).join(", ")}.`,
            why: [logged, "No result for these tests since the symptom was logged"],
            mental: info.care,
            rule: "tests", tests: missing, symptoms: [info],
            button: ["Enter a result", () => openDetail(missing[0])]
          });
        }
      }
    });

    // Blood pressure together with body fluids and dizziness.
    if (has("bp") && bp.zone === "below" && water.zone !== "normal" && water.zone !== "over") {
      list.push({
        title: "Check your fluids, then recheck blood pressure",
        action: "Log today's water in the Daily check-in and follow your mission fluid plan, then repeat the reading. If it is still low or you feel dizzy, contact the flight surgeon.",
        why: [line(bp), water.zone === "nodata" ? "Water: not recorded in the Daily check-in" : line(water), symptomLine("Dizziness")],
        mental: "Move slowly when you change position, and pause before starting a task.",
        rule: "bpfluids", tests: ["bp"],
        button: measure("bp")
      });
      used.add("bp").add("water");
    }
    // Temperature together with heart rate.
    const baseHr = crew().baselineValue.hr;
    const hrNow = readingsFor("hr").at(-1);
    const hrRaised = hr.zone === "over" || (hrNow && baseHr && hrNow.v[0] - baseHr >= 15);
    if (has("temp") && has("hr") && temp.zone === "over" && hrRaised) {
      list.push({
        title: "Recheck temperature and heart rate together",
        action: "Rest for 15 minutes, drink water, then repeat both. If both are still raised, contact the flight surgeon using your mission procedure.",
        why: [line(temp), line(hr), baseHr ? `Heart rate baseline ${baseHr} bpm` : null, symptomLine("Fever or chills")],
        rule: "temphr", tests: ["temp", "hr"],
        button: measure("temp")
      });
      used.add("temp").add("hr");
    }
    // Mind and mood together with sleep.
    if (mind.zone === "below" && (sleep.zone === "below" || sleep.avgZone === "below")) {
      list.push({
        title: "Protect your sleep and do one thing for your mood",
        action: "Low mood is showing alongside short sleep. Keep your scheduled sleep period tonight and dim the lights an hour before. If this continues for several days, talk to the flight surgeon.",
        why: [line(mind), line(sleep)],
        mental: "Pick one small thing you can finish today, and tell a crewmate how you are doing.",
        activities: activitiesFor(["mood", "connection", "sleep"]),
        rule: "moodsleep", tests: [],
        button: checkin
      });
      used.add("mind").add("sleep");
    }
    // Every other indicator: compare the current result with its average for the period.
    ids.forEach(id => {
      const x = all[id];
      if (used.has(id)) return;
      const vital = x.kind === "vital";
      const tags = ACTIVITY_TAGS[id];
      if (flagged(x) && x.avgZone === x.zone) {
        list.push({
          title: `${x.name} has stayed ${x.zone === "below" ? "below" : "over"} the normal range`,
          action: "This has been out of range for a while, not just today. Tell the flight surgeon.",
          why: [line(x), `Reference: ${x.refText}`, symptomLine(linkedSymptom(id))],
          activities: tags && activitiesFor(tags),
          rule: "stayed", tests: vital ? [id] : [],
          button: vital ? measure(id) : checkin
        });
      } else if (flagged(x)) {
        list.push({
          title: vital ? `Recheck your ${lower(x)}` : `${x.name} is ${x.zone === "below" ? "below" : "over"} your normal range`,
          action: vital ?
            "One reading can be off. Rest a few minutes and measure once more. If it is still out of range, contact the flight surgeon." :
            "Follow your mission plan today and log it in the Daily check-in. If it continues for several days, tell the flight surgeon.",
          why: [line(x), `Reference: ${x.refText}`, symptomLine(linkedSymptom(id))],
          activities: tags && activitiesFor(tags),
          rule: "differs", tests: vital ? [id] : [],
          button: vital ? measure(id) : checkin
        });
      } else if (x.zone === "normal" && x.avgZone && x.avgZone !== "normal") {
        list.push({
          title: `Keep watching your ${lower(x)}`,
          action: `Today's result is fine, but it has been running ${x.avgZone === "below" ? "low" : "high"} lately. Keep recording it so the trend is clear.`,
          why: [line(x), `Reference: ${x.refText}`],
          rule: "watch", tests: vital ? [id] : [],
          button: vital ? measure(id) : checkin
        });
      } else if (x.zone === "recheck") {
        list.push({
          title: `Take a new ${lower(x)} reading`,
          action: "A fresh reading is needed before this result can be compared with the normal range.",
          why: [x.reason, `Last reading: ${x.valueText} · ${x.when}`],
          rule: "recheck", tests: [id],
          button: ["Measure now", () => openDetail(id)]
        });
      }
    });
    if (!routineByDate()[localDate()]) {
      list.push({
        title: "Complete today's check-in",
        action: "Sleep, food, water, mood and exercise feed the assessment and its recommendations.",
        why: [`No Daily check-in saved for today (${localDate()})`],
        rule: "checkin", tests: [],
        button: checkin
      });
    }
    // Anything needing a fast response goes first.
    return list.sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)));
  }

  // The same list is shown in the Assessment, the Laboratory flow and the Daily check-in.
  function recommendationCard(item, inRoutines) {
    const [label, run, view] = item.button;
    const button = inRoutines && view === "routines" ? null :
      h("button", { class: "secondary", type: "button", text: label, onclick: run });
    return h("article", { class: `med-reco${item.urgent ? " is-urgent" : ""}` },
      h("div", {},
        h("h3", {}, item.urgent ? h("span", { "aria-hidden": "true", text: "▲ " }) : null, item.title),
        h("p", { text: item.action }),
        item.mental ? h("p", { class: "med-try", text: `Mental approach: ${item.mental}` }) : null,
        item.activities && item.activities.length ?
        h("p", { class: "med-try", text: `Activities to try: ${item.activities.join(" · ")}` }) : null),
      button);
  }

  // Kept for the documentation build; not shown in the interface (the team wants the screens simple).
  // eslint-disable-next-line no-unused-vars
  function evidencePanel(item) {
    const rule = (DATA.rules || {})[item.rule];
    if (!rule) return null;
    const rows = [];
    (rule.sources || []).forEach(id => {
      const src = DATA.sources[id];
      if (!src) return;
      rows.push(h("li", {}, `${src.title} (${src.org}) `,
        src.url ? h("a", { href: src.url, target: "_blank", rel: "noopener noreferrer", text: "Open document" }) :
          h("span", { class: "med-quiet", text: "· link pending" })));
    });
    (item.tests || []).forEach(id => {
      const test = DATA.tests.find(t => t.id === id);
      if (!test) return;
      rows.push(h("li", { text: `${test.name}: ${test.refText}. Source: ${test.source}.` }));
      const system = DATA.systems.find(s => s.id === test.system);
      if (system) rows.push(h("li", { text: `Spaceflight link (${system.hazards.map(k => DATA.hazards[k]).join(", ")}): ${system.explain}` }));
    });
    (item.symptoms || []).forEach(info => {
      const parts = [];
      if (info.urgentWhen) parts.push(`Becomes urgent when: ${info.urgentWhen}.`);
      if (info.hazards) parts.push(`Related hazards: ${info.hazards}.`);
      parts.push(info.source ? `Source: ${info.source}` : "Source pending.");
      rows.push(h("li", {}, h("b", { text: `${info.name}: ` }), ...withLinks(parts.join(" "))));
    });
    const placeholder = rows.some(r => r.textContent.includes("PLACEHOLDER"));
    return h("details", { class: "med-evidence" },
      h("summary", { text: "Evidence" }),
      h("p", {}, h("strong", { text: rule.kind === "guidance" ? "Published reference ranges. " : "App suggestion, not yet sourced. " }), rule.note),
      rows.length ? h("ul", {}, ...rows) : h("p", { class: "med-quiet", text: "Source pending." }),
      placeholder ? h("p", { class: "med-quiet", text: "Some ranges here are placeholders until the research team's source is loaded." }) : null);
  }

  const RULE_NOTE = "Placeholder rules until the research data is loaded. Decision support only, never a diagnosis.";

  let stripOpen = false;

  function renderRoutineStrip() {
    const box = $("#routine-recos");
    const items = buildRecommendations();
    box.replaceChildren();
    box.hidden = !items.length;
    if (!items.length) return;
    const details = h("details", { class: "med-profile", open: stripOpen || items.some(item => item.urgent) },
      h("summary", {}, `${items.length} recommendation${items.length > 1 ? "s" : ""} `,
        h("span", { text: `· ${crew().name} · same list as the Assessment` })),
      ...items.map(item => recommendationCard(item, true)),
      h("p", { class: "med-quiet med-rule-note", text: RULE_NOTE }));
    details.addEventListener("toggle", () => { stripOpen = details.open; });
    box.append(details);
  }

  /* ---------- Navigation inside the Assessment ---------- */

  // One section serves two destinations in the sidebar.
  const MODES = {
    lab: {
      tabs: ["tests", "symptoms"], title: "Laboratory", eyebrow: "TESTS, SIGNS AND SYMPTOMS",
      text: "Choose the tests your vehicle carries, enter results, and check signs and symptoms."
    },
    assess: {
      tabs: ["dash", "related", "summary"], title: "Assessment", eyebrow: "YOUR HEALTH OVER TIME",
      text: "Daily check-ins and lab tests for one person, over the period you choose."
    }
  };
  let mode = "lab";

  function openTab(name) {
    tab = name;
    const need = Object.keys(MODES).find(key => MODES[key].tabs.includes(name));
    // Changing view redraws through the amigos:view event.
    if (need !== mode || $("#medical-view").hidden) setView(need);
    else render();
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function openDetail(type) {
    detailType = type;
    if ($("#medical-view").hidden) setView("lab");
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
        h("span", { text: x.avgText ? `Period average ${x.avgText}${x.avgZone ? ` · ${STATUS[x.avgZone].label}` : ""}` : "Period average: not enough results" }),
        h("span", { text: x.when })));
  }

  // Worst zone across a body system's indicators.
  function systemZone(item, all) {
    const zones = item.ids.map(id => all[id].zone);
    return ["below", "over", "recheck"].find(zone => zones.includes(zone)) ||
      (zones.includes("normal") ? "normal" : "nodata");
  }

  const BODY_MARKS = {
    brain: [110, 24], eyes: [117, 46], lungs: [93, 110], heart: [120, 130],
    blood: [131, 158], fluids: [110, 188], muscle: [86, 256]
  };
  const ORGANS = {
    brain: "M96 30 C96 16 124 16 124 30 C124 37 118 38 110 38 C102 38 96 37 96 30 Z M110 18 L110 38",
    eyes: "M98 46 a5 3 0 1 0 10 0 a5 3 0 1 0 -10 0 Z M112 46 a5 3 0 1 0 10 0 a5 3 0 1 0 -10 0 Z",
    lungs: "M104 96 C92 98 84 112 84 134 C92 140 102 138 104 132 Z M116 96 C128 98 136 112 136 134 C128 140 118 138 116 132 Z M110 86 L110 100",
    heart: "M120 140 C108 132 108 120 116 120 C119 120 120 123 120 124 C120 123 122 120 125 120 C132 120 132 132 120 140 Z",
    blood: "M124 158 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0 Z",
    fluids: "M110 170 C118 180 122 186 122 192 C122 199 117 204 110 204 C103 204 98 199 98 192 C98 186 102 180 110 170 Z",
    muscle: "M82 230 C80 226 86 224 86 229 C87 224 93 226 90 231 L89 281 C93 285 87 289 86 284 C85 289 79 285 83 281 Z"
  };

  function bodyFigure(all) {
    const on = id => system === id ? " is-on" : "";
    let marks = "";
    let organs = "";
    systems().forEach(item => {
      const [x, y] = BODY_MARKS[item.id];
      const zone = systemZone(item, all);
      organs += `<path class="med-organ${on(item.id)}" d="${ORGANS[item.id]}"/>`;
      marks += `<g class="med-mark med-mark-${zone}${on(item.id)}" data-system="${item.id}" role="button" tabindex="0" ` +
        `aria-pressed="${system === item.id}" aria-label="${item.name}: ${STATUS[zone].label}">` +
        `<line x1="${x + 10}" y1="${y}" x2="194" y2="${y}"/><circle class="med-mark-halo" cx="${x}" cy="${y}" r="10"/>` +
        `<circle class="med-mark-core" cx="${x}" cy="${y}" r="4.5"/>` +
        `<text x="199" y="${y + 4}">${item.mark} ${STATUS[zone].icon}</text></g>`;
    });
    const wrap = h("div", { class: "med-body" });
    // Fixed labels from js/data.js only: no user text reaches this markup.
    wrap.innerHTML = `<svg viewBox="34 4 330 388" role="group" aria-label="Body systems. Select one to filter the results.">` +
      `<ellipse class="med-skin" cx="110" cy="38" rx="22" ry="27"/>` +
      `<path class="med-skin" d="M96 68 L124 68 C132 78 150 80 158 90 C166 100 168 120 170 150 L176 200 C178 214 166 216 164 204 L156 150 L152 118 L150 170 C150 190 154 200 154 214 L150 290 L146 372 C146 384 124 384 124 372 L122 300 L114 226 L110 222 L106 226 L98 300 L96 372 C96 384 74 384 74 372 L70 290 L66 214 C66 200 70 190 70 170 L68 118 L64 150 L56 204 C54 216 42 214 44 200 L50 150 C52 120 54 100 62 90 C70 80 88 78 96 68 Z"/>` +
      organs + marks + `</svg>`;
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
    const visible = system ? systems().find(item => item.id === system).ids : allIds();
    if (!visible.includes(picked)) picked = visible[0];
    render();
  }

  function readingForm(type) {
    const def = VITALS[type];
    if (!def.fields) {
      return h("p", { class: "helper-note", text: `${def.name} is captured by the ${def.device.toLowerCase()}, so there is nothing to type in. ` +
        "Planned: on-device analysis of the recording or image for signal quality, attached to the case summary for the flight surgeon." });
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
      store.measurements.push({ id: crypto.randomUUID(), crew: AMIGOS.crewId(), type, v, at, source: source.value });
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
    const from = Date.now() - span();
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
          h("p", { text: `Why: ${def.why} Reference: ${def.ref.text}.` })),
        h("button", { class: "secondary", type: "button", text: "Close", onclick: () => { detailType = null; render(); } })),
      h("h3", { class: "med-sub med-first", text: "Selected period" }),
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

  // Daily routine and lab tests on one scale: every result is placed on its own
  // normal range (25–75%), so different devices and units can be compared.
  function combinedSeries(from) {
    const scored = ["sleep", "mind", "nutrition"];
    const daily = Object.values(routineByDate()).map(entry => {
      const parts = scored.map(id => {
        const value = ROUTINE[id].get(entry);
        return value === null || value === undefined || value === "" ? null : percentOf(Number(value), ROUTINE[id].lo, ROUTINE[id].hi);
      }).filter(part => part !== null);
      return parts.length ? { t: Math.min(new Date(`${entry.date}T12:00`).getTime(), Date.now()), v: mean(parts) } : null;
    }).filter(point => point && point.t >= from).sort((a, b) => a.t - b.t);
    const byDay = {};
    ORDER.filter(available).forEach(id => {
      const def = VITALS[id];
      if (def.noAuto || def.noRange) return;
      readingsFor(id).filter(r => r.at >= from).forEach(r => {
        const band = def.bands.find(b => zoneOf(r.v[b.i], b.lo, b.hi) !== "normal") || def.bands[0];
        (byDay[dateKey(r.at)] = byDay[dateKey(r.at)] || []).push({ t: r.at, p: percentOf(r.v[band.i], band.lo, band.hi) });
      });
    });
    const lab = Object.values(byDay).map(list => ({ t: mean(list.map(x => x.t)), v: mean(list.map(x => x.p)) }))
      .sort((a, b) => a.t - b.t);
    return [{ label: "Lab tests", points: lab }, { label: "Daily routine", points: daily }];
  }


  /* ---------- Mission hazards: NASA's five hazards as editable parameters ---------- */

  // Values come from NASA pages that were read; `src` says which. A value with no NASA figure is null and
  // shows as "not loaded". Nothing is rated good or bad: each ring only shows the value against a display
  // scale, and any value can be typed over by hand for testing.
  const HRP = "NASA, 5 Hazards of Human Spaceflight, https://www.nasa.gov/hrp/hazards/";
  const MOON = "NASA Science, Moon Facts, https://science.nasa.gov/moon/facts/";
  const PLACES = [
    { id: "iss", name: "International Space Station (low Earth orbit)", values: {
      radiation: { v: null, src: "No ISS dose rate on the NASA pages read. Enter the mission's dosimeter value." },
      gravity: { v: 0, src: "Weightless in orbit. " + HRP },
      distance: { v: 386, src: "The station orbits 240 miles above Earth, about 386 km. NASA, The Human Body in Space, https://www.nasa.gov/humans-in-space/the-human-body-in-space/" },
      delay: { v: null, src: "Not stated on the NASA pages read." },
      journey: { v: null, src: "Not stated on the NASA pages read." },
      pressure: { v: null, src: "No cabin pressure on the NASA pages read. Enter the mission's value." } } },
    { id: "moon", name: "Moon surface base", values: {
      radiation: { v: null, src: "No Moon surface dose rate on the NASA pages read." },
      gravity: { v: 0.17, src: "One-sixth of Earth's gravity. " + MOON },
      distance: { v: 384400, src: "Average distance. " + MOON },
      journey: { v: 3, src: "NASA contrasts the Mars trip with a three-day lunar trip. " + HRP },
      delay: { v: 0.02, src: "Calculated: 384,400 km (" + MOON + ") at the speed of light is about 1.3 seconds." },
      pressure: { v: null, src: "Not loaded." } } },
    { id: "marsTransit", name: "Mars transit spacecraft", values: {
      radiation: { v: 1.8, src: "NASA JPL, Data From NASA Rover's Voyage to Mars Aids Planning (2013), average 1.8 mSv/day of galactic cosmic rays on the trip, quiet solar period. https://www.jpl.nasa.gov/news/data-from-nasa-rovers-voyage-to-mars-aids-planning/" },
      gravity: { v: 0, src: "Weightless on the six-month trek. https://www.nasa.gov/hrp/hazard-gravity-fields/" },
      distance: { v: 225000000, src: "Mars is 140 million miles from Earth on average, about 225 million km. " + HRP },
      journey: { v: 180, src: "A six-month trek. https://www.nasa.gov/hrp/hazard-gravity-fields/" },
      delay: { v: 20, src: "NASA says up to 20 minutes one way. " + HRP },
      pressure: { v: null, src: "Not loaded." } } },
    { id: "marsSurface", name: "Mars surface base", values: {
      radiation: { v: 0.67, src: "NASA, NASA Rover Results Include First Age Measurement on Mars and Help for Human Exploration (2013), average 0.67 mSv/day, Aug 2012 to Jun 2013. https://www.nasa.gov/news-release/nasa-rover-results-include-first-age-measurement-on-mars-and-help-for-human-exploration/" },
      gravity: { v: 0.38, src: "Three-eighths of Earth's gravity. " + HRP },
      distance: { v: 225000000, src: "Mars is 140 million miles from Earth on average, about 225 million km. " + HRP },
      journey: { v: 180, src: "A six-month trek. https://www.nasa.gov/hrp/hazard-gravity-fields/" },
      delay: { v: 20, src: "NASA says up to 20 minutes one way. " + HRP },
      pressure: { v: null, src: "Not loaded." } } },
    { id: "analog", name: "Earth analog mission (like HERA)", values: {
      radiation: { v: null, src: "Not loaded." },
      gravity: { v: 1, src: "Earth gravity." },
      distance: { v: 0, src: "On Earth." },
      journey: { v: null, src: "Not applicable." },
      delay: { v: 5, src: "NASA, Houston, Do You Copy? HERA Crew Navigates Communication Delays (2022), delays of up to five minutes each way. https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/" },
      pressure: { v: null, src: "Not loaded." } } }
  ];

  // One parameter per hazard, shown as a ring. `max` is only the display scale.
  const HAZARD_PARAMS = [
    { key: "radiation", param: "radiation", label: "Radiation dose rate", unit: "mSv/day", max: 3, decimals: 2, step: 0.01 },
    { key: "isolation", param: "mission", label: "Days into the mission", unit: "days", max: null, decimals: 0, step: 1 },
    { key: "distance", param: "distance", label: "Distance from Earth", unit: "km", log: [100, 225000000], decimals: 0, step: 1,
      extras: [
        { param: "journey", label: "One-way journey time", unit: "days", step: 1 },
        { param: "delay", label: "One-way message delay", unit: "min", step: 0.01 }
      ] },
    { key: "gravity", param: "gravity", label: "Gravity", unit: "g", max: 1, decimals: 2, step: 0.01 },
    { key: "environment", param: "pressure", label: "Cabin pressure", unit: "kPa", max: 101.3, decimals: 1, step: 0.1 }
  ];

  // What NASA's hazard pages say, in short. Health risks are a watch list, never a diagnosis.
  const HAZARD_INFO = {
    radiation: {
      about: "Invisible ionizing radiation from galactic cosmic rays and solar storms, outside Earth's magnetic field and atmosphere.",
      watch: ["Increased cancer risk", "Damage to the central nervous system", "Altered cognitive function", "Reduced motor function", "Behavioural changes"],
      url: "https://www.nasa.gov/hrp/hazard-space-radiation/", title: "NASA, Hazard: Space Radiation (updated Jun 2025)"
    },
    isolation: {
      about: "Behavioural responses of crews isolated and confined in a small space for a long time. Sleep loss, circadian disruption and work overload add to it.",
      watch: ["Decreased performance", "Behavioural, cognitive or psychiatric problems", "Sleep loss and fatigue", "Adverse health outcomes"],
      url: "https://www.nasa.gov/hrp/hazard-isolation-and-confinement/", title: "NASA, Hazard: Isolation and Confinement (updated Aug 2024)"
    },
    distance: {
      about: "How far the crew is from Earth, how long the journey takes and how long messages take. Supplies, equipment and medical care get harder to reach, so everything must be brought along.",
      watch: ["Equipment failures and medical emergencies with limited medical resources", "Need for self-sufficiency and planning", "All food, equipment and medical supplies must be carried"],
      url: "https://www.nasa.gov/hrp/hazard-distance-from-earth/", title: "NASA, Hazard: Distance From Earth (updated Aug 2024)"
    },
    gravity: {
      about: "Weightlessness in flight, partial gravity on the Moon or Mars, then readjusting to Earth's gravity.",
      watch: ["Dizziness and space motion sickness", "Lightheadedness or fainting after weightlessness", "Bone loss (about 1 to 1.5% of mineral density a month on average) and muscle loss",
        "Vision problems from fluid shifting toward the head", "Kidney stone risk from dehydration and calcium loss"],
      url: "https://www.nasa.gov/hrp/hazard-gravity-fields/", title: "NASA, Hazard: Gravity Fields (updated Aug 2024)"
    },
    environment: {
      about: "Keeping a safe spacecraft ecosystem: temperature, pressure, lighting, noise, crowding and microbes.",
      watch: ["Microbes that change and spread more easily in a closed habitat", "Raised stress hormones and altered immune response, which may raise allergy or illness risk (NASA says more research is needed)"],
      url: "https://www.nasa.gov/hrp/hazard-hostile-closed-environments/", title: "NASA, Hazard: Hostile/Closed Environments (updated Aug 2024)"
    }
  };

  if (!store.env || typeof store.env !== "object") store.env = { place: "iss", edits: {} };
  if (!PLACES.some(item => item.id === store.env.place)) store.env.place = "iss";
  if (!store.env.edits || typeof store.env.edits !== "object") store.env.edits = {};

  const place = () => PLACES.find(item => item.id === store.env.place);
  // The value shown: a manual edit if there is one, otherwise NASA's figure for this place.
  function hazardValue(def) {
    const edits = store.env.edits;
    if (Object.prototype.hasOwnProperty.call(edits, def.param)) return { v: edits[def.param], src: "Changed by hand for testing." };
    if (def.param === "mission") return { v: crew().missionDay, src: `From ${crew().name}'s profile (sample crew data).` };
    return place().values[def.param];
  }

  function hazardRing(def, value) {
    const radius = 25;
    const length = 2 * Math.PI * radius;
    const max = def.max || crew().missionLength;
    const has = typeof value === "number" && Number.isFinite(value);
    const clamp = n => Math.min(100, Math.max(0, n));
    const pct = !has ? null : def.log ?
      (value <= 0 ? 0 : clamp((Math.log10(value) - Math.log10(def.log[0])) / (Math.log10(def.log[1]) - Math.log10(def.log[0])) * 100)) :
      clamp(value / max * 100);
    const compact = n => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : String(Math.round(n));
    const shown = !has ? "–" : def.log ? compact(value) : Number(value).toFixed(def.decimals);
    const wrap = h("span", { class: "med-ring med-ring-hazard", "aria-hidden": "true" });
    wrap.innerHTML = `<svg viewBox="0 0 64 64" width="72" height="72">` +
      `<circle class="med-ring-track" cx="32" cy="32" r="${radius}"/>` +
      (pct === null || pct === 0 ? "" : `<circle class="med-ring-fill" cx="32" cy="32" r="${radius}" ` +
        `stroke-dasharray="${(length * pct / 100).toFixed(1)} ${length.toFixed(1)}" transform="rotate(-90 32 32)"/>`) +
      `<text class="med-ring-text" x="32" y="36" text-anchor="middle">${shown}</text></svg>`;
    return wrap;
  }

  function valueInput(def, value) {
    const input = h("input", {
      type: "number", step: String(def.step), min: "0", inputmode: "decimal", value: typeof value === "number" ? String(value) : "",
      "aria-label": `${def.label} (${def.unit})`,
      onchange: () => {
        const raw = input.value.trim();
        const number = Number(raw);
        store.env.edits[def.param] = raw === "" || !Number.isFinite(number) || number < 0 ? null : number;
        saveStore();
        render();
      }
    });
    return input;
  }

  // In words: what a full ring means.
  function scaleNote(def, max) {
    if (def.log) return "Log scale from 100 km. A full ring is the average distance to Mars (about 225 million km).";
    if (def.key === "gravity") return "A full ring is Earth gravity (1 g).";
    if (def.key === "environment") return "A full ring is standard sea-level air pressure (101.3 kPa).";
    if (def.key === "isolation") return `A full ring is the whole mission (${max} days).`;
    return `Display scale 0 to ${max} ${def.unit}. The top of the scale is a drawing choice, not a NASA limit.`;
  }

  function renderHazards(all) {
    const select = $("#med-place");
    if (!select.children.length) {
      PLACES.forEach(item => select.append(h("option", { value: item.id, text: item.name })));
      select.addEventListener("change", () => {
        store.env.place = select.value;
        store.env.edits = {};
        saveStore();
        render();
      });
      $("#med-env-reset").addEventListener("click", () => {
        store.env.edits = {};
        saveStore();
        render();
      });
    }
    select.value = store.env.place;
    const edited = Object.keys(store.env.edits).length;
    $("#med-env-note").textContent = `The conditions around the crew at this location. ${edited ? `${edited} value${edited > 1 ? "s" : ""} changed by hand. ` : ""}` +
      "The rings show each value on a simple scale; they do not rate it as good or bad. You can type over any value, or leave a box empty.";
    const groups = systems();
    $("#med-hazards").replaceChildren(...HAZARD_PARAMS.map(def => {
      const found = hazardValue(def);
      const value = found.v;
      const max = def.max || crew().missionLength;
      const input = valueInput(def, value);
      const linked = groups.filter(item => item.hazards.includes(def.key));
      const flagged = linked.filter(item => ["below", "over"].includes(systemZone(item, all))).length;
      return h("article", { class: "med-hazard-card" },
        h("div", { class: "med-hazard-top" },
          hazardRing(def, value),
          h("div", {},
            h("h3", { text: DATA.hazards[def.key] }),
            h("small", { text: def.label }),
            h("label", { class: "med-hazard-edit" }, input, h("span", { text: def.unit })),
            h("small", { class: "med-quiet", text: scaleNote(def, max) }))),
        h("p", { class: "med-hazard-about", text: HAZARD_INFO[def.key].about }),
        ...(def.extras || []).map(extra => {
          const more = hazardValue(extra);
          return h("div", { class: "med-hazard-extra" },
            h("label", {}, h("small", { text: extra.label }),
              h("span", { class: "med-hazard-edit" }, valueInput(extra, more.v), h("span", { text: extra.unit }))));
        }),
        h("div", { class: "med-hazard-links" },
          h("b", { text: "Body systems linked to this hazard" }),
          h("div", { class: "med-hazard-chips" }, ...linked.map(item => h("button", {
            class: "med-chip", type: "button", onclick: () => pickSystem(item.id)
          }, h("span", { text: item.name }), pill(systemZone(item, all))))),
          h("small", { class: "med-quiet", text: flagged ?
            `${flagged} of ${linked.length} linked systems have results outside the normal range.` :
            "No linked system has a result outside the normal range." })),
        h("details", { class: "med-evidence" }, h("summary", { text: "What this can affect" }),
          h("ul", {}, ...HAZARD_INFO[def.key].watch.map(text => h("li", { text }))),
          h("p", { class: "med-quiet", text: "Things to watch for, not a diagnosis." })));
    }));
  }

  function renderDashboard() {
    const member = crew();
    const groups = systems();
    const ids = allIds();
    const all = Object.fromEntries(ids.map(id => [id, indicator(id)]));
    const current = system && groups.find(item => item.id === system);
    const visible = current ? current.ids : ids;
    if (!visible.includes(picked)) picked = visible[0];
    const from = Date.now() - span();

    document.querySelectorAll("[name=medperiod]").forEach(input => { input.checked = Number(input.value) === store.period; });

    // Body systems: the figure, the hazards behind the selected system, and a list of buttons.
    $("#med-body").replaceChildren(bodyFigure(all));
    $("#med-systems").replaceChildren(
      current ? h("p", { class: "med-quiet" }, ...current.hazards.map(key => h("span", { class: "med-hazard", text: DATA.hazards[key] })), current.explain) :
      h("p", { class: "med-quiet", text: "Tap a marker or a system to see why it matters in space and filter the results." }),
      ...groups.map(item => h("button", {
          class: `med-system${system === item.id ? " is-on" : ""}`, type: "button",
          "aria-pressed": system === item.id ? "true" : "false", onclick: () => pickSystem(item.id)
        },
        h("span", { text: item.name }), pill(systemZone(item, all)))));

    // Current results as percent circles.
    $("#med-cards-title").textContent = current ? `Current results · ${current.name}` : "Current results";
    $("#med-cards-sub").textContent = member.name.toUpperCase();
    $("#med-cards").replaceChildren(...(visible.length ? visible.map(id => ringCard(all[id])) :
      [h("p", { class: "med-quiet", text: "No tests are ticked for this system. Add them in the Laboratory." })]));

    renderHazards(all);

    const off = DATA.tests.filter(test => !available(test.id));
    if (off.length) {
      $("#med-cards").append(h("p", { class: "med-quiet med-unavailable" },
        h("b", { text: "Not on this vehicle (unticked in the Laboratory): " }), off.map(test => test.name).join(", "),
        ". They are not counted as normal."));
    }

    // Trend for the picked result over the chosen period.
    const trendBox = $("#med-trend");
    const x = all[picked];
    trendBox.replaceChildren();
    if (x) {
      const points = x.series.reduce((count, item) => count + item.points.length, 0);
      trendBox.append(
        h("div", { class: "med-pane-head" },
          h("h3", {}, `Trend, last ${store.period} days · `, h("b", { text: x.name })),
          h("button", {
            class: "med-link", type: "button",
            text: x.kind === "vital" ? (VITALS[x.id].fields ? "Details & measure" : "How to record") : "Open check-in",
            onclick: () => x.kind === "vital" ? openDetail(x.id) : setView("checkin")
          })),
        chart({
          series: x.series, bands: x.bands, from, to: Date.now(),
          width: trendBox.clientWidth, height: 150, decimals: x.decimals,
          label: `${x.name}, last ${store.period} days: ${points} result${points === 1 ? "" : "s"}, latest ${x.valueText}.`
        }),
        h("p", { class: "med-chart-key", text: `${x.bands.length ? "Shaded band = normal range. " : ""}${x.refText}` }));
    }

    // Quick assessment and recommendations (same list as the Daily check-in).
    const results = ids.map(id => all[id]).filter(r => !(r.kind === "vital" && (VITALS[r.id].noAuto || VITALS[r.id].noRange)));
    const out = results.filter(flagged);
    const open = results.filter(r => r.zone === "recheck" || r.zone === "nodata");
    const banner = !results.length ? ["nodata", "?", "No results to assess", "Every test is unticked for this vehicle, or none has a result. Nothing is shown as normal."] :
      out.length ? ["over", "▲", `${out.length} result${out.length > 1 ? "s" : ""} outside the normal range`, out.map(r => r.name).join(", ")] :
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
        h("b", { text: "Contact the flight surgeon" }),
        h("span", { text: "For severe chest pain, trouble breathing, fainting, confusion or any rapidly worsening symptom, contact the flight surgeon immediately using your mission procedure." })));

    // Daily routine and lab tests on one chart.
    const combined = combinedSeries(from);
    const combinedBox = $("#med-combined");
    $("#med-combined-sub").textContent = `LAST ${store.period} DAYS`;
    combinedBox.replaceChildren(
      chart({
        series: combined, bands: [{ lo: 25, hi: 75, i: 0 }], from, to: Date.now(),
        width: combinedBox.clientWidth, height: 190, decimals: 0,
        label: `Combined score over the last ${store.period} days: ${combined[0].points.length} days of lab tests and ${combined[1].points.length} days of check-ins.`
      }),
      h("p", { class: "med-chart-key", text: "● solid Lab tests · ■ dashed Daily routine · shaded band = normal range (25–75%). " +
          "Each result is placed on its own normal range before averaging, so results from different devices and units can be followed on one scale." }));

    // Record a new check-in.
    const dailyTests = ORDER.filter(id => available(id) && VITALS[id].frequency === "Daily");
    const next = dailyTests.find(id => all[id].zone !== "normal") || dailyTests[0] || ORDER.find(available);
    $("#med-record").replaceChildren(
      h("div", {},
        h("h2", { text: "Record something new" }),
        h("p", { class: "med-quiet", text: "Enter a measurement, complete today's check-in, or report a symptom." })),
      h("div", { class: "med-record-actions" },
        next ? h("button", { class: "primary", type: "button", text: "+ Log measurements", onclick: () => openDetail(next) }) : null,
        h("button", { class: "secondary", type: "button", text: "Daily check-in", onclick: () => setView("checkin") }),
        h("button", { class: "secondary", type: "button", text: "Signs & symptoms", onclick: () => openTab("symptoms") })));

    // Daily health routine: what is done today across all views.
    const fresh = dailyTests.filter(id => {
      const latest = readingsFor(id).at(-1);
      return latest && Date.now() - latest.at < DAY;
    }).length;
    const entry = routineByDate()[localDate()];
    const logged = value => value !== null && value !== undefined && value !== "";
    const tasks = [
      ["Daily tests", dailyTests.length > 0 && fresh === dailyTests.length, `${fresh} of ${dailyTests.length} measured in the last 24 h`],
      ["Daily check-in", Boolean(entry), entry ? "Saved today" : "Not saved yet"],
      ["Exercise", Boolean(entry) && logged(entry.activity), entry && logged(entry.activity) ? `${entry.activity} min logged` : "Not logged today"],
      ["Fluids", Boolean(entry) && logged(entry.water), entry && logged(entry.water) ? `${entry.water} mL logged` : "Not logged today"]
    ];
    $("#med-routine").replaceChildren(
      h("div", { class: "med-pane-head" },
        h("h2", { text: "Daily health routine" }),
        h("span", { text: `${tasks.filter(task => task[1]).length} / ${tasks.length} DONE` })),
      h("div", { class: "med-tasks" }, ...tasks.map(([name, done, text]) =>
        h("div", { class: `med-task${done ? " is-done" : ""}` },
          h("b", {}, h("span", { "aria-hidden": "true", text: done ? "✓ " : "○ " }), name),
          h("span", { text: `${done ? "Done" : "To do"} · ${text}` })))));
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
    const from = to - span();
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
      `${current.symptom} was logged ${marks.length} time${marks.length > 1 ? "s" : ""} in the selected period. Shown together for context only; this does not show a cause.` :
      `No ${current.symptom.toLowerCase()} logged in the selected period.` }));

    box.append(h("h2", { class: "med-h2", text: "Routine and symptoms, latest days" }));
    if (!member.journalOwner) {
      box.append(h("p", { class: "med-quiet", text: `The routine journal on this device is not linked to ${member.name}. Only symptoms are shown.` }));
    }
    const routine = member.journalOwner ? routineByDate() : {};
    const allSymptoms = symptomsFor();
    const show = (value, unit) => value === null || value === undefined || value === "" ? "Not recorded" : `${value}${unit}`;
    const rows = [];
    for (let offset = 0; offset < Math.min(store.period, 14); offset++) {
      const day = new Date();
      day.setDate(day.getDate() - offset);
      const key = dateKey(day.getTime());
      const entry = routine[key];
      const felt = allSymptoms.filter(s => dateKey(s.at) === key).map(s => `${s.name} ${s.severity}/5`);
      rows.push([
        offset === 0 ? "Today" : day.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" }),
        show(entry?.sleepHours, " h"), show(entry?.activity, " min"), show(entry?.water, " mL"),
        show(entry?.caffeine, ""), show(entry?.meals, ""), felt.join(", ") || "None logged"
      ]);
    }
    box.append(table(["Day", "Sleep", "Exercise", "Water", "Caffeinated drinks", "Meals", "Symptoms"], rows));
    if (member.journalOwner && !routine[localDate()]) {
      box.append(h("div", { class: "med-missing med-gap" },
        h("span", {}, h("span", { "aria-hidden": "true", text: "? " }), "Today's routine check-in is missing."),
        h("button", { class: "secondary", type: "button", text: "Open check-in", onclick: () => setView("checkin") })));
    }
  }

  /* ---------- Laboratory: tests ---------- */

  let preset = "all";
  const PRESETS = [["all", "All tests"], ["daily", "Daily check"], ["monthly", "Monthly check"], ["trauma", "After an injury"]];

  function testRow(test) {
    const def = VITALS[test.id];
    const on = available(test.id);
    const latest = readingsFor(test.id).at(-1);
    const tick = h("input", {
      type: "checkbox", checked: on, "aria-label": `${test.name} is carried on this vehicle`,
      onchange: () => {
        const previous = store.unavailable;
        store.unavailable = tick.checked ? previous.filter(id => id !== test.id) : [...previous, test.id];
        if (!saveStore()) store.unavailable = previous;
        if (!available(test.id) && detailType === test.id) detailType = null;
        render();
        renderRoutineStrip();
      }
    });
    const result = !on ? h("div", { class: "med-test-result" }, h("small", { text: "Unticked: not on this vehicle" })) :
      latest ? h("div", { class: "med-test-result" },
        h("span", { text: `${def.format(latest)} ${def.unit}`.trim() }), pill(assess(test.id, latest).key),
        h("small", { text: `${ago(latest.at)}${latest.sample ? " (sample)" : ""}` })) :
      h("div", { class: "med-test-result" }, pill("nodata"), h("small", { text: "No result yet" }));
    return h("div", { class: `med-test${on ? "" : " is-off"}` },
      tick,
      h("div", {}, h("b", { text: test.name }), h("small", { text: test.why }),
        h("small", { text: `${test.frequency} · ${test.device}` })),
      result,
      on ? h("button", {
        class: "secondary", type: "button", text: def.fields ? "Enter result" : "How to record",
        onclick: () => openDetail(test.id)
      }) : null);
  }

  function renderTests() {
    const presetBox = $("#med-presets");
    if (!presetBox.querySelector("label")) {
      PRESETS.forEach(([value, label]) => presetBox.append(h("label", {},
        h("input", { type: "radio", name: "medpreset", value }), h("span", { text: label }))));
      presetBox.addEventListener("change", event => {
        preset = event.target.value;
        renderTests();
      });
    }
    presetBox.querySelectorAll("input").forEach(input => { input.checked = input.value === preset; });
    const box = $("#med-testlist");
    box.replaceChildren();
    DATA.systems.forEach(item => {
      const tests = DATA.tests.filter(test => test.system === item.id && (preset === "all" || test.presets.includes(preset)));
      if (!tests.length) return;
      box.append(h("section", { class: "med-system-block" },
        h("h3", { text: item.name }),
        h("p", {}, ...item.hazards.map(key => h("span", { class: "med-hazard", text: DATA.hazards[key] })), item.explain),
        ...tests.map(testRow)));
    });
  }

  /* ---------- Laboratory: signs and symptoms ---------- */

  let outcome = null;

  // Decides the next step from the ticked signs and symptoms. It never names a condition.
  function decide(names, severity) {
    const chosen = DATA.symptoms.filter(item => names.includes(item.name));
    const level = chosen.some(item => item.urgency === "now") || severity >= 4 ? "now" :
      chosen.some(item => item.urgency === "tests") ? "tests" : "self";
    const wanted = [...new Set(chosen.flatMap(item => item.tests))];
    return {
      level, names, severity,
      tests: wanted.filter(available), missing: wanted.filter(id => !available(id)),
      care: [...new Set(chosen.map(item => item.care).filter(Boolean))],
      chosen
    };
  }

  // Kept for the documentation build; not shown in the interface (the team wants the screens simple).
  // eslint-disable-next-line no-unused-vars
  function symptomEvidence(items) {
    const rows = items.map(item => {
      const parts = [];
      if (item.urgentWhen) parts.push(`Becomes urgent when: ${item.urgentWhen}.`);
      if (item.hazards) parts.push(`Related hazards: ${item.hazards}.`);
      parts.push(item.source ? `Source: ${item.source}` : "Source pending.");
      return h("li", {}, h("b", { text: `${item.name}: ` }), ...withLinks(parts.join(" ")));
    });
    return h("details", { class: "med-evidence" }, h("summary", { text: "Evidence" }),
      h("p", { text: "Urgency and tests come from the symptom table. Triggers are proposed app logic, not NASA medical thresholds." }),
      h("ul", {}, ...rows));
  }

  function outcomeCard(result) {
    const testButtons = result.tests.length ? h("div", { class: "med-outcome-tests-list" }, ...result.tests.map(id =>
      h("button", { class: "secondary", type: "button", text: VITALS[id].name, onclick: () => openDetail(id) }))) : null;
    const missing = result.missing.length ?
      h("p", { text: `Not on this vehicle (unticked in Tests): ${result.missing.map(id => VITALS[id].name).join(", ")}.` }) : null;
    const care = result.care.length ? h("ul", {}, ...result.care.map(text => h("li", { text }))) : null;
    const heading = {
      now: ["▲ Contact the flight surgeon now", "At least one of these needs a fast response. Use your mission procedure now. If it does not delay the call, these tests help the surgeon:"],
      tests: ["↻ Run these tests for a better recommendation", "Tap a test to see how to do it and enter the result. Your recommendations update as results come in."],
      self: ["✓ No tests needed right now", "Here is what you can do yourself. If it gets worse or lasts more than a few days, contact the flight surgeon."]
    }[result.level];
    return h("section", { class: `med-outcome med-outcome-${result.level}`, role: "status" },
      h("h3", { text: heading[0] }),
      h("p", { text: `For: ${result.names.join(", ")} · strength ${result.severity}/5` }),
      h("p", { text: heading[1] }),
      result.level === "self" ? null : testButtons,
      result.level === "self" ? null : missing,
      care ? h("p", { text: result.level === "self" ? "What to do:" : "Meanwhile:" }) : null,
      care,
      h("p", { class: "med-quiet med-rule-note", text: RULE_NOTE }));
  }

  function buildSymptomGroups() {
    const box = $("#med-symptom-groups");
    if (box.children.length) return;
    DATA.systems.forEach(item => {
      const list = DATA.symptoms.filter(entry => entry.system === item.id);
      if (!list.length) return;
      box.append(h("fieldset", { class: "med-symptom-group" },
        h("legend", { text: item.name }),
        h("div", { class: "chips" }, ...list.map(entry => h("label", {},
          h("input", { type: "checkbox", name: "symptom", value: entry.name }), h("span", { text: entry.name }))))));
    });
  }

  function renderSymptoms() {
    buildSymptomGroups();
    const form = $("#med-symptom-form");
    if (!form.elements.at.value) form.elements.at.value = localDateTime(Date.now());
    $("#med-outcome").replaceChildren(...(outcome ? [outcomeCard(outcome)] : []));
    const list = symptomsFor().slice(0, 15);
    $("#med-symptom-list").replaceChildren(list.length ? table(["Sign or symptom", "Strength", "Noticed", "Note", ""],
      list.map(entry => [
        entry.name, `${entry.severity} / 5`, `${formatTime(entry.at)} · ${ago(entry.at)}`,
        (entry.note || "–") + (entry.sample ? " (sample)" : ""),
        entry.sample ? "–" : h("button", {
          class: "med-link is-delete", type: "button", text: "Delete",
          onclick: () => {
            if (!confirm("Delete this symptom entry? This cannot be undone.")) return;
            const previous = store.symptoms;
            store.symptoms = previous.filter(item => item.id !== entry.id);
            if (!saveStore()) store.symptoms = previous;
            render();
            renderRoutineStrip();
          }
        })
      ])) : h("div", { class: "empty", text: `No signs or symptoms logged for ${crew().name}.` }));
  }

  function summarySections() {
    const member = crew();
    const routine = member.journalOwner ? routineByDate() : {};
    const week = Date.now() - span();
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
      ["Latest measurements", ORDER.filter(available).map(type => {
        const def = VITALS[type];
        const list = readingsFor(type);
        const latest = list.at(-1);
        const status = assess(type, latest);
        return latest ?
          `${def.name}: ${def.format(latest)} ${def.unit} | ${STATUS[status.key].label} | ${formatTime(latest.at)} | ${latest.source}${latest.sample ? " (sample)" : ""} | Trend: ${trendOf(type, list).text}` :
          `${def.name}: no reading | ${STATUS.nodata.label}`;
      })],
      ["Tests not on this vehicle", (list => list.length ? [list.join(", ")] : ["None unticked"])(DATA.tests.filter(test => !available(test.id)).map(test => test.name))],
      ["Symptoms, selected period", felt.length ? felt.map(s =>
        `${s.name}, strength ${s.severity}/5, ${formatTime(s.at)}${s.note ? ` - ${s.note}` : ""}${s.sample ? " (sample)" : ""}`) : ["None logged"]],
      ["Routine context, latest check-ins", !member.journalOwner ? ["Routine journal on this device is not linked to this crew member"] :
        days.length ? days.map(key => {
          const e = routine[key];
          return `${key}: sleep ${e.sleepHours ?? "not recorded"} h, exercise ${e.activity ?? "not recorded"} min, water ${e.water ?? "not recorded"} mL, caffeinated drinks ${e.caffeine ?? "not recorded"}, meals ${e.meals ?? "not recorded"}, mind score ${e.mind ?? "not recorded"} / 5`;
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
    const info = MODES[mode];
    if (!info.tabs.includes(tab)) tab = info.tabs[0];
    renderIdentity();
    $("#med-eyebrow").textContent = info.eyebrow;
    $("#medical-heading").textContent = info.title;
    $("#med-intro").textContent = info.text;
    document.querySelectorAll("#med-tabs label").forEach(label => {
      const input = label.querySelector("input");
      label.hidden = label.dataset.mode !== mode;
      input.checked = input.value === tab;
    });
    document.querySelectorAll("[data-med-tab]").forEach(panel => { panel.hidden = panel.dataset.medTab !== tab; });
    if (tab === "tests") renderTests();
    if (tab === "symptoms") renderSymptoms();
    if (tab === "dash") renderDashboard();
    if (tab === "related") renderRelated();
    if (tab === "summary") renderSummary();
    renderDetail();
  }

  /* ---------- Wiring ---------- */

  document.querySelectorAll("[name=medtab]").forEach(input => {
    input.addEventListener("change", () => openTab(input.value));
  });

  document.querySelectorAll("[name=medperiod]").forEach(input => {
    input.addEventListener("change", () => {
      store.period = Number(input.value);
      if (storeReady) saveStore();
      render();
      renderRoutineStrip();
    });
  });

  // Filter the long list of signs and symptoms as the user types.
  $("#med-symptom-search").addEventListener("input", event => {
    const query = event.target.value.trim().toLowerCase();
    document.querySelectorAll(".med-symptom-group").forEach(groupBox => {
      let shown = 0;
      groupBox.querySelectorAll("label").forEach(label => {
        const match = !query || label.textContent.toLowerCase().includes(query) ||
          groupBox.querySelector("legend").textContent.toLowerCase().includes(query);
        label.hidden = !match;
        if (match) shown++;
      });
      groupBox.hidden = !shown;
    });
  });

  $("#med-symptom-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const error = $("#med-symptom-error");
    error.textContent = "";
    const names = [...form.querySelectorAll("[name=symptom]:checked")].map(input => input.value);
    if (!names.length) {
      error.textContent = "Tick at least one sign or symptom.";
      return;
    }
    if (!form.elements.symptomSeverity.value) {
      error.textContent = "Choose how strong it is overall.";
      return;
    }
    const at = new Date(form.elements.at.value).getTime();
    if (!Number.isFinite(at) || at > Date.now() + 60000) {
      error.textContent = "Choose a time that is not in the future.";
      return;
    }
    const severity = Number(form.elements.symptomSeverity.value);
    const note = form.elements.note.value.trim();
    const previous = store.symptoms;
    store.symptoms = [...previous, ...names.map(name => ({
      id: crypto.randomUUID(), crew: AMIGOS.crewId(), name, severity, at, note
    }))];
    if (!saveStore()) {
      store.symptoms = previous;
      return;
    }
    outcome = decide(names, severity);
    form.reset();
    $("#med-symptom-search").dispatchEvent(new Event("input"));
    showToast(`${names.length} sign${names.length > 1 ? "s" : ""} or symptom${names.length > 1 ? "s" : ""} saved for ${crew().name}.`);
    render();
    renderRoutineStrip();
    $("#med-outcome").scrollIntoView({ block: "center" });
  });

  document.addEventListener("amigos:view", event => {
    renderRoutineStrip();
    if (MODES[event.detail]) {
      mode = event.detail;
      render();
    }
  });

  document.addEventListener("amigos:crew", () => {
    detailType = null;
    system = null;
    outcome = null;
    $("#med-symptom-form").reset();
    renderRoutineStrip();
    if (!$("#medical-view").hidden) render();
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
