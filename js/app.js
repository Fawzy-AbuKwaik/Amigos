// Keep the original key so existing daily entries survive the redesign.
const STORAGE_KEY = "amigos-routine-v1";
const form = document.querySelector("#routine-form");
const panels = [...document.querySelectorAll(".step-panel")];
const progressItems = [...document.querySelectorAll(".progress li")];
const touchedSliders = new Set();
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

function localDate() {
  const date = new Date();
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

// Mood and sleep quality use labeled, keyboard-accessible radio groups.
document.querySelectorAll(".rating").forEach(group => {
  group.dataset.labels.split(",").forEach((description, index) => {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = group.dataset.name;
    input.value = index + 1;
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

// A slider starts with no recorded answer, rather than silently saving 5/10.
function refreshSliders() {
  ["stress", "fatigue"].forEach(name => {
    const answered = touchedSliders.has(name);
    const input = form.elements[name];
    document.querySelector(`#${name}-value`).textContent = answered ?
      `${input.value} / 10` : "Choose";
    input.setAttribute("aria-valuetext", answered ?
      `${input.value} out of 10` : "Not answered. Move the slider to choose.");
  });
}
["stress", "fatigue"].forEach(name => {
  const input = form.elements[name];
  const markAnswered = () => {
    touchedSliders.add(name);
    refreshSliders();
  };
  input.addEventListener("input", markAnswered);
  input.addEventListener("change", markAnswered);
  // Clicking the existing thumb also allows an intentional mid-scale answer.
  input.addEventListener("pointerup", markAnswered);
  input.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      touchedSliders.add(name);
      setTimeout(refreshSliders, 0);
    }
  });
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
  document.querySelector("#next-button").hidden = index === 2;
  document.querySelector("#save-button").hidden = index !== 2;
  document.querySelector("#step-caption").textContent = `Step ${index + 1} of 3`;
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
    if (Number(form.elements.sleepHours.value) > windowHours + 0.01) {
      return showError("Actual sleep cannot be longer than the time between sleep start and wake-up.");
    }
  }
  if (index === 1 && touchedSliders.size < 2) {
    return showError("Please choose both your stress and tiredness ratings using the sliders.");
  }
  if (index === 2 && form.elements.caffeineTime.value &&
    (form.elements.caffeine.value === "" || Number(form.elements.caffeine.value) === 0)) {
    return showError("Enter how many caffeinated drinks you had, or clear the last-drink time.");
  }
  return true;
}

document.querySelector("#next-button").addEventListener("click", () => {
  if (validateStep(currentStep)) showStep(currentStep + 1);
});
document.querySelector("#back-button").addEventListener("click", () => showStep(currentStep - 1));

function setView(view) {
  document.querySelector("#checkin-view").hidden = view !== "checkin";
  document.querySelector("#history-view").hidden = view !== "history";
  document.querySelector("#medical-view").hidden = view !== "medical";
  document.querySelector("#header-view").textContent = {
    checkin: "DAILY CHECK-IN",
    history: "MY JOURNAL",
    medical: "MEDICAL VIEW"
  } [view];
  document.querySelectorAll(".nav").forEach(button => {
    const active = button.dataset.view === view;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (view === "history") renderHistory();
  // Lets the Medical view (js/medical.js) refresh when the view changes.
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
  touchedSliders.clear();
  form.elements.date.value = localDate();
  form.elements.date.max = localDate();
  document.querySelector("#edit-banner").hidden = true;
  document.querySelector("#save-button").textContent = "Save check-in";
  refreshSliders();
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
  if (currentStep < 2) {
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
  if (!validateStep(2)) return;
  if (!storageReady) {
    showError("Existing browser data could not be read. Recover it before saving new entries.");
    return;
  }
  const data = new FormData(form);
  const entry = Object.fromEntries(data.entries());
  entry.factors = data.getAll("factors");
  if (records.some(record => record.id !== editingId && record.date === entry.date && record.phase === entry.phase)) {
    showError("An entry already exists for this date and mission phase. Open My journal to edit it.");
    return;
  }
  ["sleepHours", "sleepQuality", "mood", "stress", "fatigue"].forEach(name => {
    entry[name] = Number(entry[name]);
  });
  // An omitted optional measurement is unknown, not a measured zero.
  ["activity", "water", "caffeine"].forEach(name => {
    entry[name] = entry[name] === "" ? null : Number(entry[name]);
  });
  entry.id = editingId || crypto.randomUUID();
  entry.updatedAt = new Date().toISOString();
  if (persist([...records.filter(record => record.id !== entry.id), entry])) {
    resetForm();
    updateCount();
    setView("history");
    showToast("Check-in saved on this browser.");
  }
});

function updateCount() {
  document.querySelector("#count").textContent = records.length;
}

// textContent prevents notes from being interpreted as executable HTML.
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function displayValue(value, unit = "") {
  return value === null || value === undefined || value === "" ? "Not recorded" : `${value}${unit}`;
}

function renderHistory() {
  const container = document.querySelector("#entries");
  container.replaceChildren();
  const phase = document.querySelector("#phase-filter").value;
  const entries = records.filter(record => phase === "all" || record.phase === phase)
    .sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) {
    container.append(element("div", "No check-ins here yet. Start with a new daily entry.", "empty"));
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
      ["Actual sleep", displayValue(record.sleepHours, " h")],
      ["Sleep quality", displayValue(record.sleepQuality, " / 5")],
      ["Mood", displayValue(record.mood, " / 5")],
      ["Stress", displayValue(record.stress, " / 10")],
      ["Tiredness", displayValue(record.fatigue, " / 10")],
      ["Activity", displayValue(record.activity, " min")],
      ["Water", displayValue(record.water, " mL")],
      ["Caffeinated drinks", displayValue(record.caffeine)]
    ];
    values.forEach(([name, value]) => {
      const metric = element("div");
      metric.append(element("small", name), element("b", value));
      metrics.append(metric);
    });
    card.append(header, metrics);
    card.append(element("p", `Sleep window: ${record.sleepStart.replace("T", " ")} to ${record.sleepEnd.replace("T", " ")}`));
    if (record.caffeineTime) card.append(element("p", `Last caffeinated drink: ${record.caffeineTime}`));
    if (record.factors?.length) card.append(element("p", `Context: ${record.factors.join(" / ")}`));
    if (record.notes) card.append(element("p", record.notes));
    container.append(card);
  });
}

function editEntry(record) {
  resetForm();
  editingId = record.id;
  for (const [name, value] of Object.entries(record)) {
    if (["id", "factors", "updatedAt"].includes(name)) continue;
    const input = form.elements.namedItem(name);
    if (input) input.value = value ?? "";
  }
  form.querySelectorAll("[name=factors]").forEach(input => {
    input.checked = record.factors?.includes(input.value) || false;
  });
  ["stress", "fatigue"].forEach(name => {
    if (record[name] !== null && record[name] !== undefined) touchedSliders.add(name);
  });
  refreshSliders();
  updateSleepWindow();
  document.querySelector("#edit-banner").hidden = false;
  document.querySelector("#save-button").textContent = "Update check-in";
  setView("checkin");
  showStep(0);
}

document.querySelector("#phase-filter").addEventListener("change", renderHistory);
document.querySelector("#export").addEventListener("click", () => {
  if (!records.length) {
    showToast("Save a check-in before exporting.");
    return;
  }
  const data = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    records
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

document.querySelector("#today-label").textContent = new Date().toLocaleDateString("en", {
  weekday: "short",
  day: "numeric",
  month: "short"
});
resetForm();
updateCount();
if (!storageReady) showToast("Browser storage is unavailable or existing data could not be read.");
