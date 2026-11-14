// All content the interface reads: hazards, body systems, tests, symptoms,
// activities, daily questions and crew. The values below are PLACEHOLDERS until
// the research tables arrive. docs/amigos-data-request.xlsx has the same
// structure, sheet by sheet, so the real data can replace this file's contents
// without touching the interface code.
(() => {
  "use strict";

  const data = {
    placeholder: true,

    // NASA Human Research Program: the five hazards of human spaceflight.
    hazards: {
      radiation: "Space radiation",
      isolation: "Isolation and confinement",
      distance: "Distance from Earth",
      gravity: "Gravity fields",
      environment: "Hostile closed environment"
    },

    // Evidence behind each recommendation rule, shown by the "Evidence" button.
    // kind: "guidance" = published guidance, "suggestion" = the app's own rule, not yet sourced.
    // A source with an empty url shows "link pending" until the team adds the document.
    sources: {
      hrp: { title: "Human Research Program: the five hazards of human spaceflight", org: "NASA", url: "" },
      ranges: { title: "Reference ranges listed on each test", org: "See the test's own source", url: "" }
    },
    rules: {
      now: { kind: "suggestion", note: "Contacting the flight surgeon for a fast-response symptom is the app's safety rule. The symptom list and urgency levels are placeholders.", sources: [] },
      tests: { kind: "suggestion", note: "A symptom points to the tests that give a better recommendation. The symptom-to-test table is a placeholder.", sources: [] },
      bpfluids: { kind: "suggestion", note: "Low blood pressure together with low fluid intake is a common pairing. Fluid shifts in microgravity are a documented hazard.", sources: ["hrp", "ranges"] },
      temphr: { kind: "suggestion", note: "A raised temperature and heart rate together are rechecked before anything is concluded.", sources: ["ranges"] },
      moodsleep: { kind: "suggestion", note: "Short sleep and low mood together are linked to isolation and confinement.", sources: ["hrp"] },
      stayed: { kind: "guidance", note: "The current result and the period average are both outside the reference range.", sources: ["ranges"] },
      differs: { kind: "guidance", note: "A result outside the reference range, different from the period average, is repeated before acting.", sources: ["ranges"] },
      watch: { kind: "suggestion", note: "A normal result with an out-of-range average is kept under watch so the trend is clear.", sources: ["ranges"] },
      recheck: { kind: "suggestion", note: "A fresh reading is needed before comparing with the range.", sources: ["ranges"] },
      checkin: { kind: "suggestion", note: "The Daily check-in feeds sleep, food, water, mood and exercise into the assessment.", sources: [] }
    },

    // Sheet 1. `routine` lists the Daily check-in indicators that belong to the system.
    systems: [
      { id: "brain", name: "Brain & behaviour", mark: "BRAIN / MOOD", hazards: ["isolation", "distance", "radiation"], routine: ["sleep", "mind"],
        explain: "Isolation, confinement and distance from Earth can affect mood, sleep and concentration." },
      { id: "eyes", name: "Eyes", mark: "EYES", hazards: ["gravity"], routine: [],
        explain: "In weightlessness, body fluid shifts toward the head. This can change the eye and blur vision." },
      { id: "lungs", name: "Lungs", mark: "LUNGS", hazards: ["environment"], routine: [],
        explain: "A closed cabin has its own air mix and pressure, so oxygen level and breathing are checked." },
      { id: "heart", name: "Heart & circulation", mark: "HEART", hazards: ["gravity", "radiation"], routine: [],
        explain: "The heart and blood vessels adapt to weightlessness, which can change blood pressure and heart rhythm." },
      { id: "blood", name: "Blood & immune", mark: "BLOOD / IMMUNE", hazards: ["radiation", "isolation", "environment"], routine: [],
        explain: "Radiation and the stress of spaceflight can change blood cells and how well the immune system works." },
      { id: "fluids", name: "Fluids & kidneys", mark: "FLUIDS / KIDNEYS", hazards: ["gravity", "environment"], routine: ["water", "nutrition"],
        explain: "Fluid shifts and lower thirst can lead to dehydration and raise the risk of kidney stones." },
      { id: "muscle", name: "Muscle & bone", mark: "MUSCLE / BONE", hazards: ["gravity"], routine: ["activity"],
        explain: "Without daily loading, muscle and bone are lost faster than on Earth. Exercise is the main countermeasure." }
    ],

    // Sheet 2. Every test that may exist on any vehicle; the user unticks what is not on board.
    // fields: label, short (chart label), entry limits min/max, normal range lo/hi (hi is inclusive).
    tests: [
      { id: "bp", name: "Blood pressure", system: "heart", unit: "mmHg", icon: "◍", input: "number", frequency: "Daily", presets: ["daily", "monthly", "trauma"],
        device: "Upper-arm cuff monitor", step: 5,
        fields: [{ label: "Systolic (top number)", short: "Systolic", min: 50, max: 260, lo: 90, hi: 119 },
          { label: "Diastolic (bottom number)", short: "Diastolic", min: 30, max: 160, lo: 60, hi: 79 }],
        refText: "Below 120/80 mmHg; low is commonly below 90/60",
        source: "American Heart Association (normal category); NHLBI (low blood pressure)",
        why: "Shows how the heart and vessels are coping with fluid shifts.",
        steps: ["Rest seated for 5 minutes. Avoid exercise and caffeine for 30 minutes before.",
          "Place the cuff on a bare upper arm, supported at heart level.",
          "Stay still and silent while the cuff inflates.",
          "Take two readings one minute apart and save both."] },
      { id: "hr", name: "Heart rate", system: "heart", unit: "bpm", icon: "♡", input: "number", frequency: "Daily", presets: ["daily", "monthly", "trauma"],
        device: "Wrist pulse sensor", step: 5,
        fields: [{ label: "Resting heart rate", short: "Heart rate", min: 20, max: 250, lo: 60, hi: 100 }],
        refText: "60–100 bpm at rest; fit adults often rest lower",
        source: "American Heart Association (resting heart rate, adults)",
        why: "A change from your usual resting rate can be an early sign of strain, illness or dehydration.",
        steps: ["Rest seated for 5 minutes before measuring.",
          "Keep the sensor snug against the skin and stay still.",
          "Wait for a stable number, about 30 seconds.",
          "For a manual count, count wrist pulses for 30 seconds and double it."] },
      { id: "ecg", name: "ECG", system: "heart", unit: "", icon: "⌁", input: "recording", frequency: "Monthly", presets: ["monthly", "trauma"],
        device: "Chest patch ECG",
        refText: "No numeric reference; recordings are read by the medical team",
        source: "Not interpreted by this app",
        why: "Records heart rhythm so the flight surgeon can review it.",
        steps: ["Clean and dry the skin before attaching the patch or electrodes.",
          "Stay still, relax your shoulders and breathe normally.",
          "Record for the full 30 seconds without talking.",
          "Tick any symptoms you feel during the recording in Signs & symptoms."] },
      { id: "spo2", name: "SpO₂", system: "lungs", unit: "%", icon: "○", input: "number", frequency: "Daily", presets: ["daily", "monthly", "trauma"],
        device: "Fingertip pulse oximeter", step: 1,
        fields: [{ label: "Oxygen saturation", short: "SpO₂", min: 50, max: 100, lo: 95, hi: 100 }],
        refText: "95–100% (sea-level air; cabin pressure can change this)",
        source: "Mayo Clinic (pulse oximetry, healthy adults)",
        why: "Shows how much oxygen the blood is carrying in the cabin atmosphere.",
        steps: ["Warm your hand and remove anything covering the fingernail.",
          "Clip the sensor on a finger and keep the hand still.",
          "Wait at least 30 seconds for a steady number.",
          "Save the steady value, not the first one shown."] },
      { id: "rr", name: "Respiratory rate", system: "lungs", unit: "breaths/min", icon: "≈", input: "number", frequency: "Daily", presets: ["daily", "trauma"],
        device: "Manual count", step: 2,
        fields: [{ label: "Breaths per minute", short: "Respiratory rate", min: 4, max: 60, lo: 12, hi: 20 }],
        refText: "12–20 breaths/min at rest",
        source: "Johns Hopkins Medicine (vital signs, adults)",
        why: "Fast or slow breathing at rest can be an early sign that something is wrong.",
        steps: ["Rest for 5 minutes and breathe normally.",
          "Count each rise of the chest for a full 60 seconds.",
          "Try not to change your breathing while counting.",
          "Enter the count as breaths per minute."] },
      { id: "temp", name: "Temperature", system: "blood", unit: "°C", icon: "△", input: "number", frequency: "Daily", presets: ["daily", "monthly", "trauma"],
        device: "Infrared thermometer", step: 0.3, decimals: 1,
        fields: [{ label: "Body temperature", short: "Temperature", min: 30, max: 45, lo: 36.1, hi: 37.2 }],
        refText: "36.1–37.2 °C",
        source: "MedlinePlus, U.S. National Library of Medicine (adults)",
        why: "A raised temperature can signal infection, which matters when the immune system is under stress.",
        steps: ["Wait 15 minutes after exercise, eating or drinking.",
          "Use the same site each time, for example the forehead.",
          "Hold the thermometer as its guide shows until it signals.",
          "Repeat once if the number looks unexpected."] },
      { id: "glucose", name: "Blood glucose", system: "blood", unit: "mg/dL", icon: "◇", input: "number", frequency: "Monthly", presets: ["monthly"],
        device: "Handheld glucose meter", step: 8,
        fields: [{ label: "Fasting blood glucose", short: "Glucose", min: 20, max: 600, lo: 70, hi: 99 }],
        refText: "70–99 mg/dL after fasting 8 hours",
        source: "American Diabetes Association (fasting glucose, adults)",
        why: "Shows how the body is regulating energy. Nutrition can be inadequate on long missions.",
        steps: ["Measure after fasting for 8 hours, for example on waking.",
          "Wash and dry your hands.",
          "Prick the side of a fingertip and touch the drop to the strip.",
          "Read the value when the meter signals."] },
      { id: "hgb", name: "Haemoglobin", system: "blood", unit: "g/dL", icon: "◈", input: "number", frequency: "Monthly", presets: ["monthly", "trauma"],
        device: "Portable blood analyser", step: 0.5, decimals: 1,
        fields: [{ label: "Haemoglobin", short: "Haemoglobin", min: 3, max: 25, lo: 12, hi: 17.5 }],
        refText: "12.0–17.5 g/dL (adults, both sexes combined)",
        source: "PLACEHOLDER range - replace with the research team's source",
        why: "Red blood cells change in spaceflight; a drop can cause tiredness and breathlessness.",
        steps: ["Wash and dry your hands.",
          "Collect a fingertip sample into the analyser cartridge.",
          "Insert the cartridge and wait for the result.",
          "Enter the haemoglobin value shown."] },
      { id: "urine", name: "Urine concentration", system: "fluids", unit: "SG", icon: "∿", input: "number", frequency: "Weekly", presets: ["monthly"],
        device: "Urine test strip", step: 0.005, decimals: 3,
        fields: [{ label: "Urine specific gravity", short: "Specific gravity", min: 1, max: 1.06, lo: 1.005, hi: 1.03 }],
        refText: "Specific gravity 1.005–1.030",
        source: "PLACEHOLDER range - replace with the research team's source",
        why: "Concentrated urine suggests you need more fluid, which also lowers kidney stone risk.",
        steps: ["Collect a sample using the urine collection device.",
          "Wet the strip and wait the time printed on the pack.",
          "Compare the specific gravity pad with the colour chart.",
          "Enter the matching value."] },
      { id: "mass", name: "Body mass", system: "muscle", unit: "kg", icon: "▭", input: "number", frequency: "Weekly", presets: ["monthly"],
        device: "Body mass measurement device", step: 1, decimals: 1,
        fields: [{ label: "Body mass", short: "Body mass", min: 30, max: 200 }],
        refText: "No general reference; tracked against your own earlier results",
        source: "Personal trend only",
        why: "Losing mass can mean muscle loss or not eating enough.",
        steps: ["Measure at the same time of day each week.",
          "Follow the device procedure and stay still.",
          "Enter the value shown."] },
      { id: "grip", name: "Grip strength", system: "muscle", unit: "kg", icon: "✊", input: "number", frequency: "Monthly", presets: ["monthly"],
        device: "Hand dynamometer", step: 2, decimals: 0,
        fields: [{ label: "Grip strength, stronger hand", short: "Grip strength", min: 5, max: 100 }],
        refText: "No general reference; tracked against your own earlier results",
        source: "Personal trend only",
        why: "A simple check of muscle strength, which falls without loading.",
        steps: ["Hold the dynamometer with your elbow at 90 degrees.",
          "Squeeze as hard as you can for 3 seconds.",
          "Repeat three times and enter the best value."] },
      { id: "acuity", name: "Visual acuity", system: "eyes", unit: "lines", icon: "◉", input: "number", frequency: "Monthly", presets: ["monthly"],
        device: "Near-vision chart", step: 1, decimals: 0,
        fields: [{ label: "Smallest line read correctly", short: "Line read", min: 1, max: 12 }],
        refText: "No general reference; tracked against your own earlier results",
        source: "Personal trend only",
        why: "Vision can change in weightlessness as fluid shifts toward the head.",
        steps: ["Hold the chart at the marked distance in good light.",
          "Cover one eye and read down to the smallest line you can.",
          "Repeat with the other eye and enter the lower of the two results."] },
      { id: "eyeus", name: "Eye ultrasound", system: "eyes", unit: "", icon: "◎", input: "image", frequency: "Monthly", presets: ["monthly"],
        device: "Portable ultrasound",
        refText: "No numeric reference; images are read by the medical team",
        source: "Not interpreted by this app",
        why: "Lets the flight surgeon check the back of the eye for changes caused by fluid shift.",
        steps: ["Apply gel to the closed eyelid as trained.",
          "Hold the probe gently and keep the eye still.",
          "Save the image when the guide outline is matched."] },
      { id: "dose", name: "Radiation dose", system: "blood", unit: "mSv", icon: "☢", input: "number", frequency: "Weekly", presets: ["monthly"],
        device: "Personal dosimeter", step: 1, decimals: 1,
        fields: [{ label: "Cumulative mission dose", short: "Dose", min: 0, max: 5000 }],
        refText: "No general reference; mission dose limits are set by the space agency",
        source: "Mission limits not loaded",
        why: "Tracks your exposure to space radiation over the mission.",
        steps: ["Read the cumulative dose on your personal dosimeter.",
          "Enter the value shown."] }
    ],

    // Sheet 3. urgency: "self" (no tests needed), "tests" (tests improve the
    // recommendation), "now" (fast response: contact the flight surgeon).
    symptoms: [
      ["Headache", "brain", "tests", ["bp", "temp"], "Drink water, rest your eyes and dim the lights."],
      ["Trouble sleeping", "brain", "self", [], "Keep your scheduled sleep period and dim lights an hour before."],
      ["Low mood", "brain", "self", [], "Do one activity you enjoy and talk with a crewmate or family."],
      ["Anxiety or worry", "brain", "self", [], "Try slow breathing for five minutes and write down what is on your mind."],
      ["Trouble concentrating", "brain", "self", [], "Take a short break, drink water and return to one task at a time."],
      ["Unusual tiredness", "brain", "tests", ["temp", "hr", "glucose", "hgb"], "Rest, eat a full meal and keep your sleep period."],
      ["Confusion", "brain", "now", ["glucose", "spo2", "temp"], ""],
      ["Fainting", "brain", "now", ["bp", "hr", "glucose", "ecg"], ""],
      ["Blurred vision", "eyes", "tests", ["acuity", "eyeus"], "Rest your eyes and note when it happens."],
      ["Eye pain", "eyes", "tests", ["acuity"], "Avoid rubbing the eye."],
      ["Seeing flashes or spots", "eyes", "tests", ["acuity", "eyeus"], "Note which eye and how long it lasts."],
      ["Sudden loss of vision", "eyes", "now", ["acuity", "eyeus"], ""],
      ["Palpitations", "heart", "tests", ["hr", "ecg", "bp"], "Sit still, breathe slowly and avoid caffeine."],
      ["Dizziness", "heart", "tests", ["bp", "hr", "glucose"], "Sit or hold on, drink water and move slowly."],
      ["Swelling in face or legs", "heart", "tests", ["bp", "mass"], "Note where and when the swelling appears."],
      ["Chest pain or pressure", "heart", "now", ["ecg", "bp", "hr", "spo2"], ""],
      ["Shortness of breath", "lungs", "tests", ["spo2", "rr", "hr"], "Stop activity and rest in a comfortable position."],
      ["Cough", "lungs", "tests", ["temp", "spo2"], "Drink fluids and rest your voice."],
      ["Sore throat", "lungs", "self", [], "Drink warm fluids and rest your voice."],
      ["Severe trouble breathing", "lungs", "now", ["spo2", "rr", "hr"], ""],
      ["Thirst or dry mouth", "fluids", "self", [], "Drink water now and follow your mission fluid plan."],
      ["Very dark urine", "fluids", "tests", ["urine"], "Drink water and follow your mission fluid plan."],
      ["Pain in the side or back", "fluids", "tests", ["urine", "temp"], "Drink water and note where the pain is."],
      ["Nausea", "fluids", "tests", ["temp", "glucose"], "Sip water and eat small plain meals."],
      ["Vomiting or diarrhoea", "fluids", "tests", ["urine", "temp", "hr"], "Sip fluids often to replace what you lose."],
      ["Fever or chills", "blood", "tests", ["temp", "hr"], "Rest and drink fluids."],
      ["Skin rash", "blood", "self", [], "Keep the area clean and dry and avoid scratching."],
      ["Wound that is not healing", "blood", "tests", ["temp"], "Keep the wound clean and covered."],
      ["Swollen glands", "blood", "tests", ["temp", "hgb"], "Rest and drink fluids."],
      ["Heavy bleeding", "blood", "now", ["bp", "hr", "hgb"], ""],
      ["Back pain", "muscle", "self", [], "Do your stretching routine and avoid heavy loads today."],
      ["Muscle cramps", "muscle", "self", [], "Stretch the muscle gently and drink water."],
      ["Joint pain", "muscle", "self", [], "Rest the joint and reduce exercise load today."],
      ["Injury from a fall or impact", "muscle", "tests", ["bp", "hr", "spo2"], "Rest the injured part and avoid loading it."],
      ["Possible broken bone", "muscle", "now", ["bp", "hr"], ""]
    ].map(([name, system, urgency, tests, care]) => ({ name, system, urgency, tests, care })),

    // Sheet 5. goodFor tags match daily question tags and indicator ids.
    activities: [
      { name: "Chess with a crewmate", type: "Social", minutes: 30, goodFor: ["mood", "connection", "focus"], how: "Play one game with another crew member." },
      { name: "Message or call family", type: "Social", minutes: 20, goodFor: ["mood", "connection"], how: "Record a message or use your scheduled family time." },
      { name: "Film night with the crew", type: "Social", minutes: 90, goodFor: ["mood", "connection", "calm"], how: "Pick a film together and watch it as a group." },
      { name: "Read a book chapter", type: "Mental", minutes: 25, goodFor: ["calm", "focus", "sleep"], how: "Read one chapter away from your work station." },
      { name: "Journal for 10 minutes", type: "Mental", minutes: 10, goodFor: ["mood", "calm"], how: "Write what went well today and what is on your mind." },
      { name: "Puzzle or strategy game", type: "Mental", minutes: 20, goodFor: ["focus", "mood"], how: "Do a puzzle that needs full attention." },
      { name: "Resistance exercise session", type: "Physical", minutes: 45, goodFor: ["energy", "activity", "mood", "sleep"], how: "Complete your planned resistance session." },
      { name: "Treadmill or cycle session", type: "Physical", minutes: 30, goodFor: ["energy", "activity", "mood"], how: "Do a steady aerobic session at a comfortable effort." },
      { name: "Stretching routine", type: "Physical", minutes: 10, goodFor: ["calm", "sleep", "energy"], how: "Stretch your back, hips and shoulders slowly." },
      { name: "Slow breathing", type: "Relaxation", minutes: 5, goodFor: ["calm", "sleep", "focus"], how: "Breathe in for 4 seconds and out for 6, for five minutes." },
      { name: "Listen to music", type: "Relaxation", minutes: 15, goodFor: ["calm", "mood", "sleep"], how: "Play a favourite album with your eyes closed." },
      { name: "Window time: watch Earth or the sky", type: "Relaxation", minutes: 10, goodFor: ["mood", "calm", "connection"], how: "Spend ten quiet minutes at a window." }
    ],

    // Sheet 6. PLACEHOLDER mental health questions until the team's questionnaire arrives.
    // Every answer is 1-5, worst to best. `tag` picks matching activities.
    // The topics come from NASA instruments; the wording is the team's own, not a validated item.
    // `source` names the instrument each topic comes from (the Evidence list can show it).
    questions: [
      { name: "sleepHours", slot: "sleep", short: "Sleep", tag: "sleep", topic: "Sleep", mind: false, low: false, choice: true, metric: true, min: [0, 5, 6, 7, 9], text: "About how long did you sleep?", labels: "Under 5 hours,5 to 6 hours,6 to 7 hours,7 to 9 hours,More than 9 hours", values: [4.5, 5.5, 6.5, 8, 9.5], source: "National Sleep Foundation, 7 to 9 hours for adults (the reference this app uses); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/ (research handoff action A01, sleep_hours)" },
      { name: "mood", slot: "mind", short: "Mood", tag: "mood", text: "How was your overall mood today?", labels: "Very low,Low,Neutral,Good,Very good", source: "NASA, Spaceflight Standard Measures: Characterizing How Humans Adapt in Space, https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space (pre-sleep mood questionnaire topic). Question wording adapted by the AMIGOS team; not a validated item." },
      { name: "energy", slot: "mind", short: "Energy", tag: "energy", text: "How alert and energetic did you feel today?", labels: "Very poor,Poor,Fair,Good,Very good", source: "NASA Cognition Test Battery: Alertness and Mood Survey" },
      { name: "connection", slot: "mind", short: "Connection", tag: "connection", text: "How connected did you feel to your crew and family?", labels: "Very poor,Poor,Fair,Good,Very good", source: "NASA Spaceflight Standard Measures: team cohesion" },
      { name: "focus", slot: "mind", short: "Focus", tag: "focus", text: "How well could you concentrate on your tasks?", labels: "Very poor,Poor,Fair,Good,Very good", source: "NASA Cognition Test Battery: Alertness and Mood Survey" },
      { name: "stress", slot: "mind", short: "Stress", tag: "calm", topic: "Mental health", text: "How stressed did you feel today?", labels: "Extremely stressed,Very stressed,Moderately stressed,Slightly stressed,Not stressed", source: "NASA, Human Research Program BMed Evidence Report (2016); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/" },
      { name: "groggy", slot: "sleep", short: "Grogginess on waking", tag: "sleep", topic: "Sleep", mind: false, low: false, text: "How groggy did you feel in the first hour after you woke up?", labels: "Very groggy,Groggy,A little groggy,Slightly groggy,Not groggy at all", source: "NASA Technical Reports Server 20140003280, Fatigue-Related Countermeasures for Long-Duration Exploration Missions, https://ntrs.nasa.gov/citations/20140003280; NASA Human Research Program evidence on sleep loss, circadian desynchronization and work overload (it flags grogginess after waking, sleep inertia, as a risk for quick decisions). Checked from search summaries only; verify" },
      { name: "nightSleep", slot: "sleep", short: "Night sleep", tag: "sleep", topic: "Sleep", mind: false, text: "How well did you sleep through the night?", labels: "Woke up many times,Woke up often,Woke up a few times,Woke up once,Slept through", source: "NASA, Human Research Program BMed Evidence Report (2016); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/" },
      { name: "meals", slot: "food", short: "Meals", tag: "food", topic: "Nutrition", mind: false, low: false, choice: true, metric: true, text: "How many meals did you eat today?", labels: "None,One,Two,Three,Four or more", values: [0, 1, 2, 3, 4], source: "NASA, The Menu for Mars (2021), https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/; NASA, How Does Spaceflight Change Food Appeal? (2021), https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/" },
      { name: "water", slot: "food", short: "Water", tag: "water", topic: "Water", mind: false, low: false, choice: true, metric: true, text: "How much plain water did you drink today?", labels: "Under 1 litre,1 to 1.5 litres,1.5 to 2 litres,2 to 2.5 litres,More than 2.5 litres", values: [750, 1250, 1750, 2250, 2750], source: "NASA OCHMO, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf; NASA Technical Reports Server 20000020625 (a minimum of about 2 litres a day is cited there), https://ntrs.nasa.gov/citations/20000020625. Checked from search summaries only; verify" },
      { name: "caffeine", slot: "food", short: "Caffeinated drinks", tag: "caffeine", topic: "Other", mind: false, low: false, choice: true, metric: true, text: "How many caffeinated drinks did you have today?", labels: "None,One,Two,Three,Four or more", values: [0, 1, 2, 3, 4], source: "NASA Technical Reports Server 20240004245, Caffeine consumption aboard the International Space Station (2024 conference poster), https://ntrs.nasa.gov/citations/20240004245. Checked from a search summary only; findings are preliminary" },
      { name: "caffeineTime", slot: "food", short: "Last caffeinated drink", tag: "caffeine", topic: "Other", mind: false, low: false, choice: true, metric: true, textValue: true, text: "When was your last caffeinated drink?", labels: "No caffeine today,Morning,Afternoon,Evening,Close to bedtime", values: ["none", "morning", "afternoon", "evening", "bedtime"], source: "NASA Technical Reports Server 20240004245, Caffeine consumption aboard the International Space Station (2024 conference poster), https://ntrs.nasa.gov/citations/20240004245. Checked from a search summary only; findings are preliminary" },
      { name: "workload", slot: "mind", short: "Workload", tag: "focus", topic: "Mental health", text: "How manageable was your workload today?", labels: "Overwhelming,Very heavy,Heavy but fine,Manageable,Well balanced", source: "NASA, Human Research Program BMed Evidence Report (2016); NASA, Handle With Care: HERA Inspects Samples (2022), https://www.nasa.gov/humans-in-space/handle-with-care-hera-crew-member-inspects-samples/; NASA, HERA Crew Member Stores Swabs (2022), https://www.nasa.gov/humans-in-space/hera-crew-member-stores-swabs-for-analyzing-microbes/; NASA, Breathing Easy: HERA Mock Environment (2022), https://www.nasa.gov/humans-in-space/breathing-easy-hera-crew-member-checks-status-of-mock-environment/" },
      { name: "contactHome", slot: "mind", short: "Contact with Earth", tag: "contactHome", topic: "Mental health", mind: false, low: false, choice: true, textValue: true, text: "Were you able to contact family or friends on Earth today?", labels: "Yes,No", values: ["yes", "no"], source: "NASA, Houston, Do You Copy? HERA Crew Navigates Communication Delays (2022), https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/; NASA, Hazard 3: Distance (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/ (research handoff action A03)" },
      { name: "recreation", slot: "mind", short: "Recreation", tag: "mood", topic: "Mental health", text: "How much time did you spend on something you enjoy today?", labels: "None,Very little,Some,Quite a lot,A lot", source: "NASA, Human Research Program BMed Evidence Report (2016); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/; NASA, space gardening and Veggie crew survey (2021)" },
      { name: "waterQuality", slot: "food", short: "Water looked or tasted different", tag: "waterQuality", topic: "Water", mind: false, low: false, choice: true, textValue: true, text: "Did your drinking water look, smell or taste different from usual today?", labels: "Yes,No", values: ["yes", "no"], source: "NASA, NASA Achieves Water Recovery Milestone on the International Space Station (2023), https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/; NASA, Researchers Put Space Garden Microbes Under the Microscope (2021), https://www.nasa.gov/missions/station/researchers-put-space-garden-microbes-under-the-microscope/ (research handoff action A09). This is how it looked, smelled or tasted, not a water test" },
      { name: "thirst", slot: "food", short: "Thirst", tag: "water", topic: "Water", mind: false, text: "How thirsty did you feel today?", labels: "Very thirsty,Thirsty,Somewhat thirsty,Slightly thirsty,Not thirsty", source: "NASA Technical Reports Server record 20000020625 (fluid shifts, reduced thirst and intake in flight), https://ntrs.nasa.gov/citations/20000020625; NASA Office of the Chief Health and Medical Officer, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf. Checked from search summaries only; verify against the full text." },
      { name: "activity", slot: "activity", short: "Exercise", tag: "activity", topic: "Exercise", mind: false, low: false, choice: true, metric: true, text: "How long did you exercise today?", labels: "None,Under 30 minutes,30 to 60 minutes,1 to 2 hours,More than 2 hours", values: [0, 15, 45, 90, 150], source: "NASA, Science in Space: May 2024, Exercise (2024), https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ (research handoff source S13, action A10). The page says the ISS routine is not a universal prescription" },
      { name: "cabinAir", slot: "activity", short: "Cabin air felt stuffy", tag: "cabinAir", topic: "Other", mind: false, low: false, choice: true, textValue: true, text: "Did the cabin air feel stuffy or uncomfortable to breathe today?", labels: "Yes,No", values: ["yes", "no"], source: "NASA, Breathing Easy: HERA Mock Environment (2022), https://www.nasa.gov/humans-in-space/breathing-easy-hera-crew-member-checks-status-of-mock-environment/; NASA, Spacecraft Air Quality (2023), https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/; NASA, Risk of Reduced Crew Health and Performance Due to Hypoxia, https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/ (research handoff actions A08 and ACT-02). This is how it felt to you, not a measurement of the air" },
      { name: "vision", slot: "activity", short: "Blurred vision", tag: "vision", topic: "Other", mind: false, low: false, choice: true, textValue: true, text: "Did your vision seem blurred or different today?", labels: "Yes,No", values: ["yes", "no"], source: "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS), https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ (11 Mar 2025); NASA, SANS risk reference, https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/" }
    ],

    // Sample crew for the prototype.
    crew: [{
      id: "c1", name: "Rana Haddad", role: "Flight engineer", age: 38, journalOwner: true,
      mission: "AMIGOS-1 analog mission", missionDay: 42, missionLength: 180,
      history: "Appendectomy (2015)", conditions: "None recorded", medications: "None", allergies: "Penicillin",
      baseline: { bp: "112/72 mmHg", hr: "58 bpm", spo2: "98%", rr: "14 breaths/min", temp: "36.6 °C", mass: "71.0 kg" },
      baselineValue: { bp: 112, hr: 58, spo2: 98, rr: 14, temp: 36.6, mass: 71 }
    }, {
      id: "c2", name: "Marco Okafor", role: "Commander", age: 45, journalOwner: true,
      mission: "AMIGOS-1 analog mission", missionDay: 42, missionLength: 180,
      history: "Left knee arthroscopy (2019)", conditions: "Seasonal allergic rhinitis",
      medications: "Loratadine 10 mg, as needed", allergies: "None known",
      baseline: { bp: "118/76 mmHg", hr: "64 bpm", spo2: "98%", rr: "15 breaths/min", temp: "36.8 °C", mass: "82.3 kg" },
      baselineValue: { bp: 118, hr: 64, spo2: 98, rr: 15, temp: 36.8, mass: 82.3 }
    }, {
      id: "c3", name: "Lena Varga", role: "Mission specialist", age: 33, journalOwner: true,
      mission: "AMIGOS-1 analog mission", missionDay: 42, missionLength: 180,
      history: "None recorded", conditions: "None recorded", medications: "None", allergies: "Latex",
      baseline: { hr: "66 bpm", temp: "36.5 °C" },
      baselineValue: { hr: 66, temp: 36.5 }
    }]
  };

  // Active crew member, shared by every view.
  const CREW_KEY = "amigos-crew-v1";
  let active = null;
  try {
    active = localStorage.getItem(CREW_KEY);
  } catch {
    active = null;
  }
  if (!data.crew.some(member => member.id === active)) active = data.crew[0].id;

  window.AMIGOS = {
    data,
    crewId: () => active,
    crew: () => data.crew.find(member => member.id === active),
    setCrew(id) {
      if (!data.crew.some(member => member.id === id) || id === active) return;
      active = id;
      try {
        localStorage.setItem(CREW_KEY, id);
      } catch {
        // The choice still applies for this session.
      }
      document.dispatchEvent(new CustomEvent("amigos:crew", { detail: id }));
    }
  };
})();
