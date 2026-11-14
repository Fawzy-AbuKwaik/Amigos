// Regression checks for the actual medical module, using an in-memory DOM/storage.
// Run: node scripts/test-medical.cjs
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
let checks = 0;
function test(name, run) { run(); checks++; console.log(`PASS ${name}`); }

class Node {
  constructor(tag = 'div') {
    this.tagName = tag; this.children = []; this.attributes = {}; this.events = {};
    this.dataset = {}; this.clientWidth = 600; this.value = ''; this.hidden = false;
    this.classList = { toggle() {}, add() {}, remove() {} };
    this.elements = new Proxy({}, { get: (o, k) => o[k] ||= new Node('input') });
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'value') this.value = String(v); }
  addEventListener(k, f) { this.events[k] = f; }
  set textContent(v) { this.children = [String(v)]; }
  get textContent() { return this.children.map(c => c?.textContent ?? String(c)).join(' '); }
  set innerHTML(v) { this.markup = v; this.children = [new Node('svg')]; }
  get firstChild() { return this.children[0]; }
  querySelector(selector) {
    const find = node => {
      for (const child of node.children || []) {
        if (!(child instanceof Node)) continue;
        if (child.tagName === selector) return child;
        const match = find(child); if (match) return match;
      }
      return null;
    };
    return find(this) || new Node('input');
  }
  querySelectorAll() { return []; }
  reset() {} focus() {} scrollIntoView() {}
  checkValidity() { return Boolean(this.value); }
}
const nodes = new Map();
const storage = new Map();
let member = 'c1';
const document = {
  querySelector: selector => { if (!nodes.has(selector)) nodes.set(selector, new Node()); return nodes.get(selector); },
  querySelectorAll: () => [], createElement: tag => new Node(tag),
  createElementNS: (_, tag) => new Node(tag), addEventListener() {}, dispatchEvent() {}
};
const context = {
  window: {}, document, Node, localStorage: {
    getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v)
  }, records: [], showToast() {}, setView() {},
  localDate: () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
  console, setTimeout, clearTimeout, crypto: require('node:crypto').webcrypto
};
vm.createContext(context);
vm.runInContext(read('js/data.js'), context);
context.AMIGOS = context.window.AMIGOS;
context.AMIGOS.crewId = () => member;
const app = read('js/app.js');
vm.runInContext('const QUESTIONS = AMIGOS.data.questions;\n' + app.slice(app.indexOf('function questionScale'), app.indexOf('let records = []')), context);
const medical = read('js/medical.js');
const end = medical.indexOf('  /* ---------- Wiring ---------- */');
vm.runInContext(medical.slice(0, end) + `
  globalThis.med = { routineIndicator, mindAverage, routineValue, mentalQuestions, buildRecommendations,
    vitalIndicator, included, testRow, readingsFor, symptomsFor, assess, decide, combinedSeries, summarySections, renderDashboard,
    renderTests, renderSymptoms, renderRelated, renderSummary, renderDetail, readingForm,
    saveStore, chart, chartSummary, fileError, attachmentForm, saveAttachment, getAttachment, removeAttachment, systems, allIds, VITALS, STATUS, store,
    edit: value => { editingReadingId = value; }, samples: value => { showSamples = value; }, detail: value => { detailType = value; } };
})();`, context);
const m = context.med, data = context.AMIGOS.data;
const today = context.localDate();
const now = Date.now();
function routine(extra = {}) {
  return { date: today, crew: member, sleepHours: 8, water: 1750, activity: 45, meals: 4, caffeine: 0,
    ...Object.fromEntries(m.mentalQuestions().map(q => [q.name, 4])), ...extra };
}
function reset(entry = routine()) {
  member = 'c1'; context.records = entry ? [entry] : [];
  m.store.measurements = []; m.store.symptoms = []; m.store.unavailable = []; m.samples(false);
}
function reading(type, v, extra = {}) {
  return { id: crypto.randomUUID(), crew: member, type, v, at: now - 60000, source: 'Regression fixture', ...extra };
}

