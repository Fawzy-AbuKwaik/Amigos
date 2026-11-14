// Keep the original key so existing daily entries survive the redesign.
const STORAGE_KEY = "amigos-routine-v1";
const form = document.querySelector("#routine-form");
const QUESTIONS = AMIGOS.data.questions;
// The label of a saved answer; older numeric entries that are not one of the choices return null.
function answerLabel(name, value) {
  const question = QUESTIONS.find(item => item.name === name);
  if (!question || value === undefined || value === null || value === "") return null;
  const index = question.values ? question.values.findIndex(item => String(item) === String(value)) : Number(value) - 1;
  return index >= 0 ? question.labels.split(",")[index] : null;
}
let records = [];
let editingId = null;
let currentStep = 0;
let storageReady = true;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!Array.isArray(saved)) throw new Error("Invalid record collection");
  records = saved;
} catch {
  // Never overwrite unreadable existing data with an empty collection.
  storageReady = false;
}

// Entries belong to one crew member. Entries saved before crew selection existed
// are kept and shown under the first crew member.
const ownerOf = record => record.crew || AMIGOS.data.crew[0].id;
const mine = () => records.filter(record => ownerOf(record) === AMIGOS.crewId());

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.hidden = true;
  }, 4500);
}

function persist(nextRecords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextRecords));
    records = nextRecords;
    return true;
  } catch {
    showToast("Unable to save. Check your browser's storage settings and try again.");
    return false;
  }
}

// textContent prevents notes from being interpreted as executable HTML.
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

// The mental health questions come from js/data.js, each on a fixed 1-5 scale.
QUESTIONS.forEach(question => {
  const field = element("fieldset", undefined, "rating-field question");
  const group = element("div", undefined, "rating");
  group.dataset.labels = question.labels;
  group.dataset.name = question.name;
  if (question.values) group.dataset.values = JSON.stringify(question.values);
  field.append(element("legend", question.text), group);
  // Sources stay in js/data.js and the research workbook; the form itself stays simple.
  document.querySelector(`#${question.slot || "mind"}-questions`).append(field);
});

// Every step panel is built before this point, including the questionnaire.
const panels = [...form.querySelectorAll(".step-panel")];
const progressItems = [...document.querySelectorAll(".progress li")];
const lastStep = panels.length - 1;

// Ratings use labeled, keyboard-accessible radio groups.
document.querySelectorAll(".rating").forEach(group => {
  const values = group.dataset.values ? JSON.parse(group.dataset.values) : null;
  group.dataset.labels.split(",").forEach((description, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = group.dataset.name;
    input.value = values ? values[index] : index + 1;
    input.required = true;
    const content = document.createElement("span");
    const number = document.createElement("b");
    number.textContent = index + 1;
    content.append(number, document.createTextNode(description));
    label.append(input, content);
    group.append(label);
  });
});

const contextFactors = [
  "Workload", "Schedule change", "Noise / light", "Limited privacy",
  "Social connection", "Unusual day"
];
contextFactors.forEach(factor => {
  const label = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = "factors";
  input.value = factor;
  const text = document.createElement("span");
  text.textContent = factor;
  label.append(input, text);
  document.querySelector("#factors").append(label);
});

function sleepWindowHours() {
  const start = form.elements.sleepStart.value;
  const end = form.elements.sleepEnd.value;
  return start && end ? (new Date(end) - new Date(start)) / 3600000 : null;
}

function updateSleepWindow() {
  const hours = sleepWindowHours();
  document.querySelector("#sleep-window").textContent = hours === null ?
    "Your sleep window will appear here." :
    !Number.isFinite(hours) || hours < 0 ?
    "Check the dates: wake-up must follow sleep start." :
    `${hours.toFixed(1)} hours between the times you entered.`;
}
["sleepStart", "sleepEnd"].forEach(name => {
  form.elements[name].addEventListener("change", updateSleepWindow);
});

function showError(message) {
  const error = document.querySelector("#form-error");
  error.textContent = message;
  error.focus();
  return false;
}

// Only expose one step at a time; previous answers stay in the form.
function showStep(index, focusHeading = true) {
  currentStep = index;
  panels.forEach((panel, panelIndex) => {
    panel.hidden = panelIndex !== index;
  });
  progressItems.forEach((item, itemIndex) => {
    item.classList.toggle("current", itemIndex === index);
    item.classList.toggle("complete", itemIndex < index);
    if (itemIndex === index) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  document.querySelector("#back-button").hidden = index === 0;
  document.querySelector("#next-button").hidden = index === lastStep;
  document.querySelector("#save-button").hidden = index !== lastStep;
  document.querySelector("#step-caption").textContent = `Step ${index + 1} of ${panels.length}`;
  document.querySelector("#form-error").textContent = "";
  if (focusHeading) panels[index].querySelector("h2").focus();
}

function validateStep(index) {
  const controls = [...panels[index].querySelectorAll("input, textarea")];
  if (index === 0) controls.unshift(form.elements.date);
  for (const control of controls) {
    if (!control.checkValidity()) {
      control.reportValidity();
      return false;
    }
  }
  if (index === 0) {
    if (form.elements.date.value > localDate()) return showError("Choose today or a past log date.");
    const windowHours = sleepWindowHours();
    if (windowHours === null || !Number.isFinite(windowHours) || windowHours < 0 || windowHours > 36) {
      return showError("Check your sleep dates. The entered sleep period must be between 0 and 36 hours.");
    }
    // The sleep answer is a band; its lower end cannot be longer than the window.
    const sleepQuestion = QUESTIONS.find(item => item.name === "sleepHours");
    const band = sleepQuestion.values.findIndex(value => String(value) === form.elements.sleepHours.value);
    if (band >= 0 && sleepQuestion.min[band] > windowHours + 0.01) {
      return showError("Actual sleep cannot be longer than the time between sleep start and wake-up.");
    }
  }
  if (panels[index].querySelector('[data-name="caffeineTime"]')) {
    const drinks = form.elements.caffeine.value;
    const last = form.elements.caffeineTime.value;
    if (drinks !== "" && last !== "" && (Number(drinks) === 0) !== (last === "none")) {
      return showError("Your caffeine answers do not match. If you had no caffeine, answer None and No caffeine today.");
    }
  }
  return true;
}

document.querySelector("#next-button").addEventListener("click", () => {
  if (validateStep(currentStep)) showStep(currentStep + 1);
});
document.querySelector("#back-button").addEventListener("click", () => showStep(currentStep - 1));

const VIEW_TITLES = {
  checkin: "DAILY CHECK-IN",
  history: "MY JOURNAL",
  lab: "LABORATORY",
  assess: "ASSESSMENT"
};

function setView(view) {
  document.querySelector("#checkin-view").hidden = view !== "checkin";
  document.querySelector("#history-view").hidden = view !== "history";
  // Laboratory and Assessment share one section, drawn by js/medical.js.
  document.querySelector("#medical-view").hidden = view !== "lab" && view !== "assess";
  document.querySelector("#header-view").textContent = VIEW_TITLES[view];
  document.querySelectorAll(".nav").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "history") renderHistory();
  if (view === "checkin") renderToday();
  // Lets the other views (js/medical.js) refresh when the view changes.
  document.dispatchEvent(new CustomEvent("amigos:view", {
    detail: view
  }));
  window.scrollTo({
    top: 0,
    behavior: "auto"
  });
}
document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => setView(button.dataset.view));
});
document.querySelector(".brand").addEventListener("click", event => {
  event.preventDefault();
  setView("checkin");
});

function resetForm() {
  form.reset();
  editingId = null;
  form.elements.date.value = localDate();
  form.elements.date.max = localDate();
  document.querySelector("#edit-banner").hidden = true;
  document.querySelector("#save-button").textContent = "Save check-in";
  updateSleepWindow();
  showStep(0, false);
}
document.querySelector("#cancel-edit").addEventListener("click", resetForm);
document.querySelector("#new-entry").addEventListener("click", () => {
  resetForm();
  setView("checkin");
});

form.addEventListener("submit", event => {
  event.preventDefault();
  // Enter advances the current step rather than bypassing the check-in.
  if (currentStep < lastStep) {
    if (validateStep(currentStep)) showStep(currentStep + 1);
    return;
  }
  for (let index = 0; index < panels.length; index++) {
    // Required radio groups may live in a hidden step when saving.
    const invalid = [...panels[index].querySelectorAll("input, textarea")]
      .some(control => !control.checkValidity());
    if (invalid) {
      showStep(index);
      validateStep(index);
      return;
    }
  }
  if (form.elements.date.value > localDate()) {
    showStep(0);
    showError("Choose today or a past log date.");
    return;
  }
  for (let index = 1; index < panels.length; index++) {
    if (!validateStep(index)) return;
  }
  if (!storageReady) {
    showError("Existing browser data could not be read. Recover it before saving new entries.");
    return;
  }
  const data = new FormData(form);
  const entry = Object.fromEntries(data.entries());
  entry.factors = data.getAll("factors");
  entry.crew = AMIGOS.crewId();
  if (mine().some(record => record.id !== editingId && record.date === entry.date && record.phase === entry.phase)) {
    showError("An entry already exists for this date and mission phase. Open My journal to edit it.");
    return;
  }
  ["sleepQuality", "appetite", ...QUESTIONS.filter(question => !question.textValue).map(question => question.name)].forEach(name => {
    entry[name] = Number(entry[name]);
  });
  // An omitted optional measurement is unknown, not a measured zero.
  ["activity", "water", "caffeine", "meals"].forEach(name => {
    entry[name] = entry[name] === "" ? null : Number(entry[name]);
  });
  // One number for the questionnaire, so it can be followed over time.
  const mental = QUESTIONS.filter(question => question.mind !== false);
  entry.mind = Number((mental.reduce((sum, question) => sum + entry[question.name], 0) / mental.length).toFixed(1));
  entry.id = editingId || crypto.randomUUID();
  entry.updatedAt = new Date().toISOString();
  if (persist([...records.filter(record => record.id !== entry.id), entry])) {
    resetForm();
    updateCount();
    setView("checkin");
    showToast(`Check-in saved for ${AMIGOS.crew().name}.`);
  }
});