test('all JavaScript parses; no merge markers', () => {
  for (const f of ['js/app.js', 'js/data.js', 'js/medical.js']) {
    new vm.Script(read(f)); assert(!/^(<<<<<<<|=======|>>>>>>>)/m.test(read(f)));
  }
});
test('all symptom tests and system/routine links resolve', () => {
  for (const s of data.symptoms) for (const id of s.tests) assert(m.VITALS[id], `${s.name}: ${id}`);
  for (const s of data.systems) for (const id of s.routine) assert(m.routineIndicator(id));
});
test('radiation dose is absent from active tests', () => {
  assert(!data.tests.some(t => t.id === 'dose')); assert.equal(m.VITALS.dose, undefined);
});
test('new cardiac, renal, endocrine and brain/CSF indicators are linked', () => {
  reset();
  for (const id of ['echo', 'creatinine', 'egfr', 'uacr', 'tsh', 'ft4', 'cortisol', 'brain-mri', 'oct', 'jugular-us', 'ccfp']) assert(m.VITALS[id]);
  for (const id of ['creatinine', 'egfr', 'uacr', 'tsh', 'ft4', 'cortisol']) {
    assert(m.VITALS[id].fields); assert.equal(m.VITALS[id].bands.length, 0);
    assert.equal(m.assess(id, reading(id, [1])).key, 'recorded');
  }
  const system = m.systems().find(s => s.id === 'brain-and-spinal-fluid');
  for (const id of ['brain-mri', 'oct', 'jugular-us', 'ccfp']) assert(system.ids.includes(id));
  assert.equal(m.allIds().length, new Set(m.allIds()).size);
});
test('file tests provide import forms instead of numeric charts', () => {
  reset();
  for (const id of ['ecg', 'eyeus']) {
    const form = m.attachmentForm(id);
    assert.equal(form.tagName, 'form'); assert(form.textContent.includes('25 MB'));
    m.detail(id); m.renderDetail();
    assert(nodes.get('#med-detail').textContent.includes('No numeric trend'));
  }
});
test('attachment formats, empty files and 25 MB limits are validated', () => {
  const file = (name, type, size = 100) => ({name, type, size});
  assert.equal(m.fileError(file('ecg.PNG', 'image/png'), m.VITALS.ecg), null);
  assert.equal(m.fileError(file('ecg.pdf', 'application/pdf'), m.VITALS.ecg), null);
  assert.equal(m.fileError(file('eye.mp4', 'video/mp4'), m.VITALS.eyeus), null);
  assert(m.fileError(file('eye.pdf', 'application/pdf'), m.VITALS.eyeus));
  assert(m.fileError(file('script.html', 'text/html'), m.VITALS.ecg));
  assert(m.fileError(file('fake.png', 'text/html'), m.VITALS.ecg));
  assert(m.fileError(file('empty.png', 'image/png', 0), m.VITALS.ecg));
  assert(m.fileError(file('large.mp4', 'video/mp4', 25 * 1024 * 1024 + 1), m.VITALS.ecg));
  assert(m.fileError(null, m.VITALS.ecg));
});
test('each sleep category renders its label and correct Below/Normal/Over', () => {
  const q = data.questions.find(q => q.name === 'sleepHours');
  q.values.forEach((v, i) => {
    reset(routine({ sleepHours: v })); const x = m.routineIndicator('sleep');
    assert.equal(x.bigText, q.labels.split(',')[i]);
    assert.equal(x.zone, i < 3 ? 'below' : i === 3 ? 'normal' : 'over');
    assert.equal(x.series[0].points.length, 0); assert.equal(x.pct, null);
    assert.equal(x.avgText, undefined);
  });
});
test('water and exercise categories have labels, no score/average/representative graph', () => {
  for (const [id, field] of [['water', 'water'], ['activity', 'activity']]) {
    const q = data.questions.find(q => q.name === field);
    for (const [i, v] of q.values.entries()) {
      reset(routine({ [field]: v })); const x = m.routineIndicator(id);
      assert.equal(x.bigText, q.labels.split(',')[i]); assert.equal(x.unit, '');
      assert.equal(x.zone, 'recorded'); assert.equal(x.pct, null);
      assert.equal(x.avgText, undefined); assert.equal(x.series[0].points.length, 0);
    }
  }
});
test('missing answers and future check-ins are not zero measurements', () => {
  reset(routine({ sleepHours: null, activity: null, water: '' }));
  for (const id of ['sleep', 'water', 'activity']) assert.equal(m.routineIndicator(id).zone, 'nodata');
  context.records = [routine({ date: '2999-01-01' })];
  assert.equal(m.routineIndicator('sleep').zone, 'nodata');
});
test('Mind & Mood recomputes from current answers and stays descriptive', () => {
  reset(routine({ mind: 1 })); assert.equal(m.routineIndicator('mind').bigText, '4');
  assert.equal(m.routineIndicator('mind').zone, 'recorded');
  assert.equal(m.mindAverage(routine({ mood: null })), null);
  assert.equal(m.mindAverage({ mind: 4 }), null);
});
test('mood-only, short-sleep-only, long-sleep and combined prompts have distinct wording', () => {
  reset(routine({ mood: 1 })); assert(m.buildRecommendations().some(r => r.title === 'Make time for support and recovery'));
  reset(routine({ sleepHours: 5.5 })); assert(m.buildRecommendations().some(r => r.title === 'Protect your scheduled sleep period'));
  reset(routine({ sleepHours: 9.5 })); assert(m.buildRecommendations().some(r => r.action.includes('does not establish a problem')));
  reset(routine({ sleepHours: 5.5, mood: 1 })); assert(m.buildRecommendations().some(r => r.title === 'Support your mood and protect your sleep'));
  reset(); assert(!m.buildRecommendations().some(r => r.rule === 'moodsleep'));
});
test('low BP prompt does not depend on water category or diagnose dehydration', () => {
  for (const water of [null, 750, 2750]) {
    reset(routine({ water })); m.store.measurements.push(reading('bp', [88, 56]));
    const r = m.buildRecommendations().find(r => r.rule === 'bpfluids');
    assert(r); assert(r.action.includes('cannot determine the cause')); assert(!r.action.includes('drink water'));
  }
  assert(data.sources.hypotension.url.startsWith('https://www.nhlbi.nih.gov/'));
});
test('urgent symptoms take precedence over routine/comfort recommendations', () => {
  reset(routine({ sleepHours: 5.5, mood: 1 }));
  m.store.symptoms.push({ crew: member, name: 'Chest pain or pressure', severity: 2, at: now });
  const r = m.buildRecommendations(); assert(r.length); assert(r.every(x => x.urgent));
  assert.equal(m.decide(['Headache'], 4).level, 'now');
});
test('unavailable symptom tests still produce a medical follow-up prompt', () => {
  reset(); m.store.unavailable = ['bp', 'hr', 'glucose'];
  m.store.symptoms.push({ crew: member, name: 'Dizziness', severity: 2, at: now });
  const r = m.buildRecommendations().find(r => r.rule === 'tests');
  assert(r); assert(r.action.includes('Excluded from automatic assessment')); assert.equal(r.tests.length, 0);
});
test('poor and pre-symptom readings do not satisfy follow-up testing', () => {
  reset(); m.store.symptoms.push({ crew: member, name: 'Headache', severity: 2, at: now - 2000 });
  m.store.measurements.push(reading('bp', [110, 70]), reading('temp', [36.6], { at: now, quality: 'poor' }));
  assert.equal(m.buildRecommendations().find(r => r.rule === 'tests').tests.length, 2);
});
test('demo mode is opt-in, separate from real measurements and reversible', () => {
  reset(); assert.equal(m.readingsFor('bp').length, 0); assert.equal(m.symptomsFor().length, 0);
  m.store.measurements.push(reading('bp', [115, 75]));
  m.samples(true); assert(m.readingsFor('bp').every(r => r.sample));
  assert(m.summarySections()[0][1][0].includes('DEMONSTRATION'));
  m.samples(false); assert.equal(m.readingsFor('bp').length, 1); assert(!m.readingsFor('bp')[0].sample);
});
test('placeholder ranges do not classify haemoglobin or urine', () => {
  reset(); for (const id of ['hgb', 'urine']) {
    assert.equal(m.VITALS[id].bands.length, 0);
    assert.equal(m.assess(id, reading(id, [1])).key, 'recorded');
  }
  assert.equal(m.assess('bp', reading('bp', [110, 70])).key, 'normal');
  assert.equal(m.assess('bp', reading('bp', [88, 56])).key, 'below');
  assert.equal(m.assess('hr', reading('hr', [110])).key, 'over');
  assert.equal(m.assess('hr', reading('hr', [70], { quality: 'poor' })).key, 'recheck');
  assert.equal(m.assess('hr', reading('hr', [70], { at: now - 48 * 3600000 })).key, 'recheck');
});
test('overview chart contains recording counts, no combined health score', () => {
  reset(); m.store.measurements.push(reading('bp', [110, 70]), reading('hr', [70]));
  const series = m.combinedSeries(now - 7 * 86400000);
  assert.equal(series[0].points[0].v, 2); assert.equal(series[1].points[0].v, 1);
  m.renderDashboard();
  const text = nodes.get('#med-routine').textContent;
  assert(text.includes('30 to 60 minutes')); assert(text.includes('1.5 to 2 litres'));
  assert(!text.includes('45 min')); assert(!text.includes('1750 mL'));
});
test('case summary preserves category labels and zero caffeine', () => {
  reset(); const text = m.summarySections().flat(3).join(' ');
  assert(text.includes('7 to 9 hours')); assert(text.includes('1.5 to 2 litres'));
  assert(text.includes('30 to 60 minutes')); assert(text.includes('caffeinated drinks None'));
  assert(!text.includes('1750 mL')); assert(!text.includes('45 min'));
});
test('crew isolation applies to routine, measurements and symptoms', () => {
  reset(); m.store.measurements.push(reading('hr', [70]));
  member = 'c2'; assert.equal(m.readingsFor('hr').length, 0);
  assert.equal(m.routineIndicator('sleep').zone, 'nodata');
});
test('all main medical views render with empty, personal and demo data', () => {
  for (const demo of [false, true]) {
    reset(); m.samples(demo);
    for (const fn of ['renderTests', 'renderSymptoms', 'renderRelated', 'renderSummary', 'renderDashboard']) m[fn]();
    for (const id of Object.keys(m.VITALS)) { m.detail(id); m.renderDetail(); }
  }
});
test('medical persistence writes measurements without changing routine storage', () => {
  reset(); m.store.measurements.push(reading('hr', [70]));
  storage.set('amigos-routine-v1', 'unchanged'); assert(m.saveStore());
  assert.equal(JSON.parse(storage.get('amigos-medical-v1')).measurements.length, 1);
  assert.equal(storage.get('amigos-routine-v1'), 'unchanged');
});
async function attachmentChecks() {
  const files = new Map();
  // Exercise the actual transaction wrapper and form handlers with async storage.
  context.indexedDB = { open() {
    const request = {};
    queueMicrotask(() => {
      request.result = { close() {}, transaction() {
        const transaction = { objectStore() {
          const run = action => {
            const result = {};
            queueMicrotask(() => { result.result = action(); result.onsuccess?.(); queueMicrotask(() => transaction.oncomplete?.()); });
            return result;
          };
          return { put: (v, k) => run(() => { files.set(k, v); return k; }),
            get: k => run(() => files.get(k)), delete: k => run(() => files.delete(k)) };
        }};
        return transaction;
      }};
      request.onsuccess();
    });
    return request;
  }};
  const fixture = { name: 'ecg.png', type: 'image/png', size: 100 };
  await m.saveAttachment('fixture', fixture);
  assert.equal(await m.getAttachment('fixture'), fixture);
  await m.removeAttachment('fixture'); assert.equal(await m.getAttachment('fixture'), undefined);
  checks++; console.log('PASS asynchronous attachment save/read/delete transaction wrapper');
  const walk = node => [node, ...node.children.filter(c => c instanceof Node).flatMap(walk)];
  reset();
  let form = m.attachmentForm('ecg');
  walk(form).find(n => n.attributes.type === 'file').files = [fixture];
  await form.events.submit({preventDefault() {}});
  assert.equal(m.store.measurements.length, 1);
  const saved = m.store.measurements[0]; assert.equal(saved.crew, 'c1'); assert.equal(saved.file.name, 'ecg.png');
  assert.equal(await m.getAttachment(saved.file.id), fixture);
  assert(!storage.get('amigos-medical-v1').includes('data:image'));
  checks++; console.log('PASS import form persists file separately from serializable metadata');
  reset();
  const originalSet = context.localStorage.setItem;
  context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  const before = files.size;
  form = m.attachmentForm('echo');
  walk(form).find(n => n.attributes.type === 'file').files = [fixture];
  await form.events.submit({preventDefault() {}});
  context.localStorage.setItem = originalSet;
  assert.equal(m.store.measurements.length, 0); assert.equal(files.size, before);
  assert(form.textContent.includes('Unable to save'));
  checks++; console.log('PASS metadata failure rolls back both entry and attached file');
}


function descendants(node, tag) {
  return (node.children || []).flatMap(child => child instanceof Node ?
    [...(child.tagName === tag ? [child] : []), ...descendants(child, tag)] : []);
}
function submitReading(type, values, time) {
  const form = m.readingForm(type);
  const inputs = descendants(form, 'input');
  values.forEach((v, i) => { inputs[i].value = String(v); });
  if (time) inputs.at(-1).value = time;
  form.events.submit({ preventDefault() {} });
  return form;
}
test('BP and SpO2 saves immediately update Laboratory, Assessment, recommendations and summary', () => {
  reset(); m.edit(null);
  for (const [type, before, after] of [['bp', [88, 56], [118, 76]], ['spo2', [90], [98]]]) {
    submitReading(type, before);
    const entry = m.readingsFor(type).at(-1);
    assert.deepEqual(Array.from(entry.v), before);
    const count = m.store.measurements.length;
    m.edit(entry.id);
    submitReading(type, after);
    assert.equal(m.store.measurements.length, count, 'edit must replace the original reading');
    assert.equal(m.readingsFor(type).at(-1).id, entry.id);
    assert.deepEqual(Array.from(m.readingsFor(type).at(-1).v), after);
    assert.equal(m.vitalIndicator(type).zone, 'normal');
    const row = m.testRow(data.tests.find(t => t.id === type));
    assert(row.textContent.includes(m.VITALS[type].format(m.readingsFor(type).at(-1))));
    assert(JSON.stringify(m.summarySections()).includes(m.VITALS[type].format(m.readingsFor(type).at(-1))));
  }
  assert(!m.buildRecommendations().some(r => r.rule === 'bpfluids'));
  const persisted = JSON.parse(storage.get('amigos-medical-v1'));
  assert.equal(persisted.measurements.find(r => r.type === 'spo2').v[0], 98);
});
test('new current readings outrank old ones; backdated readings do not replace newer measurements', () => {
  reset(); m.edit(null);
  submitReading('bp', [118, 76]);
  submitReading('bp', [88, 56], '2026-01-01T12:00');
  assert.equal(m.vitalIndicator('bp').valueText, '118/76 mmHg');
});
test('demo mode blocks personal numeric saves', () => {
  reset(); m.edit(null); m.samples(true);
  const form = submitReading('spo2', [99]);
  assert.equal(m.store.measurements.length, 0);
  assert(form.textContent.includes('Switch off demonstration mode'));
  m.samples(false);
});
test('unchecked tests remain recordable but cannot trigger recommendations', () => {
  reset(); m.edit(null); m.store.unavailable = ['bp'];
  submitReading('bp', [88, 56]);
  assert.equal(m.readingsFor('bp').length, 1);
  assert(!m.included('bp'));
  assert(!m.buildRecommendations().some(r => r.rule === 'bpfluids'));
  assert(m.testRow(data.tests.find(t => t.id === 'bp')).textContent.includes('Enter result'));
  assert(!m.included('creatinine')); assert(!m.included('ecg'));
});