function updateCount() {
  document.querySelector("#count").textContent = mine().length;
}

function displayValue(value, unit = "") {
  return value === null || value === undefined || value === "" ? "Not recorded" : `${value}${unit}`;
}

function renderHistory() {
  const container = document.querySelector("#entries");
  container.replaceChildren();
  const phase = document.querySelector("#phase-filter").value;
  const entries = mine().filter(record => phase === "all" || record.phase === phase)
    .sort((a, b) => b.date.localeCompare(a.date));
  document.querySelector("#history-owner").textContent = `Check-ins saved for ${AMIGOS.crew().name}.`;
  if (!entries.length) {
    container.append(element("div", `No check-ins here yet for ${AMIGOS.crew().name}. Start with a new daily entry.`, "empty"));
    return;
  }
  entries.forEach(record => {
    const card = element("article", undefined, "entry");
    const header = element("div", undefined, "entry-head");
    const title = element("div");
    title.append(element("h2", new Date(`${record.date}T12:00`).toLocaleDateString("en", {
      weekday: "short",
      day: "numeric",
      month: "long",
      year: "numeric"
    })), element("span", record.phase === "pre" ? "Before the mission" : "During the mission", "tag"));
    const actions = element("div", undefined, "entry-actions");
    const edit = element("button", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => editEntry(record));
    const remove = element("button", "Delete", "delete");
    remove.type = "button";
    remove.addEventListener("click", () => {
      if (confirm("Delete this check-in? This cannot be undone.") &&
        persist(records.filter(item => item.id !== record.id))) {
        updateCount();
        renderHistory();
        showToast("Check-in deleted.");
      }
    });
    actions.append(edit, remove);
    header.append(title, actions);
    const metrics = element("div", undefined, "metrics");
    const values = [
      ["Actual sleep", answerLabel("sleepHours", record.sleepHours) ?? displayValue(record.sleepHours, " h")],
      ["Sleep quality", displayValue(record.sleepQuality, " / 5")],
      ["Appetite", displayValue(record.appetite, " / 5")],
      ["Meals", answerLabel("meals", record.meals) ?? displayValue(record.meals)],
      ["Water", answerLabel("water", record.water) ?? displayValue(record.water, " mL")],
      ["Mind score", displayValue(record.mind ?? record.mood, " / 5")],
      ["Exercise", answerLabel("activity", record.activity) ?? displayValue(record.activity, " min")],
      ["Caffeinated drinks", answerLabel("caffeine", record.caffeine) ?? displayValue(record.caffeine)]
    ];
    values.forEach(([name, value]) => {
      const metric = element("div");
      metric.append(element("small", name), element("b", value));
      metrics.append(metric);
    });
    card.append(header, metrics);
    card.append(element("p", `Sleep window: ${record.sleepStart.replace("T", " ")} to ${record.sleepEnd.replace("T", " ")}`));
    const answers = QUESTIONS.filter(question => !question.metric && answerLabel(question.name, record[question.name])).map(question => {
      return `${question.short || question.name}: ${answerLabel(question.name, record[question.name])}`;
    });
    if (answers.length) card.append(element("p", `Mental health answers: ${answers.join(" / ")}`));
    if (record.caffeineTime) card.append(element("p", `Last caffeinated drink: ${answerLabel("caffeineTime", record.caffeineTime) ?? record.caffeineTime}`));
    if (record.factors?.length) card.append(element("p", `Context: ${record.factors.join(" / ")}`));
    if (record.notes) card.append(element("p", record.notes));
    container.append(card);
  });
}

function editEntry(record) {
  resetForm();
  editingId = record.id;
  for (const [name, value] of Object.entries(record)) {
    if (["id", "factors", "updatedAt", "crew", "mind"].includes(name)) continue;
    const input = form.elements.namedItem(name);
    if (input) input.value = value ?? "";
  }
  form.querySelectorAll("[name=factors]").forEach(input => {
    input.checked = record.factors?.includes(input.value) || false;
  });
  updateSleepWindow();
  document.querySelector("#edit-banner").hidden = false;
  document.querySelector("#save-button").textContent = "Update check-in";
  setView("checkin");
  showStep(0);
}

// Streak: check-in days in a row, counting back from today (or yesterday).
function streakDays() {
  const days = new Set(mine().map(record => record.date));
  const day = new Date();
  if (!days.has(localDate(day))) day.setDate(day.getDate() - 1);
  let count = 0;
  while (days.has(localDate(day))) {
    count++;
    day.setDate(day.getDate() - 1);
  }
  return count;
}

// Activities matched to the latest answers; a rotating mix when nothing is low.
function suggestedActivities(latest) {
  const activities = AMIGOS.data.activities;
  const low = latest ? QUESTIONS.filter(question => question.low !== false && latest[question.name] && latest[question.name] <= 2)
    .map(question => question.tag) : [];
  if (latest && latest.sleepQuality <= 2) low.push("sleep");
  const matched = activities.filter(activity => activity.goodFor.some(tag => low.includes(tag)));
  if (matched.length) return { picks: matched.slice(0, 3), reason: `Chosen from your latest answers: ${low.join(", ")} rated low.` };
  const start = new Date().getDate() % activities.length;
  const picks = [0, 4, 8].map(offset => activities[(start + offset) % activities.length]);
  return {
    picks,
    reason: latest ? "A mix for today. Nothing in your latest check-in was rated low." :
      "A mix for today. Save a check-in to get suggestions matched to your answers."
  };
}

// Today's plan: streak, today's status and suggested activities for the active crew member.
function renderToday() {
  const box = document.querySelector("#today-panel");
  const member = AMIGOS.crew();
  const list = mine().sort((a, b) => b.date.localeCompare(a.date));
  const doneToday = list.some(record => record.date === localDate());
  const streak = streakDays();
  const { picks, reason } = suggestedActivities(list[0]);
  const head = element("div", undefined, "today-head");
  const who = element("div", undefined, "today-stat");
  who.append(element("small", "CHECK-IN FOR"), element("b", member.name));
  const status = element("div", undefined, doneToday ? "today-stat is-done" : "today-stat");
  status.append(element("small", "TODAY"), element("b", doneToday ? "✓ Check-in saved" : "○ Not done yet"));
  const run = element("div", undefined, streak ? "today-stat is-done" : "today-stat");
  run.append(element("small", "STREAK"), element("b", `${streak} day${streak === 1 ? "" : "s"} in a row`));
  head.append(who, status, run);
  const ideas = element("div", undefined, "today-ideas");
  picks.forEach(activity => {
    const card = element("div", undefined, "today-idea");
    card.append(element("small", `${activity.type.toUpperCase()} · ${activity.minutes} MIN`),
      element("b", activity.name), element("span", activity.how));
    ideas.append(card);
  });
  box.replaceChildren(head, element("h2", "Suggested for you today"), element("p", reason), ideas);
}

document.querySelector("#phase-filter").addEventListener("change", renderHistory);
document.querySelector("#export").addEventListener("click", () => {
  const own = mine();
  if (!own.length) {
    showToast("Save a check-in before exporting.");
    return;
  }
  const data = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    crewMember: AMIGOS.crew().name,
    records: own
  };
  const file = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `amigos-routine-${localDate()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

// One crew selector in the top bar drives every view.
const crewPicker = document.querySelector("#crew-select");
AMIGOS.data.crew.forEach(member => {
  const option = element("option", `${member.name} · ${member.role}`);
  option.value = member.id;
  crewPicker.append(option);
});
crewPicker.value = AMIGOS.crewId();
crewPicker.addEventListener("change", () => AMIGOS.setCrew(crewPicker.value));
document.addEventListener("amigos:crew", () => {
  resetForm();
  updateCount();
  renderToday();
  if (!document.querySelector("#history-view").hidden) renderHistory();
  showToast(`Now showing ${AMIGOS.crew().name}.`);
});

document.querySelector("#today-label").textContent = new Date().toLocaleDateString("en", {
  weekday: "short",
  day: "numeric",
  month: "short"
});
resetForm();
updateCount();
renderToday();
if (!storageReady) showToast("Browser storage is unavailable or existing data could not be read.");