test('failed reading edits restore the original in-memory and persisted values', () => {
  reset(); m.edit(null); submitReading('spo2', [97]);
  const entry = m.readingsFor('spo2').at(-1);
  const originalSet = context.localStorage.setItem;
  context.localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  try { m.edit(entry.id); submitReading('spo2', [91]); }
  finally { context.localStorage.setItem = originalSet; m.edit(null); }
  assert.equal(m.readingsFor('spo2').at(-1).v[0], 97);
  assert.equal(JSON.parse(storage.get('amigos-medical-v1')).measurements[0].v[0], 97);
});


test('BP custom tolerance includes exact +/-15 boundaries and checks both components', () => {
  reset();
  for (const v of [[120,80], [130,85], [105,65], [135,95]]) assert.equal(m.assess('bp', reading('bp', v)).key, 'normal');
  for (const v of [[136,80], [120,96]]) assert.equal(m.assess('bp', reading('bp', v)).key, 'over');
  for (const v of [[104,80], [120,64]]) assert.equal(m.assess('bp', reading('bp', v)).key, 'below');
  assert(m.assess('bp', reading('bp', [135,95])).reason.includes('not a clinical normal range'));
  m.store.measurements.push(reading('bp', [130,85]));
  assert(m.testRow(data.tests.find(t => t.id === 'bp')).textContent.includes('Within custom band'));
});
attachmentChecks().then(() => console.log(`${checks} regression groups passed.`)).catch(error => { console.error(error); process.exitCode = 1; });
