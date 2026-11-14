// Shared data and crew selection. Reviewed workbook data is applied below.
// Inspect AMIGOS.data.research.meta.coverage for imported and pending tables.
// Legacy medical/demo content remains until its UI owner completes migration.
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
      ranges: { title: "Reference ranges listed on each test", org: "See the test's own source", url: "" },
      hypotension: { title: "Low Blood Pressure", org: "NHLBI, NIH", url: "https://www.nhlbi.nih.gov/health/low-blood-pressure" },
      sleepRisk: { title: "Risk from Inadequate Sleep and Irregular Schedules", org: "NASA", url: "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/" }
    },
    rules: {
      now: { kind: "suggestion", note: "Contacting the flight surgeon for a fast-response symptom is the app's safety rule. The symptom list and urgency levels are placeholders.", sources: [] },
      tests: { kind: "suggestion", note: "A symptom points to the tests that give a better recommendation. The symptom-to-test table is a placeholder.", sources: [] },
      bpfluids: { kind: "suggestion", note: "A low reading does not establish dehydration. NHLBI describes several possible causes and treatment based on symptoms and cause. This app suggests a repeat measurement and mission medical review; reported water categories do not determine treatment.", sources: ["hypotension"] },
      temphr: { kind: "suggestion", note: "A raised temperature and heart rate together are rechecked before anything is concluded.", sources: ["ranges"] },
      moodsleep: { kind: "suggestion", note: "NASA describes sleep disruption, workload and effects on well-being. Prompts use individual self-reported answers and sleep categories, without diagnosing a condition or assigning a validated mental-health score.", sources: ["sleepRisk"] },
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
        attachment: { accept: ".png,.jpg,.jpeg,.pdf,.mp4,.webm", label: "ECG image, PDF or video" },
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
        attachment: { accept: ".png,.jpg,.jpeg,.mp4,.webm", label: "Ultrasound image or video" },
        refText: "No numeric reference; images are read by the medical team",
        source: "Not interpreted by this app",
        why: "Lets the flight surgeon check the back of the eye for changes caused by fluid shift.",
        steps: ["Apply gel to the closed eyelid as trained.",
          "Hold the probe gently and keep the eye still.",
          "Save the image when the guide outline is matched."] },

      {"id": "creatinine", "name": "Serum creatinine", "system": "fluids", "unit": "mg/dL", "icon": "?", "input": "number", "frequency": "Clinician-directed", "presets": [], "device": "Clinical laboratory report (availability unverified)", "decimals": 2, "step": 0.01, "fields": [{"label": "Serum creatinine", "short": "Serum creatinine", "min": 0}], "refText": "Use the laboratory report reference interval and clinical context; no automatic classification", "source": "NIDDK, Laboratory Evaluation of Kidney Disease: https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation", "why": "Records a laboratory kidney-function marker for clinician review alongside eGFR and urine albumin.", "steps": ["Obtain the test only when requested by the medical team.", "Copy the reported value in the exact units shown here; do not convert an incompatible result by guesswork.", "Use the actual sample collection time and keep the original laboratory report for review."]},
      {"id": "egfr", "name": "Estimated GFR (eGFR)", "system": "fluids", "unit": "mL/min/1.73 m2", "icon": "?", "input": "number", "frequency": "Clinician-directed", "presets": [], "device": "Clinical laboratory report (availability unverified)", "decimals": 2, "step": 0.01, "fields": [{"label": "Laboratory-reported eGFR", "short": "Estimated GFR (eGFR)", "min": 0}], "refText": "Use the laboratory report reference interval and clinical context; no automatic classification", "source": "NIDDK, Laboratory Evaluation of Kidney Disease: https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation", "why": "Records the laboratory-reported kidney filtration estimate; the app does not calculate eGFR or diagnose kidney disease.", "steps": ["Obtain the test only when requested by the medical team.", "Copy the reported value in the exact units shown here; do not convert an incompatible result by guesswork.", "Use the actual sample collection time and keep the original laboratory report for review."]},
      {"id": "uacr", "name": "Urine albumin-to-creatinine ratio (UACR)", "system": "fluids", "unit": "mg/g", "icon": "?", "input": "number", "frequency": "Clinician-directed", "presets": [], "device": "Clinical laboratory report (availability unverified)", "decimals": 2, "step": 0.01, "fields": [{"label": "Urine albumin-to-creatinine ratio", "short": "Urine albumin-to-creatinine ratio (UACR)", "min": 0}], "refText": "Use the laboratory report reference interval and clinical context; no automatic classification", "source": "NIDDK, Laboratory Evaluation of Kidney Disease: https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation", "why": "Tracks the reported urine albumin-to-creatinine ratio for medical review; separate from urine concentration.", "steps": ["Obtain the test only when requested by the medical team.", "Copy the reported value in the exact units shown here; do not convert an incompatible result by guesswork.", "Use the actual sample collection time and keep the original laboratory report for review."]},
      {"id": "tsh", "name": "Thyroid-stimulating hormone (TSH)", "system": "metabolic", "unit": "mIU/L", "icon": "?", "input": "number", "frequency": "Clinician-directed", "presets": [], "device": "Clinical laboratory report (availability unverified)", "decimals": 2, "step": 0.01, "fields": [{"label": "TSH", "short": "Thyroid-stimulating hormone (TSH)", "min": 0}], "refText": "Use the laboratory report reference interval and clinical context; no automatic classification", "source": "MedlinePlus, Thyroid function tests: https://medlineplus.gov/ency/article/003444.htm", "why": "Records a thyroid-related hormone result for interpretation with the laboratory interval and other thyroid tests.", "steps": ["Obtain the test only when requested by the medical team.", "Copy the reported value in the exact units shown here; do not convert an incompatible result by guesswork.", "Use the actual sample collection time and keep the original laboratory report for review."]},
      {"id": "ft4", "name": "Free thyroxine (Free T4)", "system": "metabolic", "unit": "ng/dL", "icon": "?", "input": "number", "frequency": "Clinician-directed", "presets": [], "device": "Clinical laboratory report (availability unverified)", "decimals": 2, "step": 0.01, "fields": [{"label": "Free T4", "short": "Free thyroxine (Free T4)", "min": 0}], "refText": "Use the laboratory report reference interval and clinical context; no automatic classification", "source": "MedlinePlus, Thyroid function tests: https://medlineplus.gov/ency/article/003444.htm", "why": "Records a thyroid hormone result for medical review alongside TSH.", "steps": ["Obtain the test only when requested by the medical team.", "Copy the reported value in the exact units shown here; do not convert an incompatible result by guesswork.", "Use the actual sample collection time and keep the original laboratory report for review."]},
      {"id": "cortisol", "name": "Cortisol", "system": "metabolic", "unit": "ug/dL", "icon": "?", "input": "number", "frequency": "Clinician-directed", "presets": [], "device": "Clinical laboratory report (availability unverified)", "decimals": 2, "step": 0.01, "fields": [{"label": "Cortisol (blood sample)", "short": "Cortisol", "min": 0}], "refText": "Use the laboratory report reference interval and clinical context; no automatic classification", "source": "MedlinePlus, Cortisol Test: https://medlineplus.gov/lab-tests/cortisol-test/", "why": "Records a blood cortisol result. Collection time and test method matter; this is not an automatic stress score.", "steps": ["Obtain the test only when requested by the medical team.", "Copy the reported value in the exact units shown here; do not convert an incompatible result by guesswork.", "Use the actual sample collection time and keep the original laboratory report for review."]},
      {"id": "echo", "name": "Echocardiogram", "system": "heart", "unit": "", "icon": "?", "input": "report", "frequency": "Clinician-directed", "presets": [], "device": "Clinical ultrasound (trained operator; availability unverified)", "attachment": {"accept": ".png,.jpg,.jpeg,.pdf,.mp4,.webm", "label": "Echocardiogram image, report or video"}, "refText": "Specialist review required; no automatic numeric interpretation", "source": "NHLBI, Heart Tests: https://www.nhlbi.nih.gov/health/heart-tests", "why": "Stores heart ultrasound images, video or a specialist report for medical review.", "steps": ["A qualified operator performs the clinician-requested examination.", "Import the exported image, video or PDF report with the examination time.", "The app stores the file; interpretation remains with the medical team."]},
      {"id": "brain-mri", "name": "MRI of brain and eyes", "system": "brain-and-spinal-fluid", "unit": "", "icon": "?", "input": "report", "frequency": "Clinician-directed", "presets": [], "device": "Specialist MRI facility; not assumed available on a vehicle", "attachment": {"accept": ".png,.jpg,.jpeg,.pdf,.mp4,.webm", "label": "MRI of brain and eyes image, report or video"}, "refText": "Specialist review required; no automatic numeric interpretation", "source": "NASA, SANS risk: https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/", "why": "Stores specialist imaging reports relevant to brain and eye structural review. Not a direct cerebrospinal fluid pressure measurement.", "steps": ["Arrange imaging through the medical team in an appropriate specialist facility.", "Import the clinical report or exported image/video; native DICOM is not supported.", "Record the scan date. The app does not infer intracranial pressure from imaging."]},
      {"id": "oct", "name": "Optical coherence tomography (OCT)", "system": "eyes", "unit": "", "icon": "?", "input": "report", "frequency": "Clinician-directed", "presets": [], "device": "OCT scanner (trained operator; availability unverified)", "attachment": {"accept": ".png,.jpg,.jpeg,.pdf,.mp4,.webm", "label": "Optical coherence tomography (OCT) image, report or video"}, "refText": "Specialist review required; no automatic numeric interpretation", "source": "NASA, SANS risk: https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/", "why": "Stores optic nerve and retinal imaging for SANS-related review; it does not directly measure cerebrospinal fluid pressure.", "steps": ["A trained operator obtains the requested scan.", "Import the annotated image or clinical report with the scan date and eye identified."], "relatedSystems": ["brain-and-spinal-fluid"]},
      {"id": "jugular-us", "name": "Jugular venous ultrasound", "system": "brain-and-spinal-fluid", "unit": "", "icon": "?", "input": "report", "frequency": "Clinician-directed", "presets": [], "device": "Clinical/research ultrasound; availability unverified", "attachment": {"accept": ".png,.jpg,.jpeg,.pdf,.mp4,.webm", "label": "Jugular venous ultrasound image, report or video"}, "refText": "Specialist review required; no automatic numeric interpretation", "source": "NASA, Fluid Shifts: https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/", "why": "Stores neck-vein ultrasound findings for fluid-shift assessment. This is an indirect indicator, not a direct CSF pressure result.", "steps": ["A qualified operator performs the examination under an approved clinical or research protocol.", "Import the annotated image, video or reviewed report.", "No intracranial pressure cutoff or diagnosis is applied."]},
      {"id": "ccfp", "name": "Cerebral/cochlear fluid pressure (CCFP) report", "system": "brain-and-spinal-fluid", "unit": "", "icon": "?", "input": "report", "frequency": "Clinician-directed", "presets": [], "device": "Research device only; vehicle availability unverified", "attachment": {"accept": ".png,.jpg,.jpeg,.pdf,.mp4,.webm", "label": "Cerebral/cochlear fluid pressure (CCFP) report image, report or video"}, "refText": "Specialist review required; no automatic numeric interpretation", "source": "NASA, Fluid Shifts: https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/", "why": "Stores an existing research-device report on noninvasive pressure indicators. Research only; no clinical threshold or direct CSF measurement is inferred.", "steps": ["Only a qualified research team operates the device under an approved protocol.", "Import an existing device report with the acquisition date.", "The app does not recommend invasive pressure measurement or spinal fluid sampling."]},
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
      ["Dizziness", "heart", "tests", ["bp", "hr", "glucose"], "Pause your task, secure your position and contact the flight surgeon if dizzy or unwell. Follow the mission fluid plan; this symptom does not establish dehydration."],
      ["Swelling in face or legs", "heart", "tests", ["bp", "mass"], "Note where and when the swelling appears."],
      ["Chest pain or pressure", "heart", "now", ["ecg", "bp", "hr", "spo2"], ""],
      ["Shortness of breath", "lungs", "tests", ["spo2", "rr", "hr"], "Stop activity and rest in a comfortable position."],
      ["Cough", "lungs", "tests", ["temp", "spo2"], "Drink fluids and rest your voice."],
      ["Sore throat", "lungs", "self", [], "Drink warm fluids and rest your voice."],
      ["Severe trouble breathing", "lungs", "now", ["spo2", "rr", "hr"], ""],
      ["Thirst or dry mouth", "fluids", "self", [], "Follow your mission fluid plan and report persistent or unusual thirst to the flight surgeon."],
      ["Very dark urine", "fluids", "tests", ["urine"], "Follow your mission fluid plan and contact the medical team about the change; urine colour alone does not establish dehydration."],
      ["Pain in the side or back", "fluids", "tests", ["urine", "temp"], "Note where the pain is and contact the medical team. Follow the mission fluid plan."],
      ["Nausea", "fluids", "tests", ["temp", "glucose"], "Sip water and eat small plain meals."],
      ["Vomiting or diarrhoea", "fluids", "tests", ["urine", "temp", "hr"], "Sip fluids often to replace what you lose."],
      ["Fever or chills", "blood", "tests", ["temp", "hr"], "Rest and drink fluids."],
      ["Skin rash", "blood", "self", [], "Keep the area clean and dry and avoid scratching."],
      ["Wound that is not healing", "blood", "tests", ["temp"], "Keep the wound clean and covered."],
      ["Swollen glands", "blood", "tests", ["temp", "hgb"], "Rest and drink fluids."],
      ["Heavy bleeding", "blood", "now", ["bp", "hr", "hgb"], ""],
      ["Back pain", "muscle", "self", [], "Follow mission guidance for pain and activity. Avoid movements that worsen pain and report persistent or worsening symptoms."],
      ["Muscle cramps", "muscle", "self", [], "Pause activity and follow the mission exercise and fluid plans. Report persistent or worsening cramps."],
      ["Joint pain", "muscle", "self", [], "Pause movements that worsen pain and ask the medical team about activity limits."],
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

  // BEGIN WORKBOOK RESEARCH (generated by scripts/import_research.py)
  const research = {
  "systems": [
    {
      "id": "brain",
      "name": "Brain and behaviour",
      "mark": "BRAIN / MOOD",
      "routine": [
        "sleep",
        "mind"
      ],
      "hazards": [
        "isolation",
        "distance",
        "environment"
      ],
      "explain": "Isolation, heavy workloads and disrupted sleep schedules can affect mood, alertness and decisions. Communication delays can limit timely support from Earth.",
      "risks": "Stress; low mood; fatigue; sleep disruption; reduced alertness. A check-in cannot diagnose a psychiatric condition.",
      "source": "NASA, Risk of Behavioral Changes and Psychiatric Disorders. https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/ NASA, Risk from Inadequate Sleep and Irregular Schedules. https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/ Team: Hasan / Anas. Supplement: NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/; NASA BMed Evidence Report (2016); NASA Technical Reports Server 20140003280, Fatigue-Related Countermeasures for Long-Duration Exploration Missions, https://ntrs.nasa.gov/citations/20140003280; NASA, Houston, Do You Copy? HERA Crew Navigates Communication Delays (2022), https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/",
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
        "https://ntrs.nasa.gov/citations/20140003280",
        "https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 4
    },
    {
      "id": "eyes",
      "name": "Eyes",
      "mark": "EYES",
      "routine": [],
      "hazards": [
        "gravity"
      ],
      "explain": "In microgravity, fluid moves toward the head and may contribute to changes in the eyes and vision. The mechanisms of spaceflight-associated neuro-ocular syndrome are still being studied.",
      "risks": "SANS-related eye changes; optic-disc swelling; altered refraction or blurred vision. Symptoms alone do not establish SANS. NASA says over half of crew report one or more SANS symptoms and about 70% show hallmark signs; these are population figures, not personal alert thresholds.",
      "source": "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS). https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/ Team: Hasan / Brain Fluid Pressure & SANS handoff. Supplement: NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS), https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ (11 Mar 2025); NASA, NASA Fluid Shifts Study Advances Journey to Mars (2015), https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/",
        "https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 5
    },
    {
      "id": "brain-and-spinal-fluid",
      "name": "Brain and spinal fluid",
      "mark": "BRAIN AND SPINAL FLUID",
      "routine": [],
      "hazards": [
        "gravity",
        "radiation"
      ],
      "explain": "In weightlessness, blood and cerebrospinal fluid (the fluid around the brain and spine) move toward the head. NASA is studying whether this raises pressure inside the skull and how it relates to changes in the eyes and brain. The mechanism is not settled.",
      "risks": "Possible raised pressure around the brain (the role of intracranial pressure is still being studied); SANS signs: optic nerve swelling, folds at the back of the eye, flattening of the eyeball, far-sighted shift; vision changes; headache. NASA says a link between SANS and brain structure or thinking has not been established. About 70% of ISS crew show one or more hallmark signs (a population figure, not a personal risk or an alert threshold). Direct pressure measurement and spinal fluid sampling are research-only and are never offered through this app.",
      "source": "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS) reference. https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/ NASA Human Research Roadmap, SANS risk. https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105 NASA, Spinal Fluid Biomarkers. https://www.nasa.gov/reference/spinal-fluid-biomarkers/ NASA, NASA Fluid Shifts Study Advances Journey to Mars (2015). https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/ Team doc, SANS and brain fluid pressure section (cites the ISS Research Explorer brain fluid pressure investigation).",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
        "https://www.nasa.gov/reference/spinal-fluid-biomarkers/",
        "https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 6
    },
    {
      "id": "lungs",
      "name": "Lungs",
      "mark": "LUNGS",
      "routine": [],
      "hazards": [
        "environment"
      ],
      "explain": "Breathing depends on adequate oxygen and cabin pressure. Depressurization or life-support failure can cause hypoxia and impair health and performance.",
      "risks": "Hypoxia; impaired cognition or vision during low-oxygen exposure. Cabin oxygen/pressure and blood SpO2 are distinct measurements.",
      "source": "NASA, Risk of Reduced Crew Health and Performance Due to Hypoxia. https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/ Team: Anas, HYP-01. Supplement: NASA, Spacecraft Air Quality (2023), https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
        "https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 7
    },
    {
      "id": "heart",
      "name": "Heart and circulation",
      "mark": "HEART",
      "routine": [],
      "hazards": [
        "gravity",
        "radiation"
      ],
      "explain": "Weightlessness changes how the heart and blood vessels work. On return to gravity, blood pressure may fall when standing, causing dizziness or fainting.",
      "risks": "Cardiovascular deconditioning; orthostatic intolerance; blood clots or rhythm changes; possible longer-term cardiovascular effects.",
      "source": "NASA, Risk of Cardiovascular Adaptations. https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ CSA, The Vascular series. https://www.asc-csa.gc.ca/eng/sciences/vascular.asp Team: Hasan / CSA handoff. Supplement: Canadian Space Agency, Improving health care (lightheadedness and fainting triage, as cited in the team doc); NASA, New Tests Evaluate Mission Readiness of Astronauts Upon Landing (2022), https://www.nasa.gov/humans-in-space/new-tests-evaluate-mission-readiness-of-astronauts-upon-landing/ (dizzy, lightheaded, nauseated and off-balance after landing); NASA, Hazard: Space Radiation, https://www.nasa.gov/hrp/hazard-space-radiation/ (cited in the team doc: solar particle events can cause radiation sickness that needs immediate action, follow the mission's shelter instructions)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
        "https://www.asc-csa.gc.ca/eng/sciences/vascular.asp",
        "https://www.nasa.gov/humans-in-space/new-tests-evaluate-mission-readiness-of-astronauts-upon-landing/",
        "https://www.nasa.gov/hrp/hazard-space-radiation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 8
    },
    {
      "id": "blood",
      "name": "Blood and lymph (immune)",
      "mark": "BLOOD / IMMUNE",
      "routine": [],
      "hazards": [
        "radiation",
        "gravity",
        "isolation",
        "environment"
      ],
      "explain": "Radiation, microgravity, stress and poor sleep can change immune responses. A closed habitat also affects exposure to microbes.",
      "risks": "Altered immune response; reactivation of dormant viruses; atypical allergies or infections. Blood counts alone do not measure overall immunity.",
      "source": "NASA, Risk of Altered Immune System Responses. https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/ NASA, The Human Body in Space, Hostile/Closed Environments. https://www.nasa.gov/humans-in-space/the-human-body-in-space/ Team: Hasan / Anas, IMM-01. Supplement: NASA, Immune Biomarkers, https://www.nasa.gov/reference/immune-biomarkers/ (both cited in the team doc: rash, infection symptoms, virus reactivation); NASA, Hazard: Space Radiation, https://www.nasa.gov/hrp/hazard-space-radiation/ (cited in the team doc: solar particle events can cause radiation sickness that needs immediate action, follow the mission's shelter instructions)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
        "https://www.nasa.gov/humans-in-space/the-human-body-in-space/",
        "https://www.nasa.gov/reference/immune-biomarkers/",
        "https://www.nasa.gov/hrp/hazard-space-radiation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 9
    },
    {
      "id": "fluids",
      "name": "Body fluids and kidneys",
      "mark": "FLUIDS / KIDNEYS",
      "routine": [
        "water",
        "nutrition"
      ],
      "hazards": [
        "gravity"
      ],
      "explain": "Fluid redistribution and changes in urine chemistry and calcium excretion may contribute to kidney-stone risk. Hydration and urine records provide context for medical review.",
      "risks": "Relative dehydration; urinary changes; kidney-stone formation. No universal drinking target or diagnosis is inferred here. NASA's water brief lists less urine, poorer performance and trouble concentrating as signs of dehydration.",
      "source": "NASA, Evidence Report: Risk of Renal Stone Formation (2024). https://ntrs.nasa.gov/citations/20240012429 Supplement to team fluid-shift / bone notes; verified primary source. Supplement: NASA OCHMO, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf (dehydration signs: less urine, poorer performance, trouble concentrating; read from a search summary only, verify); NASA Technical Reports Server 20230015722, Human Research Program renal stone risk (hydration state and urine chemistry change in flight; read from a search summary only, verify), https://ntrs.nasa.gov/citations/20230015722",
      "sourceUrls": [
        "https://ntrs.nasa.gov/citations/20240012429",
        "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf",
        "https://ntrs.nasa.gov/citations/20230015722"
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "1 Body systems",
      "sourceRow": 10
    },
    {
      "id": "muscle",
      "name": "Muscle and bone",
      "mark": "MUSCLE / BONE",
      "routine": [
        "activity"
      ],
      "hazards": [
        "gravity"
      ],
      "explain": "Reduced weight-bearing in microgravity can reduce muscle strength, aerobic fitness and bone mineral density. Countermeasures use individually prescribed exercise and nutrition.",
      "risks": "Muscle deconditioning; reduced exercise capacity; bone loss; fracture risk. Exercise supports mitigation but does not guarantee prevention.",
      "source": "NASA, Astronaut Exercise. https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ NASA, Risk of Bone Fracture Due to Spaceflight-Induced Changes to Bone. https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/ Team: Anas, FIT-01 / BONE-01. Supplement: NASA, Risk of Reduced Physical Performance Capabilities Due to Reduced Muscle Size, Strength, and Endurance, https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/; NASA, Astronauts' Spines Under Scrutiny (2021), https://www.nasa.gov/missions/station/astronauts-spines-under-scrutiny/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/",
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/",
        "https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/",
        "https://www.nasa.gov/missions/station/astronauts-spines-under-scrutiny/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 11
    },
    {
      "id": "metabolic",
      "name": "Metabolic and endocrine",
      "mark": "METABOLIC",
      "routine": [],
      "hazards": [
        "gravity"
      ],
      "explain": "Spaceflight studies investigate changes in glucose regulation and insulin sensitivity alongside reduced physical activity. These findings support tracking clinician-requested metabolic tests.",
      "risks": "Insulin resistance and altered glucose regulation have been reported in studied crews. This is not evidence that every astronaut develops diabetes.",
      "source": "CSA, The Vascular series: Studying heart health in space, Results. https://www.asc-csa.gc.ca/eng/sciences/vascular.asp Team: CSA Improving Health Care handoff. Verified companion source clarifies its Type 2 diabetes context.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/vascular.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 12
    },
    {
      "id": "balance",
      "name": "Balance and vestibular",
      "mark": "BALANCE",
      "routine": [],
      "hazards": [
        "gravity"
      ],
      "explain": "Moving between gravity environments affects orientation, coordination, balance and walking. Some crew members experience motion sickness during adaptation.",
      "risks": "Disorientation; space motion sickness; impaired balance or coordination after landing. Training and assessment are mission-specific.",
      "source": "NASA, The Human Body in Space, Gravity Fields. https://www.nasa.gov/humans-in-space/the-human-body-in-space/ Team: CSA Improving Health Care handoff; verified NASA source supplies the gravity-transition explanation.",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/the-human-body-in-space/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "1 Body systems",
      "sourceRow": 13
    }
  ],
  "tests": [
    {
      "id": "hr",
      "name": "Heart rate",
      "system": "heart",
      "unit": "bpm",
      "referenceLow": 60,
      "referenceHigh": 100,
      "rangeAppliesTo": "Not specified; interpret with mission clinician and baseline. Public adult resting reference 60-100 bpm (American Heart Association); not a NASA limit.",
      "why": "Monitor cardiovascular response and changes during activity or stress.",
      "steps": [
        "Connect a qualified Bio-Monitor or heart-rate device",
        "log measured rate, timestamp, and device."
      ],
      "availableIn": [
        "ISS Bio-Monitor research",
        "Base/Rover not verified"
      ],
      "frequency": "Mission-defined",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp Public range: American Heart Association, resting heart rate for adults.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 4
    },
    {
      "id": "blood-pressure-systolic",
      "name": "Blood pressure — systolic",
      "system": "heart",
      "unit": "mmHg",
      "referenceLow": 90,
      "referenceHigh": 119,
      "rangeAppliesTo": "Not specified; posture and mission phase matter. Public adult reference: normal below 120 systolic, low is commonly below 90 (American Heart Association, NHLBI); not a NASA limit.",
      "why": "Track blood pressure, especially during gravity transitions and dizziness.",
      "steps": [
        "Use validated cuff under prescribed conditions",
        "record systolic reading and posture."
      ],
      "availableIn": [
        "Qualified equipment if available",
        "location unverified"
      ],
      "frequency": "Mission-defined / clinician-directed",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp Public range: American Heart Association (normal category); NHLBI (low blood pressure).",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 5
    },
    {
      "id": "blood-pressure-diastolic",
      "name": "Blood pressure — diastolic",
      "system": "heart",
      "unit": "mmHg",
      "referenceLow": 60,
      "referenceHigh": 79,
      "rangeAppliesTo": "Not specified; posture and mission phase matter. Public adult reference: normal below 80 diastolic, low is commonly below 60 (American Heart Association, NHLBI); not a NASA limit.",
      "why": "Track blood pressure together with systolic value.",
      "steps": [
        "Record diastolic value from the same approved cuff measurement, with timestamp and posture."
      ],
      "availableIn": [
        "Qualified equipment if available",
        "location unverified"
      ],
      "frequency": "Mission-defined / clinician-directed",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp Public range: American Heart Association (normal category); NHLBI (low blood pressure).",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 6
    },
    {
      "id": "rr",
      "name": "Respiratory rate",
      "system": "lungs",
      "unit": "breaths/min",
      "referenceLow": 12,
      "referenceHigh": 20,
      "rangeAppliesTo": "Not specified; activity and measurement context matter. Public adult resting reference 12-20 breaths per minute (Johns Hopkins Medicine); not a NASA limit.",
      "why": "Monitor breathing responses during spaceflight activity and stress.",
      "steps": [
        "Use qualified respiratory monitoring",
        "record breathing rate, activity, and timestamp."
      ],
      "availableIn": [
        "ISS Bio-Monitor research",
        "Base/Rover not verified"
      ],
      "frequency": "Mission-defined",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp Public range: Johns Hopkins Medicine (vital signs, adults).",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 7
    },
    {
      "id": "blood-oxygen-saturation-spo2",
      "name": "Blood oxygen saturation (SpO2)",
      "system": "lungs",
      "unit": "%",
      "referenceLow": 95,
      "referenceHigh": 100,
      "rangeAppliesTo": "Not specified; device/medical interpretation required. Public reference for healthy adults at sea-level air (Mayo Clinic); cabin pressure can change this; not a NASA limit.",
      "why": "Record an astronaut vital sign; does not substitute for cabin oxygen monitoring.",
      "steps": [
        "Use a qualified oxygen-saturation sensor",
        "document reading, device and quality."
      ],
      "availableIn": [
        "Bio-Monitor research",
        "current hardware location unverified"
      ],
      "frequency": "Mission-defined",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp Public range: Mayo Clinic (pulse oximetry, healthy adults).",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 8
    },
    {
      "id": "skin-temperature",
      "name": "Skin temperature",
      "system": "blood",
      "unit": "°C",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Not specified; skin temperature is not core body temperature",
      "why": "Record physiological change during rest, activity, or sleep.",
      "steps": [
        "Use approved skin-temperature sensor",
        "record location, timestamp, and activity context."
      ],
      "availableIn": [
        "ISS Bio-Monitor research",
        "Base/Rover not verified"
      ],
      "frequency": "Mission-defined",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 9
    },
    {
      "id": "heart-electrical-activity-ecg",
      "name": "Heart electrical activity (ECG)",
      "system": "heart",
      "unit": "waveform / report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Not specified; specialist interpretation",
      "why": "Observe electrical activity of the heart when equipped for monitoring.",
      "steps": [
        "Collect validated heart electrical trace",
        "store a report for trained interpretation."
      ],
      "availableIn": [
        "Bio-Monitor research",
        "device-specific capability must be verified"
      ],
      "frequency": "Mission-defined / clinician-directed",
      "inputType": "File / structured report",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bio-monitor.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 10
    },
    {
      "id": "physical-activity-exercise-duration",
      "name": "Physical activity / exercise duration",
      "system": "muscle",
      "unit": "minutes",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No universal target; individualized approved plan",
      "why": "Track adherence to mission-approved exercise and activity plans.",
      "steps": [
        "Record exercise type, duration and perceived effort after approved session."
      ],
      "availableIn": [
        "Station exercise infrastructure",
        "Base/Rover not verified"
      ],
      "frequency": "Per approved exercise plan",
      "inputType": "Number",
      "source": "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 11
    },
    {
      "id": "bone-mineral-density-dxa",
      "name": "Bone mineral density (DXA)",
      "system": "muscle",
      "unit": "g/cm² (site-specific)",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No astronaut universal range; compare scans and site",
      "why": "Record verified bone density assessment before/after exposure to microgravity.",
      "steps": [
        "Import radiology DXA report from qualified clinical assessment",
        "include anatomical site."
      ],
      "availableIn": [
        "Specialist pre/postflight facility",
        "Base/Rover unverified"
      ],
      "frequency": "Clinician-directed",
      "inputType": "Number / clinical report",
      "source": "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 12
    },
    {
      "id": "bone-quantitative-ct-qct",
      "name": "Bone quantitative CT (QCT)",
      "system": "muscle",
      "unit": "Depends on report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Not stated; scan-specific units and reference",
      "why": "Assess bone structure using validated specialist imaging.",
      "steps": [
        "Import verified QCT report and units",
        "do not estimate from activity logs."
      ],
      "availableIn": [
        "Specialist clinical setting",
        "Base/Rover unverified"
      ],
      "frequency": "Clinician-directed",
      "inputType": "File / structured report",
      "source": "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 13
    },
    {
      "id": "acuity",
      "name": "Visual acuity",
      "system": "eyes",
      "unit": "Snellen / logMAR",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Compare with personal baseline; universal cutoffs not provided",
      "why": "Track changes in vision potentially associated with spaceflight.",
      "steps": [
        "Perform mission-approved visual acuity chart assessment and save score, eye, and conditions."
      ],
      "availableIn": [
        "ISS research",
        "Base/Rover unverified"
      ],
      "frequency": "Flight medical schedule",
      "inputType": "Text / number",
      "source": "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
      "sourceUrls": [
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 14
    },
    {
      "id": "optical-coherence-tomography-oct",
      "name": "Optical coherence tomography (OCT)",
      "system": "eyes",
      "unit": "µm / report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Retinal region and device dependent; no universal limit in sources",
      "why": "Assess optic nerve head and retinal structural changes related to SANS.",
      "steps": [
        "Trained operator performs OCT",
        "save eye/region and reviewed scan report."
      ],
      "availableIn": [
        "ISS imaging research",
        "Base/Rover unverified"
      ],
      "frequency": "Mission-defined / clinician-directed",
      "inputType": "File / structured report",
      "source": "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
      "sourceUrls": [
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 15
    },
    {
      "id": "ocular-ultrasound",
      "name": "Ocular ultrasound",
      "system": "eyes",
      "unit": "mm / imaging report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Technique-specific; no universal cutoff in sources",
      "why": "Evaluate ocular structures and potential signs of SANS.",
      "steps": [
        "Qualified operator obtains ocular ultrasound",
        "store annotated images and report."
      ],
      "availableIn": [
        "ISS research",
        "Base/Rover unverified"
      ],
      "frequency": "Mission-defined / clinician-directed",
      "inputType": "File / structured report",
      "source": "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
      "sourceUrls": [
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 16
    },
    {
      "id": "intraocular-pressure-tonometry",
      "name": "Intraocular pressure (tonometry)",
      "system": "eyes",
      "unit": "mmHg",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No flight-specific range supplied",
      "why": "Measure pressure inside the eye in specialist SANS assessment.",
      "steps": [
        "Qualified examiner uses approved tonometry",
        "record which eye and reading."
      ],
      "availableIn": [
        "Specialist / research equipment",
        "location unverified"
      ],
      "frequency": "Research / clinician-directed",
      "inputType": "Number",
      "source": "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 17
    },
    {
      "id": "mri-of-brain-and-eyes",
      "name": "MRI of brain and eyes",
      "system": "brain-and-spinal-fluid",
      "unit": "imaging report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No numeric range; clinician interprets imaging",
      "why": "Assess structural changes before and after spaceflight.",
      "steps": [
        "Specialist MRI scan",
        "securely import clinical report and scan date."
      ],
      "availableIn": [
        "Pre/postflight specialist facility",
        "Base/Rover not verified"
      ],
      "frequency": "Pre/postflight as prescribed",
      "inputType": "File / structured report",
      "source": "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
      "sourceUrls": [
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 18
    },
    {
      "id": "immune-biomarker-samples",
      "name": "Immune biomarker samples",
      "system": "blood",
      "unit": "assay-specific",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Assay-specific; no reference ranges provided",
      "why": "Investigate immune, viral and stress-related biological markers in research.",
      "steps": [
        "Collect blood or saliva under approved protocol",
        "record laboratory assay, unit and result."
      ],
      "availableIn": [
        "Research laboratories / approved mission sampling"
      ],
      "frequency": "Research / clinician-directed",
      "inputType": "File / structured report",
      "source": "https://www.nasa.gov/reference/immune-biomarkers/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/immune-biomarkers/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 19
    },
    {
      "id": "biological-sample-analysis-bio-analyzer",
      "name": "Biological sample analysis (Bio-Analyzer)",
      "system": "metabolic",
      "unit": "assay-specific",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Assay-specific; exact available assay menu unverified",
      "why": "Record results from authorized analysis of blood, urine, or saliva.",
      "steps": [
        "Qualified operator follows assay protocol",
        "record specimen, method, units and results."
      ],
      "availableIn": [
        "CSA research technology",
        "onboard location/assay menu unverified"
      ],
      "frequency": "Clinician-directed",
      "inputType": "File / structured report",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/bio-analyzer.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bio-analyzer.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 20
    },
    {
      "id": "neutron-radiation-exposure-dosimeter",
      "name": "Neutron radiation exposure (dosimeter)",
      "system": "blood",
      "unit": "µSv or µSv/h",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No universal alert threshold; distinguish dose from dose rate",
      "why": "Monitor neutron radiation exposure from calibrated instruments.",
      "steps": [
        "Record instrument reading, unit, timestamp, position, and validity flag."
      ],
      "availableIn": [
        "Radi-N2 historical ISS studies",
        "CANS development",
        "current interface not verified"
      ],
      "frequency": "Per approved monitoring protocol",
      "inputType": "Number",
      "source": "https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 21
    },
    {
      "id": "cabin-oxygen-partial-pressure",
      "name": "Cabin oxygen partial pressure",
      "system": "lungs",
      "unit": "kPa",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Mission-specific approved limits only",
      "why": "Monitor environmental oxygen conditions separately from personal SpO2.",
      "steps": [
        "Import verified engineering sensor data with freshness and quality flags."
      ],
      "availableIn": [
        "Certified environmental telemetry only",
        "no live data assumed"
      ],
      "frequency": "Per mission safety protocol",
      "inputType": "Number",
      "source": "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 22
    },
    {
      "id": "body-temperature",
      "name": "Body temperature",
      "system": "blood",
      "unit": "°C",
      "referenceLow": 36.1,
      "referenceHigh": 37.2,
      "rangeAppliesTo": "Adults",
      "why": "A raised temperature can signal infection, which matters when the immune system is under stress.",
      "steps": [
        "Wait 15 minutes after exercise, eating or drinking",
        "use the same site each time",
        "hold the thermometer until it signals",
        "repeat once if unexpected"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Daily",
      "inputType": "Number",
      "source": "MedlinePlus, U.S. National Library of Medicine (adults)",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "2 Tests",
      "sourceRow": 23
    },
    {
      "id": "glucose",
      "name": "Blood glucose",
      "system": "metabolic",
      "unit": "mg/dL",
      "referenceLow": 70,
      "referenceHigh": 99,
      "rangeAppliesTo": "Adults, fasting 8 hours",
      "why": "Shows how the body is regulating energy. Nutrition can be inadequate on long missions.",
      "steps": [
        "Measure after fasting 8 hours, for example on waking",
        "wash and dry hands",
        "prick the side of a fingertip and touch the drop to the strip",
        "read the value when the meter signals"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Monthly",
      "inputType": "Number",
      "source": "American Diabetes Association (fasting glucose, adults)",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "2 Tests",
      "sourceRow": 24
    },
    {
      "id": "hgb",
      "name": "Haemoglobin",
      "system": "blood",
      "unit": "g/dL",
      "referenceLow": 12,
      "referenceHigh": 17.5,
      "rangeAppliesTo": "Adults, both sexes combined (PLACEHOLDER)",
      "why": "Red blood cells change in spaceflight; a drop can cause tiredness and breathlessness.",
      "steps": [
        "Wash and dry hands",
        "collect a fingertip sample into the analyser cartridge",
        "insert the cartridge and wait",
        "enter the value shown"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Monthly",
      "inputType": "Number",
      "source": "PLACEHOLDER range - replace with the research team's source",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "2 Tests",
      "sourceRow": 25
    },
    {
      "id": "urine",
      "name": "Urine concentration",
      "system": "fluids",
      "unit": "SG",
      "referenceLow": 1.005,
      "referenceHigh": 1.03,
      "rangeAppliesTo": "Specific gravity (PLACEHOLDER)",
      "why": "Concentrated urine suggests you need more fluid, which also lowers kidney stone risk.",
      "steps": [
        "Collect a sample with the collection device",
        "wet the strip and wait the time printed on the pack",
        "compare the specific gravity pad with the colour chart",
        "enter the value"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Weekly",
      "inputType": "Number",
      "source": "PLACEHOLDER range - replace with the research team's source",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "2 Tests",
      "sourceRow": 26
    },
    {
      "id": "mass",
      "name": "Body mass",
      "system": "muscle",
      "unit": "kg",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No general reference; tracked against your own earlier results",
      "why": "Losing mass can mean muscle loss or not eating enough.",
      "steps": [
        "Measure at the same time of day each week",
        "follow the device procedure and stay still",
        "enter the value shown"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Weekly",
      "inputType": "Number",
      "source": "Personal trend only",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "2 Tests",
      "sourceRow": 27
    },
    {
      "id": "grip",
      "name": "Grip strength",
      "system": "muscle",
      "unit": "kg",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No general reference; tracked against your own earlier results",
      "why": "A simple check of muscle strength, which falls without loading (NASA muscle risk page).",
      "steps": [
        "Hold the dynamometer with the elbow at 90 degrees",
        "squeeze as hard as you can for 3 seconds",
        "repeat three times and enter the best value"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Monthly",
      "inputType": "Number",
      "source": "Personal trend only; background: NASA, Risk of Reduced Physical Performance Capabilities Due to Reduced Muscle Size, Strength, and Endurance, https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 28
    },
    {
      "id": "cumulative-radiation-dose-personal-dosimeter",
      "name": "Cumulative radiation dose (personal dosimeter)",
      "system": "blood",
      "unit": "mSv",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No general reference; mission dose limits are set by the space agency",
      "why": "Tracks your exposure to space radiation over the mission.",
      "steps": [
        "Read the cumulative dose on your personal dosimeter",
        "enter the value shown"
      ],
      "availableIn": [
        "Not verified on any vehicle",
        "the user unticks what is not on board"
      ],
      "frequency": "Weekly",
      "inputType": "Number",
      "source": "Mission limits not loaded; background: NASA, Hazard: Space Radiation, https://www.nasa.gov/hrp/hazard-space-radiation/ (cited in the team doc: solar particle events can cause radiation sickness that needs immediate action, follow the mission's shelter instructions)",
      "sourceUrls": [
        "https://www.nasa.gov/hrp/hazard-space-radiation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 29
    },
    {
      "id": "cognition-test-battery",
      "name": "Cognition test battery",
      "system": "brain",
      "unit": "score / report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Compare with personal baseline; no universal cutoff in the sources",
      "why": "Tracks attention and thinking, which fatigue, poor sleep or low oxygen can change.",
      "steps": [
        "Complete the approved computer test set when scheduled",
        "save the results report."
      ],
      "availableIn": [
        "Not verified on any vehicle"
      ],
      "frequency": "Mission-defined",
      "inputType": "File / structured report",
      "source": "NASA, Spaceflight Standard Measures (cognition: 10 computer tests). https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 30
    },
    {
      "id": "wrist-activity-and-sleep-monitor-actigraphy",
      "name": "Wrist activity and sleep monitor (actigraphy)",
      "system": "brain",
      "unit": "report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Compare with personal baseline; no universal cutoff in the sources",
      "why": "Records activity, light and sleep patterns to follow fatigue and sleep problems.",
      "steps": [
        "Wear the approved wrist monitor as instructed and save the report."
      ],
      "availableIn": [
        "Not verified on any vehicle"
      ],
      "frequency": "Continuous / mission-defined",
      "inputType": "File / structured report",
      "source": "NASA, Spaceflight Standard Measures (actigraphy: wrist monitor for activity and light). https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 31
    },
    {
      "id": "balance-and-movement-assessment-sensorimotor",
      "name": "Balance and movement assessment (sensorimotor)",
      "system": "balance",
      "unit": "score / report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Compare with preflight baseline; no universal cutoff in the sources",
      "why": "Checks balance, coordination and walking after moving between gravity environments.",
      "steps": [
        "Complete the approved movement and balance tasks when scheduled",
        "record heart rate and blood pressure if asked."
      ],
      "availableIn": [
        "Not verified on any vehicle"
      ],
      "frequency": "Pre/postflight as prescribed",
      "inputType": "File / structured report",
      "source": "NASA, Spaceflight Standard Measures (sensorimotor: movement, balance, heart rate and blood pressure before and after missions). https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space NASA, New Tests Evaluate Mission Readiness of Astronauts Upon Landing. https://www.nasa.gov/humans-in-space/new-tests-evaluate-mission-readiness-of-astronauts-upon-landing/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space",
        "https://www.nasa.gov/humans-in-space/new-tests-evaluate-mission-readiness-of-astronauts-upon-landing/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 32
    },
    {
      "id": "cerebral-and-cochlear-fluid-pressure-ccfp-with-otoacoustic-emissions",
      "name": "Cerebral and cochlear fluid pressure (CCFP) with otoacoustic emissions",
      "system": "brain-and-spinal-fluid",
      "unit": "device-specific",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Research device; no clinical range in the sources",
      "why": "A noninvasive estimate of pressure around the brain, using sound and pressure waves reflected off the inner ear. Studied because fluid shifts toward the head in weightlessness.",
      "steps": [
        "A trained operator uses the research device, with otoacoustic emissions as the companion test",
        "store the device report with its date."
      ],
      "availableIn": [
        "Research only",
        "not verified on any vehicle"
      ],
      "frequency": "Research / clinician-directed",
      "inputType": "File / structured report",
      "source": "NASA, NASA Fluid Shifts Study Advances Journey to Mars (2015). https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 33
    },
    {
      "id": "jugular-venous-pressure-ultrasound",
      "name": "Jugular venous pressure (ultrasound)",
      "system": "brain-and-spinal-fluid",
      "unit": "report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "No universal cutoff in the sources",
      "why": "Looks at pressure in the neck veins, which the team doc lists as a possible contributor to head fluid shifts and SANS.",
      "steps": [
        "A qualified operator performs the ultrasound",
        "store the images and report."
      ],
      "availableIn": [
        "Research only",
        "not verified on any vehicle"
      ],
      "frequency": "Research / clinician-directed",
      "inputType": "File / structured report",
      "source": "Team doc, SANS and brain fluid pressure section. NASA, SANS reference. https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 34
    },
    {
      "id": "direct-intracranial-pressure-and-spinal-fluid-biomarkers-research-only",
      "name": "Direct intracranial pressure and spinal fluid biomarkers (research only)",
      "system": "brain-and-spinal-fluid",
      "unit": "report",
      "referenceLow": null,
      "referenceHigh": null,
      "rangeAppliesTo": "Research studies only; no limits in the sources",
      "why": "Research on pressure inside the skull and on biomarkers in spinal fluid (cerebrospinal fluid, CSF) to understand SANS. The team doc says to never recommend a spinal tap through routine app flows, so this is listed for completeness and is not offered in the app.",
      "steps": [
        "Not for self-use. Only researchers and clinicians under an approved protocol."
      ],
      "availableIn": [
        "Research only. Not offered in the app"
      ],
      "frequency": "Research only",
      "inputType": "File / structured report",
      "source": "NASA, Spinal Fluid Biomarkers (Markers of Vascular Risks Associated with SANS). https://www.nasa.gov/reference/spinal-fluid-biomarkers/ NASA Human Research Roadmap, SANS risk (Direct ICP, CSF Biomarkers tasks). https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105",
      "sourceUrls": [
        "https://www.nasa.gov/reference/spinal-fluid-biomarkers/",
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "2 Tests",
      "sourceRow": 35
    }
  ],
  "symptoms": [
    {
      "id": "trouble-falling-asleep",
      "name": "Trouble falling asleep",
      "system": "brain",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If persistent or interfering with safe duties, discuss with flight surgeon",
      "hazards": [
        "isolation",
        "environment"
      ],
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 4
    },
    {
      "id": "waking-often-during-sleep",
      "name": "Waking often during sleep",
      "system": "brain",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If repeated or associated with severe fatigue or impaired duties, contact medical team",
      "hazards": [
        "isolation",
        "environment"
      ],
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 5
    },
    {
      "id": "feeling-unusually-tired",
      "name": "Feeling unusually tired",
      "system": "brain",
      "urgency": "tests",
      "tests": [
        "body-temperature",
        "hr",
        "glucose",
        "hgb"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If sudden, severe, or impairing safety-critical performance, contact flight surgeon",
      "hazards": [
        "environment",
        "isolation"
      ],
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 6
    },
    {
      "id": "difficulty-concentrating",
      "name": "Difficulty concentrating",
      "system": "brain",
      "urgency": "tests",
      "tests": [
        "cognition-test-battery",
        "wrist-activity-and-sleep-monitor-actigraphy"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If sudden confusion, substantial impairment, or unsafe performance, contact flight surgeon now",
      "hazards": [
        "environment",
        "isolation"
      ],
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 7
    },
    {
      "id": "feeling-stressed-or-overwhelmed",
      "name": "Feeling stressed or overwhelmed",
      "system": "brain",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If persistent or disrupting functioning, seek a confidential crew/medical review; acute safety concerns require prompt support",
      "hazards": [
        "isolation"
      ],
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 8
    },
    {
      "id": "feeling-lonely-or-disconnected",
      "name": "Feeling lonely or disconnected",
      "system": "brain",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If persistent with worsening well-being or loss of functioning, request private medical/psychological support",
      "hazards": [
        "isolation",
        "distance"
      ],
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 9
    },
    {
      "id": "low-mood",
      "name": "Low mood",
      "system": "brain",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If persistent, worsening, or disrupting daily tasks, contact medical support; immediate help if there is a safety crisis",
      "hazards": [
        "isolation"
      ],
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 10
    },
    {
      "id": "loss-of-appetite",
      "name": "Loss of appetite",
      "system": "fluids",
      "urgency": "tests",
      "tests": [
        "mass",
        "glucose"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If unable to maintain food or fluid intake, or accompanied by significant symptoms, contact flight surgeon",
      "hazards": [
        "isolation",
        "environment"
      ],
      "source": "NASA — Risk of Inadequate Food and Nutrition | https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 11
    },
    {
      "id": "headache",
      "name": "Headache",
      "system": "brain-and-spinal-fluid",
      "urgency": "tests",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "body-temperature",
        "blood-oxygen-saturation-spo2"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If sudden/severe, accompanied by confusion, breathing problems, vision change, or cabin alarm: contact flight surgeon now",
      "hazards": [
        "environment"
      ],
      "source": "NASA — Risk of Reduced Crew Health and Performance Due to Hypoxia | https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 12
    },
    {
      "id": "feeling-dizzy-when-standing",
      "name": "Feeling dizzy when standing",
      "system": "heart",
      "urgency": "tests",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr",
        "glucose"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If fainting, injury, or persistent severe dizziness, contact flight surgeon now",
      "hazards": [
        "gravity"
      ],
      "source": "CSA — BP Reg | https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 13
    },
    {
      "id": "fainting-or-loss-of-consciousness",
      "name": "Fainting or loss of consciousness",
      "system": "heart",
      "urgency": "now",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr",
        "glucose",
        "heart-electrical-activity-ecg"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Immediately: any loss of consciousness",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "NASA — Risk of Cardiovascular Adaptations | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 14
    },
    {
      "id": "breathing-difficulty",
      "name": "Breathing difficulty",
      "system": "lungs",
      "urgency": "now",
      "tests": [
        "blood-oxygen-saturation-spo2",
        "rr",
        "hr"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Immediately: breathing difficulty, especially with environmental alert",
      "hazards": [
        "environment"
      ],
      "source": "NASA — Hypoxia Risk | https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 15
    },
    {
      "id": "sudden-confusion",
      "name": "Sudden confusion",
      "system": "brain",
      "urgency": "now",
      "tests": [
        "glucose",
        "blood-oxygen-saturation-spo2",
        "body-temperature"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Immediately: sudden confusion or loss of orientation",
      "hazards": [
        "environment"
      ],
      "source": "NASA — Hypoxia Risk | https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 16
    },
    {
      "id": "new-vision-changes",
      "name": "New vision changes",
      "system": "eyes",
      "urgency": "tests",
      "tests": [
        "acuity",
        "ocular-ultrasound",
        "optical-coherence-tomography-oct"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If sudden, severe, or associated with headache/confusion, contact flight surgeon now",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "NASA — Risk of Spaceflight Associated Neuro-ocular Syndrome | https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 17
    },
    {
      "id": "skin-rash-or-signs-of-infection",
      "name": "Skin rash or signs of infection",
      "system": "blood",
      "urgency": "tests",
      "tests": [
        "body-temperature"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If rapidly spreading, feverish/systemically unwell, or breathing difficulty, contact flight surgeon promptly",
      "hazards": [
        "radiation",
        "gravity",
        "isolation"
      ],
      "source": "NASA — Risk of Altered Immune System Responses | https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 18
    },
    {
      "id": "muscle-weakness",
      "name": "Muscle weakness",
      "system": "muscle",
      "urgency": "tests",
      "tests": [
        "grip",
        "mass"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If sudden, severe, one-sided, or prevents safe movement, contact flight surgeon now",
      "hazards": [
        "gravity"
      ],
      "source": "NASA — Muscle Risk | https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 19
    },
    {
      "id": "back-discomfort",
      "name": "Back discomfort",
      "system": "muscle",
      "urgency": "tests",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If severe, after injury, or with new weakness/numbness, contact flight surgeon promptly",
      "hazards": [
        "gravity"
      ],
      "source": "NASA — Astronauts’ Spines Under Scrutiny | https://www.nasa.gov/missions/station/astronauts-spines-under-scrutiny/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/astronauts-spines-under-scrutiny/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 20
    },
    {
      "id": "chest-pain",
      "name": "Chest pain",
      "system": "heart",
      "urgency": "now",
      "tests": [
        "heart-electrical-activity-ecg",
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr",
        "blood-oxygen-saturation-spo2"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Immediately: new chest pain",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "NASA — Risk of Cardiovascular Adaptations | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 21
    },
    {
      "id": "sleepiness-during-a-critical-task",
      "name": "Sleepiness during a critical task",
      "system": "brain",
      "urgency": "now",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Immediately if unable to safely continue critical task; stop and notify crew per procedures",
      "hazards": [
        "environment",
        "isolation"
      ],
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 22
    },
    {
      "id": "feeling-unusually-short-of-breath-after-exertion",
      "name": "Feeling unusually short of breath after exertion",
      "system": "lungs",
      "urgency": "tests",
      "tests": [
        "blood-oxygen-saturation-spo2",
        "rr",
        "hr"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "If at rest, severe, with chest pain or fainting, contact flight surgeon now",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "NASA — Risk of Cardiovascular Adaptations | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 23
    },
    {
      "id": "poor-balance-or-unsteadiness",
      "name": "Poor balance or unsteadiness",
      "system": "balance",
      "urgency": "tests",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Not improving after several days, or after a fall",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, New Tests Evaluate Mission Readiness of Astronauts Upon Landing (2022), https://www.nasa.gov/humans-in-space/new-tests-evaluate-mission-readiness-of-astronauts-upon-landing/ (dizzy, lightheaded, nauseated and off-balance after landing)",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/new-tests-evaluate-mission-readiness-of-astronauts-upon-landing/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 24
    },
    {
      "id": "eye-pain",
      "name": "Eye pain",
      "system": "eyes",
      "urgency": "tests",
      "tests": [
        "acuity"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With vision loss or a severe headache",
      "hazards": [
        "gravity"
      ],
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 25
    },
    {
      "id": "seeing-flashes-or-spots",
      "name": "Seeing flashes or spots",
      "system": "eyes",
      "urgency": "tests",
      "tests": [
        "acuity",
        "ocular-ultrasound"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "New or worsening vision change: seek a mission-approved assessment (team doc, SANS)",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS), https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ (11 Mar 2025)",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 26
    },
    {
      "id": "sudden-loss-of-vision",
      "name": "Sudden loss of vision",
      "system": "eyes",
      "urgency": "now",
      "tests": [
        "acuity",
        "ocular-ultrasound"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Always: contact the flight surgeon using your mission procedure",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS), https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ (11 Mar 2025)",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 27
    },
    {
      "id": "palpitations",
      "name": "Palpitations",
      "system": "heart",
      "urgency": "tests",
      "tests": [
        "hr",
        "heart-electrical-activity-ecg",
        "blood-pressure-systolic",
        "blood-pressure-diastolic"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With chest pain, fainting or breathlessness",
      "hazards": [
        "gravity",
        "radiation"
      ],
      "source": "NASA, Risk of Cardiovascular Adaptations, https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ (cited in the team doc); Canadian Space Agency, Improving health care (lightheadedness and fainting triage, as cited in the team doc) (the palpitation wording is the app's)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 28
    },
    {
      "id": "swelling-in-face-or-legs",
      "name": "Swelling in face or legs",
      "system": "heart",
      "urgency": "tests",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "mass"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Sudden, or with trouble breathing",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, NASA Fluid Shifts Study Advances Journey to Mars (2015), https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 29
    },
    {
      "id": "cough",
      "name": "Cough",
      "system": "lungs",
      "urgency": "tests",
      "tests": [
        "body-temperature",
        "blood-oxygen-saturation-spo2"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With breathing trouble or fever",
      "hazards": [
        "environment"
      ],
      "source": "NASA, Spacecraft Air Quality (2023), https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/; App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 30
    },
    {
      "id": "sore-throat",
      "name": "Sore throat",
      "system": "lungs",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With fever or trouble swallowing",
      "hazards": [
        "environment"
      ],
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 31
    },
    {
      "id": "thirst-or-dry-mouth",
      "name": "Thirst or dry mouth",
      "system": "fluids",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With dizziness, very dark urine or little urine",
      "hazards": [
        "gravity"
      ],
      "source": "NASA OCHMO, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf (dehydration signs: less urine, poorer performance, trouble concentrating; read from a search summary only, verify)",
      "sourceUrls": [
        "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf"
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 32
    },
    {
      "id": "very-dark-urine",
      "name": "Very dark urine",
      "system": "fluids",
      "urgency": "tests",
      "tests": [
        "urine"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With little or no urine, dizziness or fever",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "NASA OCHMO, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf (dehydration signs: less urine, poorer performance, trouble concentrating; read from a search summary only, verify); NASA Technical Reports Server 20230015722, Human Research Program renal stone risk (hydration state and urine chemistry change in flight; read from a search summary only, verify), https://ntrs.nasa.gov/citations/20230015722",
      "sourceUrls": [
        "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf",
        "https://ntrs.nasa.gov/citations/20230015722"
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 33
    },
    {
      "id": "pain-in-the-side-or-back",
      "name": "Pain in the side or back",
      "system": "fluids",
      "urgency": "tests",
      "tests": [
        "urine",
        "body-temperature"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Severe, or with fever or blood in the urine (kidney stone risk)",
      "hazards": [
        "gravity"
      ],
      "source": "NASA Technical Reports Server 20230015722, Human Research Program renal stone risk (hydration state and urine chemistry change in flight; read from a search summary only, verify), https://ntrs.nasa.gov/citations/20230015722",
      "sourceUrls": [
        "https://ntrs.nasa.gov/citations/20230015722"
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 34
    },
    {
      "id": "nausea",
      "name": "Nausea",
      "system": "fluids",
      "urgency": "tests",
      "tests": [
        "body-temperature",
        "glucose"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Persistent: follow the approved symptom protocol. After a radiation alert, contact the flight surgeon now",
      "hazards": [
        "gravity",
        "radiation"
      ],
      "source": "NASA, Risk of Cardiovascular Adaptations, https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ (cited in the team doc); Canadian Space Agency, Improving health care (lightheadedness and fainting triage, as cited in the team doc); NASA, Hazard: Space Radiation, https://www.nasa.gov/hrp/hazard-space-radiation/ (cited in the team doc: solar particle events can cause radiation sickness that needs immediate action, follow the mission's shelter instructions)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
        "https://www.nasa.gov/hrp/hazard-space-radiation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 35
    },
    {
      "id": "vomiting-or-diarrhoea",
      "name": "Vomiting or diarrhoea",
      "system": "fluids",
      "urgency": "tests",
      "tests": [
        "urine",
        "body-temperature",
        "hr"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Cannot keep fluids down, or after a radiation alert: contact the flight surgeon now",
      "hazards": [
        "radiation",
        "environment"
      ],
      "source": "NASA, Hazard: Space Radiation, https://www.nasa.gov/hrp/hazard-space-radiation/ (cited in the team doc: solar particle events can cause radiation sickness that needs immediate action, follow the mission's shelter instructions); App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [
        "https://www.nasa.gov/hrp/hazard-space-radiation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 36
    },
    {
      "id": "fever-or-chills",
      "name": "Fever or chills",
      "system": "blood",
      "urgency": "tests",
      "tests": [
        "body-temperature",
        "hr"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Concerning or lasting: direct to medical care (team doc, immune)",
      "hazards": [
        "radiation",
        "isolation",
        "environment"
      ],
      "source": "NASA, Risk of Altered Immune System Responses, https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/; NASA, Immune Biomarkers, https://www.nasa.gov/reference/immune-biomarkers/ (both cited in the team doc: rash, infection symptoms, virus reactivation)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
        "https://www.nasa.gov/reference/immune-biomarkers/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 37
    },
    {
      "id": "cold-sores-or-a-painful-blistering-rash",
      "name": "Cold sores or a painful blistering rash",
      "system": "blood",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Spreading, or with fever: tell the flight surgeon (dormant viruses can reactivate in flight, team doc)",
      "hazards": [
        "isolation",
        "radiation"
      ],
      "source": "NASA, Risk of Altered Immune System Responses, https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/; NASA, Immune Biomarkers, https://www.nasa.gov/reference/immune-biomarkers/ (both cited in the team doc: rash, infection symptoms, virus reactivation)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
        "https://www.nasa.gov/reference/immune-biomarkers/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 38
    },
    {
      "id": "wound-that-is-not-healing",
      "name": "Wound that is not healing",
      "system": "blood",
      "urgency": "tests",
      "tests": [
        "body-temperature"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Redness spreading, pus, or fever",
      "hazards": [
        "environment"
      ],
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 39
    },
    {
      "id": "swollen-glands",
      "name": "Swollen glands",
      "system": "blood",
      "urgency": "tests",
      "tests": [
        "body-temperature",
        "hgb"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "With fever or lasting more than a few days",
      "hazards": [
        "environment"
      ],
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 40
    },
    {
      "id": "heavy-bleeding",
      "name": "Heavy bleeding",
      "system": "blood",
      "urgency": "now",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr",
        "hgb"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Always: contact the flight surgeon using your mission procedure",
      "hazards": [
        "environment"
      ],
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 41
    },
    {
      "id": "muscle-cramps",
      "name": "Muscle cramps",
      "system": "muscle",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Frequent, or with dark urine or dizziness",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, Risk of Reduced Physical Performance Capabilities Due to Reduced Muscle Size, Strength, and Endurance, https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 42
    },
    {
      "id": "joint-pain",
      "name": "Joint pain",
      "system": "muscle",
      "urgency": "self",
      "tests": [],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Swelling, or not improving with reduced load",
      "hazards": [
        "gravity"
      ],
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 43
    },
    {
      "id": "injury-from-a-fall-or-impact",
      "name": "Injury from a fall or impact",
      "system": "muscle",
      "urgency": "tests",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr",
        "blood-oxygen-saturation-spo2"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Cannot bear weight, visible deformity, or severe pain (fracture risk)",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, Risk of Bone Fracture due to Spaceflight-induced Changes to Bone, https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 44
    },
    {
      "id": "possible-broken-bone",
      "name": "Possible broken bone",
      "system": "muscle",
      "urgency": "now",
      "tests": [
        "blood-pressure-systolic",
        "blood-pressure-diastolic",
        "hr"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Always: contact the flight surgeon using your mission procedure",
      "hazards": [
        "gravity"
      ],
      "source": "NASA, Risk of Bone Fracture due to Spaceflight-induced Changes to Bone, https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-bone-fracture-due-to-spaceflight-induced-changes-to-bone/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 45
    },
    {
      "id": "headache-together-with-a-vision-change",
      "name": "Headache together with a vision change",
      "system": "brain-and-spinal-fluid",
      "urgency": "now",
      "tests": [
        "acuity"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Immediately if sudden or severe, or if confusion or a cabin alarm comes with it (headache and vision change can come from low oxygen or from head fluid shift)",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "NASA, Risk of Reduced Crew Health and Performance Due to Hypoxia. https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/ NASA, Risk of SANS reference. https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 46
    },
    {
      "id": "trouble-seeing-close-objects-clearly",
      "name": "Trouble seeing close objects clearly",
      "system": "eyes",
      "urgency": "tests",
      "tests": [
        "acuity",
        "ocular-ultrasound",
        "optical-coherence-tomography-oct"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "New or worsening vision change: record when it began and request a mission-approved visual assessment or medical consultation; a symptom alone does not establish SANS",
      "hazards": [
        "gravity"
      ],
      "source": "NASA Human Research Roadmap, SANS risk (far-sighted shift is a hallmark sign). https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105 Team doc, SANS section.",
      "sourceUrls": [
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 47
    },
    {
      "id": "dull-pressure-or-fullness-in-the-head",
      "name": "Dull pressure or fullness in the head",
      "system": "brain-and-spinal-fluid",
      "urgency": "tests",
      "tests": [
        "acuity",
        "blood-oxygen-saturation-spo2",
        "blood-pressure-systolic",
        "blood-pressure-diastolic"
      ],
      "unresolvedTestNames": [],
      "becomesUrgentWhen": "Sudden or severe, with vision change, confusion or a cabin alarm: contact the flight surgeon now",
      "hazards": [
        "gravity",
        "environment"
      ],
      "source": "App suggestion linked to head fluid shift (NASA, Risk of SANS reference, https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/). The plain-language wording is the app's. No NASA source lists this exact symptom",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/)."
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "3 Signs and symptoms",
      "sourceRow": 48
    }
  ],
  "recommendations": [
    {
      "id": "user-reports-insufficient-sleep-or-a-worsening-sleep-duration-trend-proposed-no-validated-numeric-trigger",
      "triggerText": "User reports insufficient sleep or a worsening sleep-duration trend (proposed; no validated numeric trigger)",
      "usesDataFrom": [
        "Daily check-in: sleep_hours",
        "sleep_quality"
      ],
      "action": "Protect the approved sleep period; review disturbances and request schedule adjustments if needed.",
      "mentalApproach": "Use a predictable wind-down routine; focus on rest rather than judging one poor night.",
      "escalation": "If sleep disruption persists or impairs duties, discuss it with crew medical staff under mission protocol.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 4,
      "activityIds": [
        "reading"
      ],
      "unresolvedActivityNames": [
        "Relaxation routine"
      ]
    },
    {
      "id": "user-reports-poor-sleep-quality-or-repeated-nighttime-interruptions-proposed",
      "triggerText": "User reports poor sleep quality or repeated nighttime interruptions (proposed)",
      "usesDataFrom": [
        "Daily check-in: sleep_quality",
        "sleep_interruptions"
      ],
      "action": "Reduce avoidable noise and light in the sleep area; report environmental disturbances and protect the scheduled sleep window.",
      "mentalApproach": "Treat sleep difficulties as something to observe and address, not a personal failure.",
      "escalation": "Contact designated crew support when persistent or accompanied by marked fatigue or impaired functioning.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 5,
      "activityIds": [
        "reading"
      ],
      "unresolvedActivityNames": [
        "Relaxation routine"
      ]
    },
    {
      "id": "light-dark-schedule-changes-or-irregular-work-shifts-are-recorded-proposed",
      "triggerText": "Light/dark schedule changes or irregular work shifts are recorded (proposed)",
      "usesDataFrom": [
        "Shift schedule",
        "daily check-in: sleep timing"
      ],
      "action": "Follow the mission-approved light/dark and sleep schedule; coordinate lighting or shift concerns with crew operations.",
      "mentalApproach": "Use consistent pre-sleep cues when feasible.",
      "escalation": "Escalate ongoing schedule-related sleep disruption to the mission team or flight surgeon.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 6,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Relaxation routine"
      ]
    },
    {
      "id": "user-reports-a-stressful-day-or-a-worsening-stress-trend-proposed",
      "triggerText": "User reports a stressful day or a worsening stress trend (proposed)",
      "usesDataFrom": [
        "Optional daily check-in: stress_rating",
        "mood_score"
      ],
      "action": "Take an approved break, identify the immediate stressor, and ask for workload or social support if useful.",
      "mentalApproach": "Try nonjudgmental reflection and a brief calming exercise; avoid self-diagnosis.",
      "escalation": "Ask for trained human support if distress persists, escalates, or affects safety or functioning.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 7,
      "activityIds": [
        "breathing",
        "journal"
      ],
      "unresolvedActivityNames": []
    },
    {
      "id": "user-reports-low-mood-or-a-downward-personal-mood-trend-proposed",
      "triggerText": "User reports low mood or a downward personal mood trend (proposed)",
      "usesDataFrom": [
        "Optional daily check-in: mood_score",
        "personal trend"
      ],
      "action": "Choose a personally meaningful low-pressure activity and consider speaking privately with a trusted crewmate.",
      "mentalApproach": "Acknowledge the feeling without treating a single rating as a diagnosis.",
      "escalation": "Offer confidential review with qualified crew support if persistent, severe, or disruptive; urgent concerns follow medical procedures.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Behavioral Health and Performance, Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 8,
      "activityIds": [
        "journal",
        "reading"
      ],
      "unresolvedActivityNames": [
        "Creative hobby"
      ]
    },
    {
      "id": "user-reports-fatigue-or-declining-energy-proposed",
      "triggerText": "User reports fatigue or declining energy (proposed)",
      "usesDataFrom": [
        "Daily check-in: fatigue_score",
        "sleep_hours",
        "workload"
      ],
      "action": "Review scheduled rest, sleep opportunities, meal adherence, and workload; raise excessive fatigue with the team.",
      "mentalApproach": "Prioritize recovery and one manageable next step.",
      "escalation": "If fatigue continues or affects operational performance, request flight-surgeon review.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 9,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Relaxation routine",
        "Light leisure"
      ]
    },
    {
      "id": "user-reports-difficulty-focusing-after-poor-sleep-or-high-workload-proposed",
      "triggerText": "User reports difficulty focusing after poor sleep or high workload (proposed)",
      "usesDataFrom": [
        "Daily check-in: focus rating",
        "sleep_quality",
        "work_hours"
      ],
      "action": "Review fatigue and distractions, use approved task checklists, and ask for appropriate rest or workload adjustments.",
      "mentalApproach": "Break tasks into clear steps without assigning a clinical label.",
      "escalation": "Raise any task-safety concern promptly through crew procedures; request medical review if ongoing.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Risk from Inadequate Sleep and Irregular Schedules | https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 10,
      "activityIds": [
        "journal"
      ],
      "unresolvedActivityNames": [
        "Short rest"
      ]
    },
    {
      "id": "user-expresses-loneliness-or-limited-meaningful-contact-proposed",
      "triggerText": "User expresses loneliness or limited meaningful contact (proposed)",
      "usesDataFrom": [
        "Optional check-in: social_connection",
        "contact_preference"
      ],
      "action": "Plan optional contact with family/friends or a crew check-in, respecting privacy and personal preference.",
      "mentalApproach": "Notice which connections feel supportive; participation is voluntary.",
      "escalation": "Ask for trained support when isolation-related distress persists or disrupts daily activities.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 11,
      "activityIds": [
        "family-message",
        "peer-checkin"
      ],
      "unresolvedActivityNames": []
    },
    {
      "id": "family-communication-is-delayed-or-a-live-call-is-unavailable-operational-event",
      "triggerText": "Family communication is delayed or a live call is unavailable (operational event)",
      "usesDataFrom": [
        "Communication status",
        "communication_delay",
        "message_queue"
      ],
      "action": "Prepare an asynchronous message and queue it for later transmission; use locally stored resources meanwhile.",
      "mentalApproach": "Set realistic expectations about reply delays.",
      "escalation": "For urgent safety or medical issues, use the designated mission communication/escalation protocol rather than a family message.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Houston, Do You Copy? HERA Crew Navigates Communication Delays | https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 12,
      "activityIds": [
        "family-message",
        "journal"
      ],
      "unresolvedActivityNames": []
    },
    {
      "id": "user-reports-boredom-or-low-engagement-with-daily-routines-proposed",
      "triggerText": "User reports boredom or low engagement with daily routines (proposed)",
      "usesDataFrom": [
        "Daily check-in: engagement_feedback",
        "hobby_preference"
      ],
      "action": "Select a preferred optional recreational activity using available cabin resources.",
      "mentalApproach": "Choose personally meaningful activities rather than forcing an identical routine for every crewmember.",
      "escalation": "Discuss persistent disengagement that affects wellbeing with designated crew support.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 13,
      "activityIds": [
        "reading",
        "gardening"
      ],
      "unresolvedActivityNames": [
        "Creative hobby"
      ]
    },
    {
      "id": "a-crewmember-wants-an-optional-hobby-or-plant-care-task-user-choice",
      "triggerText": "A crewmember wants an optional hobby or plant-care task (user choice)",
      "usesDataFrom": [
        "Activity preferences",
        "resources",
        "engagement feedback"
      ],
      "action": "Offer approved plant-care or other hobby tasks; log interest and enjoyment without claiming a proven clinical effect.",
      "mentalApproach": "Focus on enjoyment, autonomy and purposeful engagement.",
      "escalation": "Refer any safety/food-hygiene issue to mission procedures; no automatic mental-health escalation from hobby use.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Researchers Put Space Garden Microbes Under the Microscope | https://www.nasa.gov/missions/station/researchers-put-space-garden-microbes-under-the-microscope/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/researchers-put-space-garden-microbes-under-the-microscope/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 14,
      "activityIds": [
        "gardening"
      ],
      "unresolvedActivityNames": [
        "Creative hobby"
      ]
    },
    {
      "id": "self-reported-excessive-workload-or-missed-scheduled-breaks-proposed",
      "triggerText": "Self-reported excessive workload or missed scheduled breaks (proposed)",
      "usesDataFrom": [
        "Work schedule",
        "work_hours",
        "fatigue_score"
      ],
      "action": "Review planned versus actual workload, protect approved rest breaks, and discuss task prioritization with the crew lead.",
      "mentalApproach": "Focus on one achievable task at a time; normalize asking for support.",
      "escalation": "Escalate repeated overload or safety-relevant fatigue to mission operations and medical staff as appropriate.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 15,
      "activityIds": [
        "breathing"
      ],
      "unresolvedActivityNames": [
        "Short rest"
      ]
    },
    {
      "id": "unclear-team-task-assignments-or-reported-collaboration-strain-proposed",
      "triggerText": "Unclear team task assignments or reported collaboration strain (proposed)",
      "usesDataFrom": [
        "Crew check-in",
        "task assignments",
        "teamwork feedback"
      ],
      "action": "Clarify roles, agree on task handovers, and communicate concerns through a respectful crew check-in.",
      "mentalApproach": "Use constructive, specific language about tasks and needs.",
      "escalation": "Escalate unresolved conflicts affecting safety or performance to the appropriate crew lead and support team.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Hazard 2: Isolation | https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 16,
      "activityIds": [
        "peer-checkin"
      ],
      "unresolvedActivityNames": []
    },
    {
      "id": "user-reports-reduced-appetite-or-low-meal-acceptance-proposed",
      "triggerText": "User reports reduced appetite or low meal acceptance (proposed)",
      "usesDataFrom": [
        "Meal check-in: appetite_score",
        "acceptability_score",
        "meal_taken"
      ],
      "action": "Review the mission-approved menu and, where available, select an acceptable alternative or request variety.",
      "mentalApproach": "View food feedback as useful preference data, not a diagnosis.",
      "escalation": "Persistent inability to eat, suspected illness, or nutritional concerns require medical/nutrition-team review.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — How Does Spaceflight Change Food Appeal? | https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 17,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Meal reflection"
      ]
    },
    {
      "id": "repeated-low-ratings-for-the-same-meal-proposed",
      "triggerText": "Repeated low ratings for the same meal (proposed)",
      "usesDataFrom": [
        "Meal history",
        "food_acceptability",
        "menu rotation"
      ],
      "action": "Record meal feedback and request a different approved menu option when available.",
      "mentalApproach": "Focus on choice and sustainability of the food plan.",
      "escalation": "Refer ongoing intake problems to mission nutrition/medical staff; do not prescribe supplements.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — The Menu for Mars: Designing a Deep Space Food System | https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 18,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Meal reflection"
      ]
    },
    {
      "id": "user-misses-a-scheduled-approved-workout-schedule-event",
      "triggerText": "User misses a scheduled, approved workout (schedule event)",
      "usesDataFrom": [
        "Assigned exercise plan",
        "exercise_adherence"
      ],
      "action": "Review the mission-approved exercise plan and reschedule or report the missed session according to team instructions.",
      "mentalApproach": "Resume the assigned routine without compensatory overexertion.",
      "escalation": "Pain, dizziness, injury, or repeated inability to exercise should be reviewed by medical/fitness staff.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Astronaut Exercise | https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 19,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Approved exercise session"
      ]
    },
    {
      "id": "user-completes-an-exercise-session-logging-event",
      "triggerText": "User completes an exercise session (logging event)",
      "usesDataFrom": [
        "Exercise type",
        "minutes",
        "perceived exertion"
      ],
      "action": "Record completed aerobic or resistance activity and compare it with the personally assigned plan.",
      "mentalApproach": "Track consistency, not competition with other crewmembers.",
      "escalation": "Unusual symptoms or performance concerns should follow the crew's medical plan.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Muscle Risk | https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/muscle-risk/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 20,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Approved exercise session"
      ]
    },
    {
      "id": "user-reports-elevated-stress-with-disrupted-sleep-proposed",
      "triggerText": "User reports elevated stress with disrupted sleep (proposed)",
      "usesDataFrom": [
        "Private stress_rating",
        "sleep_hours",
        "sleep_quality"
      ],
      "action": "Offer an optional relaxation break, review sleep regularity, and discuss workload where necessary.",
      "mentalApproach": "Use a brief reflection or calming exercise as a self-care choice, not an immune-system treatment.",
      "escalation": "Medical review for persistent distress, significant sleep loss, or infection-like symptoms; no automated immune diagnosis.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Risk of Altered Immune System Responses | https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 21,
      "activityIds": [
        "breathing"
      ],
      "unresolvedActivityNames": [
        "Relaxation routine"
      ]
    },
    {
      "id": "user-opts-to-log-symptoms-such-as-rash-or-signs-of-infection-reported-event",
      "triggerText": "User opts to log symptoms such as rash or signs of infection (reported event)",
      "usesDataFrom": [
        "Optional symptoms_other",
        "sleep/stress history"
      ],
      "action": "Record symptom onset and relevant context; use approved crew medical contact and hygiene procedures.",
      "mentalApproach": "Avoid self-diagnosis; communicate observed symptoms clearly.",
      "escalation": "Contact the flight surgeon per mission rules for concerning symptoms; medication decisions are clinician-only.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Immune Biomarkers | https://www.nasa.gov/reference/immune-biomarkers/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/immune-biomarkers/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 22,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Symptom journaling"
      ]
    },
    {
      "id": "astronaut-reports-dizziness-during-post-flight-gravity-readaptation-reported-event",
      "triggerText": "Astronaut reports dizziness during post-flight gravity readaptation (reported event)",
      "usesDataFrom": [
        "Symptom report",
        "mission phase",
        "approved BP observations"
      ],
      "action": "Stop unsafe activity and contact the medical team; follow the individually prescribed return-to-gravity plan.",
      "mentalApproach": "Focus on safety and clearly reporting what is felt; do not self-treat.",
      "escalation": "Prompt medical assessment under postflight protocols; do not suggest a universal fluid or compression prescription.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "CSA — BP Reg: Predicting Fainting in Astronauts | https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/bpreg.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 23,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Symptom journaling"
      ]
    },
    {
      "id": "crew-member-opens-environmental-status-panel-or-an-approved-alert-is-active-operational-event",
      "triggerText": "Crew member opens environmental status panel or an approved alert is active (operational event)",
      "usesDataFrom": [
        "Validated O2/CO2/pressure sensor",
        "alarm state",
        "timestamp"
      ],
      "action": "Review verified cabin readings and the associated approved checklist; do not alter life-support settings based on app advice.",
      "mentalApproach": "Stay procedure-focused; distinguish simulated from verified readings.",
      "escalation": "Any active certified cabin alarm follows immediate mission-approved operational escalation.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Environmental Control and Life Support Systems | https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/",
      "sourceUrls": [
        "https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 24,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Safety checklist review"
      ]
    },
    {
      "id": "mission-control-issues-a-verified-space-weather-radiation-advisory-operational-event",
      "triggerText": "Mission control issues a verified space-weather/radiation advisory (operational event)",
      "usesDataFrom": [
        "Approved radiation advisory",
        "dosimetry",
        "incident status"
      ],
      "action": "Follow mission-control shelter and exposure-reduction procedures; consult verified instructions, not a generic app threshold.",
      "mentalApproach": "Follow the official checklist step by step.",
      "escalation": "Escalate through mission operations immediately as defined by the advisory/procedure.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — Space Radiation Hazard | https://www.nasa.gov/hrp/hazard-space-radiation/",
      "sourceUrls": [
        "https://www.nasa.gov/hrp/hazard-space-radiation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 25,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Safety checklist review"
      ]
    },
    {
      "id": "new-validated-radiation-measurement-is-received-data-event",
      "triggerText": "New validated radiation measurement is received (data event)",
      "usesDataFrom": [
        "Certified dosimeter: reading",
        "unit",
        "timestamp",
        "location",
        "quality"
      ],
      "action": "Record and review dose history with correct units and measurement provenance; defer exposure interpretation to specialists.",
      "mentalApproach": "Avoid concluding individual health risk from one reading.",
      "escalation": "Only mission-approved limits or official alerts can trigger protective actions or specialist review.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "CSA — Monitoring Radiation for Astronaut Health | https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 26,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Radiation log review"
      ]
    },
    {
      "id": "assigned-cabin-water-quality-maintenance-check-becomes-due-schedule-event",
      "triggerText": "Assigned cabin water-quality maintenance check becomes due (schedule event)",
      "usesDataFrom": [
        "Mission maintenance schedule",
        "water_quality_status",
        "test results"
      ],
      "action": "Complete approved water-system checks and record laboratory-verified concerns as instructed.",
      "mentalApproach": "Use checklists and verified measurements rather than assumptions.",
      "escalation": "Escalate any certified water-quality failure through operations/medical procedures.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA — NASA Achieves Water Recovery Milestone | https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 27,
      "activityIds": [],
      "unresolvedActivityNames": [
        "Safety checklist review"
      ]
    },
    {
      "id": "blood-pressure-below-the-range-and-low-fluids-proposed-app-logic-not-a-nasa-threshold",
      "triggerText": "Blood pressure below the range and low fluids (proposed app logic, not a NASA threshold)",
      "usesDataFrom": [
        "Tests",
        "Daily check-in"
      ],
      "action": "Log water, follow the mission fluid plan, then repeat the reading. Move slowly when you change position.",
      "mentalApproach": "Pause before starting a task.",
      "escalation": "If it stays low or you feel dizzy, contact the flight surgeon.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Risk of Cardiovascular Adaptations, https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ (cited in the team doc); Canadian Space Agency, Improving health care (lightheadedness and fainting triage, as cited in the team doc); NASA OCHMO, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf (dehydration signs: less urine, poorer performance, trouble concentrating; read from a search summary only, verify)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/",
        "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf"
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 28,
      "activityIds": [],
      "unresolvedActivityNames": []
    },
    {
      "id": "raised-temperature-together-with-a-raised-heart-rate-proposed-app-logic-not-a-nasa-threshold",
      "triggerText": "Raised temperature together with a raised heart rate (proposed app logic, not a NASA threshold)",
      "usesDataFrom": [
        "Tests"
      ],
      "action": "Rest 15 minutes, drink water, then repeat both.",
      "mentalApproach": "",
      "escalation": "If both are still raised, contact the flight surgeon.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Risk of Altered Immune System Responses, https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/; NASA, Immune Biomarkers, https://www.nasa.gov/reference/immune-biomarkers/ (both cited in the team doc: rash, infection symptoms, virus reactivation)",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/",
        "https://www.nasa.gov/reference/immune-biomarkers/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 29,
      "activityIds": [],
      "unresolvedActivityNames": []
    },
    {
      "id": "new-or-worsening-vision-change-reported-or-yes-on-the-daily-vision-question-proposed-app-logic-not-a-nasa-threshold",
      "triggerText": "New or worsening vision change (reported or Yes on the daily vision question) (proposed app logic, not a NASA threshold)",
      "usesDataFrom": [
        "Symptoms",
        "Daily check-in"
      ],
      "action": "Record when it started, and do the visual acuity test in the Laboratory. Do not self-treat or try to measure pressure inside the skull.",
      "mentalApproach": "Report what you notice calmly; a symptom alone does not mean SANS.",
      "escalation": "New or worsening change: request a mission-approved visual assessment or medical consultation (team doc, SANS). Sudden loss of vision, or a headache with it: contact the flight surgeon now.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS). https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ NASA Human Research Roadmap, SANS risk. https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105 Team doc, SANS section.",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/",
        "https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=105"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 30,
      "activityIds": [],
      "unresolvedActivityNames": []
    },
    {
      "id": "cabin-air-felt-stuffy-with-headache-confusion-or-breathing-trouble-proposed-app-logic-not-a-nasa-threshold",
      "triggerText": "Cabin air felt stuffy, with headache, confusion or breathing trouble (proposed app logic, not a NASA threshold)",
      "usesDataFrom": [
        "Daily check-in",
        "Symptoms",
        "Tests"
      ],
      "action": "Follow the mission cabin air procedure and check SpO₂ if you can (it does not replace cabin readings).",
      "mentalApproach": "Stay calm and tell the crew.",
      "escalation": "Escalate per the approved protocol; confusion or severe breathing trouble: contact now.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Risk of Reduced Crew Health and Performance Due to Hypoxia, https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/; NASA, Spacecraft Air Quality (2023), https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
        "https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 31,
      "activityIds": [],
      "unresolvedActivityNames": []
    },
    {
      "id": "drinking-water-looked-smelled-or-tasted-different-proposed-app-logic-not-a-nasa-threshold",
      "triggerText": "Drinking water looked, smelled or tasted different (proposed app logic, not a NASA threshold)",
      "usesDataFrom": [
        "Daily check-in"
      ],
      "action": "Do not drink it if unsure, and report it using the mission procedure.",
      "mentalApproach": "",
      "escalation": "Report to the crew and the system owner. This is not a water test.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA, NASA Achieves Water Recovery Milestone on the International Space Station (2023), https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 32,
      "activityIds": [],
      "unresolvedActivityNames": []
    },
    {
      "id": "a-result-and-its-period-average-are-both-outside-the-range-proposed-app-logic-not-a-nasa-threshold",
      "triggerText": "A result and its period average are both outside the range (proposed app logic, not a NASA threshold)",
      "usesDataFrom": [
        "Tests"
      ],
      "action": "Repeat the measurement using the steps shown.",
      "mentalApproach": "",
      "escalation": "Tell the flight surgeon using your mission procedure.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "App safety rule or suggestion. No NASA or NCBI source found yet",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 33,
      "activityIds": [],
      "unresolvedActivityNames": []
    },
    {
      "id": "headache-together-with-a-vision-change-or-dull-pressure-in-the-head-reported-event-proposed-app-logic",
      "triggerText": "Headache together with a vision change, or dull pressure in the head (reported event; proposed app logic)",
      "usesDataFrom": [
        "Symptoms",
        "Daily check-in"
      ],
      "action": "Stop demanding tasks, sit or lie down, and check cabin air readings or alarms if available. Record when it began and what came with it.",
      "mentalApproach": "Stay calm and report clearly; do not decide the cause yourself.",
      "escalation": "Contact the flight surgeon now if it is sudden or severe, or comes with confusion, breathing trouble or a cabin alarm.",
      "rule": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Risk of Reduced Crew Health and Performance Due to Hypoxia. https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/ NASA, Risk of SANS reference. https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/",
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "4 Recommendations",
      "sourceRow": 34,
      "activityIds": [],
      "unresolvedActivityNames": []
    }
  ],
  "activities": [
    {
      "id": "reading",
      "name": "Reading",
      "type": "Relaxation",
      "minutes": 15,
      "durationBasis": "configurable-example",
      "goodFor": [
        "calm",
        "sleep"
      ],
      "purpose": [
        "Optional relaxation",
        "boredom",
        "pre-sleep leisure"
      ],
      "how": "Read a preferred book or downloaded text during protected free time. Adjust or skip the session to suit your preferences.",
      "source": "CSA, How astronauts take care of their mental health in space. https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp Team: Anas, A04. Optional leisure example; duration is a configurable app default, not a tested treatment dose.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 4
    },
    {
      "id": "music",
      "name": "Listening to music",
      "type": "Relaxation",
      "minutes": 10,
      "durationBasis": "configurable-example",
      "goodFor": [
        "calm",
        "mood"
      ],
      "purpose": [
        "Optional relaxation",
        "preferred leisure",
        "monotony"
      ],
      "how": "Listen to a chosen downloaded playlist at a comfortable volume without masking operational alarms.",
      "source": "CSA, How astronauts take care of their mental health in space. https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp Team: Anas, A04. Optional leisure example; duration is a configurable app default, not a tested treatment dose.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 5
    },
    {
      "id": "chess",
      "name": "Chess with a crewmate",
      "type": "Social",
      "minutes": 20,
      "durationBasis": "configurable-example",
      "goodFor": [
        "connection",
        "mood"
      ],
      "purpose": [
        "Optional crew connection",
        "shared recreation"
      ],
      "how": "Invite a willing crewmate to play chess or another available board game. Participation is optional.",
      "source": "CSA, How astronauts take care of their mental health in space. https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp Team: recreation mapping; specific game is an app choice. Optional leisure example; duration is a configurable app default, not a tested treatment dose.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 6
    },
    {
      "id": "family-message",
      "name": "Asynchronous family message",
      "type": "Social",
      "minutes": 10,
      "durationBasis": "configurable-example",
      "goodFor": [
        "connection"
      ],
      "purpose": [
        "Optional connection with loved ones",
        "communication delays"
      ],
      "how": "Prepare a personal text, audio or video message for later delivery. Respect privacy and expected communication delays.",
      "source": "CSA, How astronauts take care of their mental health in space. https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp NASA, HERA Communication Delays. https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/ Team: Anas, A03. Duration: app default.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp",
        "https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 7
    },
    {
      "id": "peer-checkin",
      "name": "Peer check-in",
      "type": "Social",
      "minutes": 10,
      "durationBasis": "configurable-example",
      "goodFor": [
        "connection"
      ],
      "purpose": [
        "Optional crew connection",
        "opportunity to ask for support"
      ],
      "how": "Invite a crewmate for a private conversation and listen without pressure to disclose. A peer conversation does not replace professional care.",
      "source": "CSA, How astronauts take care of their mental health in space. https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp Team: Anas, A03 / CSA handoff, project-proposed format. Duration: configurable app default; effectiveness not established by the handoff.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/mental-health-and-isolation/how-astronauts-take-care-of-their-mental-health-in-space.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 8
    },
    {
      "id": "journal",
      "name": "Private wellbeing journal",
      "type": "Mental",
      "minutes": 3,
      "durationBasis": "configurable-example",
      "goodFor": [
        "mood",
        "calm"
      ],
      "purpose": [
        "Personal reflection",
        "organizing feelings and observations"
      ],
      "how": "Privately record how you feel and any observations you want to discuss. Share only what you choose.",
      "source": "NASA, Risk of Behavioral Changes and Psychiatric Disorders. https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/ Team: Anas / SANS handoff. Three minutes is a project example, not a validated dose.",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 9
    },
    {
      "id": "gardening",
      "name": "Space gardening",
      "type": "Mental",
      "minutes": 10,
      "durationBasis": "configurable-example",
      "goodFor": [
        "mood"
      ],
      "purpose": [
        "Optional meaningful hobby",
        "engagement",
        "variety"
      ],
      "how": "If an approved plant facility is available, follow its care and hygiene procedure. Choose another hobby if plant care does not interest you.",
      "source": "NASA, Can Space Gardening Help Astronauts Cope With Isolation? (2021). https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/ Team: Anas, S03. Preliminary survey; interests differ. Duration: app default.",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/can-space-gardening-help-astronauts-cope-with-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 10
    },
    {
      "id": "sleep-winddown",
      "name": "Sleep wind-down",
      "type": "Relaxation",
      "minutes": 15,
      "durationBasis": "configurable-example",
      "goodFor": [
        "sleep",
        "calm"
      ],
      "purpose": [
        "Preparing for the approved sleep opportunity",
        "unwinding"
      ],
      "how": "Use a quiet preferred activity and reduce avoidable interruptions before the scheduled sleep period. Follow mission lighting and sleep arrangements.",
      "source": "NASA, Risk from Inadequate Sleep and Irregular Schedules. https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/ Team: Hasan / Anas, A01. Fifteen minutes is an app example, not a NASA sleep prescription.",
      "sourceUrls": [
        "https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 11
    },
    {
      "id": "breathing",
      "name": "Breathing exercise",
      "type": "Relaxation",
      "minutes": 5,
      "durationBasis": "configurable-example",
      "goodFor": [
        "calm"
      ],
      "purpose": [
        "Optional stress-management practice"
      ],
      "how": "If comfortable, use an approved relaxation guide with unforced breathing. Stop if uncomfortable; this does not treat low cabin oxygen.",
      "source": "NIH/NCCIH, Relaxation Techniques: What You Need To Know. https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know Supplement: Earth-based guidance; no astronaut-specific efficacy or dose established. Five minutes: app default.",
      "sourceUrls": [
        "https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 12
    },
    {
      "id": "aerobic",
      "name": "Prescribed aerobic exercise",
      "type": "Physical",
      "minutes": null,
      "durationBasis": "mission-plan",
      "goodFor": [
        "activity"
      ],
      "purpose": [
        "Maintaining aerobic fitness",
        "exercise-plan adherence"
      ],
      "how": "Complete only the aerobic session assigned in your mission medical plan, using approved equipment. Duration and intensity come from that plan.",
      "source": "NASA, Astronaut Exercise. https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ Team: Anas, A10 / FIT-01. Blank duration is intentional: clinician/mission-defined; ISS schedules are not universal.",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 13
    },
    {
      "id": "resistance",
      "name": "Prescribed resistance exercise",
      "type": "Physical",
      "minutes": null,
      "durationBasis": "mission-plan",
      "goodFor": [
        "activity"
      ],
      "purpose": [
        "Maintaining muscle and bone loading",
        "exercise-plan adherence"
      ],
      "how": "Complete only the resistance session assigned in your mission medical plan with approved equipment and technique. Log completion.",
      "source": "NASA, Astronaut Exercise. https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ Team: Anas, ACT-08 / BONE-01. Blank duration is intentional: plan-defined; no sets, loads or repetitions prescribed here.",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 14
    },
    {
      "id": "movement-break",
      "name": "Gentle approved movement break",
      "type": "Physical",
      "minutes": null,
      "durationBasis": "mission-plan",
      "goodFor": [
        "activity"
      ],
      "purpose": [
        "Breaking up inactivity",
        "work/rest planning"
      ],
      "how": "Use only a movement break already approved for your mission phase and current condition. It supplements the exercise plan.",
      "source": "CSA, The Vascular series. https://www.asc-csa.gc.ca/eng/sciences/vascular.asp Team: CSA handoff, project-proposed break. Blank duration is intentional: configure from mission guidance, not a universal treatment regimen.",
      "sourceUrls": [
        "https://www.asc-csa.gc.ca/eng/sciences/vascular.asp"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 15
    },
    {
      "id": "film-night-with-the-crew",
      "name": "Film night with the crew",
      "type": "Social",
      "minutes": 90,
      "durationBasis": "configurable-example",
      "goodFor": [],
      "purpose": [
        "Low mood",
        "Isolation",
        "Stress"
      ],
      "how": "Pick a film together and watch it as a group.",
      "source": "Recreation topic from the team doc (action A04: reading, music, exercise, gardening) and NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/. The specific activity is the app's suggestion",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/."
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 16
    },
    {
      "id": "puzzle-or-strategy-game",
      "name": "Puzzle or strategy game",
      "type": "Mental",
      "minutes": 20,
      "durationBasis": "configurable-example",
      "goodFor": [],
      "purpose": [
        "Poor focus",
        "Low mood"
      ],
      "how": "Do a puzzle that needs full attention.",
      "source": "Recreation topic from the team doc (action A04: reading, music, exercise, gardening) and NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/. The specific activity is the app's suggestion",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/."
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 17
    },
    {
      "id": "stretching-routine",
      "name": "Stretching routine",
      "type": "Physical",
      "minutes": 10,
      "durationBasis": "configurable-example",
      "goodFor": [],
      "purpose": [
        "Stress",
        "Poor sleep",
        "Low energy"
      ],
      "how": "Stretch your back, hips and shoulders slowly.",
      "source": "Recreation topic from the team doc (action A04: reading, music, exercise, gardening) and NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/. The specific activity is the app's suggestion",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/."
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 18
    },
    {
      "id": "window-time-watch-earth-or-the-sky",
      "name": "Window time: watch Earth or the sky",
      "type": "Relaxation",
      "minutes": 10,
      "durationBasis": "configurable-example",
      "goodFor": [],
      "purpose": [
        "Low mood",
        "Stress",
        "Isolation"
      ],
      "how": "Spend ten quiet minutes at a window.",
      "source": "Recreation topic from the team doc (action A04: reading, music, exercise, gardening) and NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/. The specific activity is the app's suggestion",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/."
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "5 Activities",
      "sourceRow": 19
    }
  ],
  "questions": [
    {
      "id": "question-how-was-your-overall-mood-today",
      "name": "question-how-was-your-overall-mood-today",
      "text": "How was your overall mood today?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "Very low",
        "Low",
        "Neutral",
        "Good",
        "Very good"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: suggest a mood activity and a call home; with short sleep, the sleep and mood recommendation",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Spaceflight Standard Measures: Characterizing How Humans Adapt in Space, https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space (pre-sleep mood questionnaire topic). Question wording adapted by the AMIGOS team; not a validated item.",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/spaceflight-standard-measures-characterizing-how-humans-adapt-in-space"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 4
    },
    {
      "id": "question-about-how-long-did-you-sleep",
      "name": "question-about-how-long-did-you-sleep",
      "text": "About how long did you sleep?",
      "topic": "Sleep",
      "answerType": "choice",
      "options": [
        "Under 5 hours",
        "5 to 6 hours",
        "6 to 7 hours",
        "7 to 9 hours",
        "More than 9 hours"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Under 7 hours for 3 days: sleep recommendation (the app shows it against the 7 to 9 hour reference)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "National Sleep Foundation, 7 to 9 hours for adults (the reference this app uses); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/ (research handoff action A01, sleep_hours)",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 5
    },
    {
      "id": "question-how-restful-was-your-sleep",
      "name": "question-how-restful-was-your-sleep",
      "text": "How restful was your sleep?",
      "topic": "Sleep",
      "answerType": "integer-scale",
      "options": [
        "Very poor",
        "Poor",
        "Fair",
        "Good",
        "Very good"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: sleep recommendation",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "Research handoff action A01 (sleep_quality); the sleep-quality topic as in the PSQI review, https://pmc.ncbi.nlm.nih.gov/articles/PMC11973415/. Wording is the team's own",
      "sourceUrls": [
        "https://pmc.ncbi.nlm.nih.gov/articles/PMC11973415/."
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 6
    },
    {
      "id": "question-how-groggy-did-you-feel-in-the-first-hour-after-you-woke-up",
      "name": "question-how-groggy-did-you-feel-in-the-first-hour-after-you-woke-up",
      "text": "How groggy did you feel in the first hour after you woke up?",
      "topic": "Sleep",
      "answerType": "integer-scale",
      "options": [
        "Very groggy",
        "Groggy",
        "A little groggy",
        "Slightly groggy",
        "Not groggy at all"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "1 or 2 for 3 days: protect the sleep window; allow time to wake up before urgent tasks",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Technical Reports Server 20140003280, Fatigue-Related Countermeasures for Long-Duration Exploration Missions, https://ntrs.nasa.gov/citations/20140003280; NASA Human Research Program evidence on sleep loss, circadian desynchronization and work overload (it flags grogginess after waking, sleep inertia, as a risk for quick decisions). Checked from search summaries only; verify",
      "sourceUrls": [
        "https://ntrs.nasa.gov/citations/20140003280"
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 7
    },
    {
      "id": "question-how-well-did-you-sleep-through-the-night",
      "name": "question-how-well-did-you-sleep-through-the-night",
      "text": "How well did you sleep through the night?",
      "topic": "Sleep",
      "answerType": "integer-scale",
      "options": [
        "Woke up many times",
        "Woke up often",
        "Woke up a few times",
        "Woke up once",
        "Slept through"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: sleep protection recommendation (doc A01)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Human Research Program BMed Evidence Report (2016); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 8
    },
    {
      "id": "question-how-was-your-appetite-today",
      "name": "question-how-was-your-appetite-today",
      "text": "How was your appetite today?",
      "topic": "Nutrition",
      "answerType": "integer-scale",
      "options": [
        "Very poor",
        "Poor",
        "Fair",
        "Good",
        "Very good"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: suggest a nutrition recommendation (menu variety)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, The Menu for Mars (2021), https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/; NASA, How Does Spaceflight Change Food Appeal? (2021), https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/ (research handoff action A05, appetite_score)",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/",
        "https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 9
    },
    {
      "id": "question-how-many-meals-did-you-eat-today",
      "name": "question-how-many-meals-did-you-eat-today",
      "text": "How many meals did you eat today?",
      "topic": "Nutrition",
      "answerType": "choice",
      "options": [
        "None",
        "One",
        "Two",
        "Three",
        "Four or more"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Fewer than 2 meals for 2 days: suggest a nutrition recommendation",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, The Menu for Mars (2021), https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/; NASA, How Does Spaceflight Change Food Appeal? (2021), https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/the-menu-for-mars-designing-a-deep-space-food-system/",
        "https://www.nasa.gov/humans-in-space/how-does-spaceflight-change-food-appeal/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 10
    },
    {
      "id": "question-how-much-plain-water-did-you-drink-today",
      "name": "question-how-much-plain-water-did-you-drink-today",
      "text": "How much plain water did you drink today?",
      "topic": "Water",
      "answerType": "choice",
      "options": [
        "Under 1 litre",
        "1 to 1.5 litres",
        "1.5 to 2 litres",
        "2 to 2.5 litres",
        "More than 2.5 litres"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Under 1.5 litres: follow the mission fluid plan (the app compares it with your own average)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA OCHMO, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf; NASA Technical Reports Server 20000020625 (a minimum of about 2 litres a day is cited there), https://ntrs.nasa.gov/citations/20000020625. Checked from search summaries only; verify",
      "sourceUrls": [
        "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf",
        "https://ntrs.nasa.gov/citations/20000020625."
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 11
    },
    {
      "id": "question-did-your-drinking-water-look-smell-or-taste-different-from-usual-today",
      "name": "question-did-your-drinking-water-look-smell-or-taste-different-from-usual-today",
      "text": "Did your drinking water look, smell or taste different from usual today?",
      "topic": "Water",
      "answerType": "boolean",
      "options": [
        "Yes",
        "No"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Yes: do not drink it if unsure, and report it using the mission procedure",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, NASA Achieves Water Recovery Milestone on the International Space Station (2023), https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/; NASA, Researchers Put Space Garden Microbes Under the Microscope (2021), https://www.nasa.gov/missions/station/researchers-put-space-garden-microbes-under-the-microscope/ (research handoff action A09). This is how it looked, smelled or tasted, not a water test",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/nasa-achieves-water-recovery-milestone-on-international-space-station/",
        "https://www.nasa.gov/missions/station/researchers-put-space-garden-microbes-under-the-microscope/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 12
    },
    {
      "id": "question-how-thirsty-did-you-feel-today",
      "name": "question-how-thirsty-did-you-feel-today",
      "text": "How thirsty did you feel today?",
      "topic": "Water",
      "answerType": "integer-scale",
      "options": [
        "Very thirsty",
        "Thirsty",
        "Somewhat thirsty",
        "Slightly thirsty",
        "Not thirsty"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower: drink and recheck; thirst can be reduced in space, so also follow the fluid plan",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Technical Reports Server record 20000020625 (fluid shifts, reduced thirst and intake in flight), https://ntrs.nasa.gov/citations/20000020625; NASA Office of the Chief Health and Medical Officer, Water technical brief (2023), https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf. Checked from search summaries only; verify against the full text.",
      "sourceUrls": [
        "https://ntrs.nasa.gov/citations/20000020625",
        "https://www.nasa.gov/wp-content/uploads/2023/03/water-technical-brief-ochmo.pdf."
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 13
    },
    {
      "id": "question-how-many-caffeinated-drinks-did-you-have-today",
      "name": "question-how-many-caffeinated-drinks-did-you-have-today",
      "text": "How many caffeinated drinks did you have today?",
      "topic": "Other",
      "answerType": "choice",
      "options": [
        "None",
        "One",
        "Two",
        "Three",
        "Four or more"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Four or more with poor sleep: suggest keeping caffeine earlier in the day",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Technical Reports Server 20240004245, Caffeine consumption aboard the International Space Station (2024 conference poster), https://ntrs.nasa.gov/citations/20240004245. Checked from a search summary only; findings are preliminary",
      "sourceUrls": [
        "https://ntrs.nasa.gov/citations/20240004245."
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 14
    },
    {
      "id": "question-when-was-your-last-caffeinated-drink",
      "name": "question-when-was-your-last-caffeinated-drink",
      "text": "When was your last caffeinated drink?",
      "topic": "Other",
      "answerType": "choice",
      "options": [
        "No caffeine today",
        "Morning",
        "Afternoon",
        "Evening",
        "Close to bedtime"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Evening or close to bedtime with poor sleep: suggest an earlier last drink",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Technical Reports Server 20240004245, Caffeine consumption aboard the International Space Station (2024 conference poster), https://ntrs.nasa.gov/citations/20240004245. Checked from a search summary only; findings are preliminary",
      "sourceUrls": [
        "https://ntrs.nasa.gov/citations/20240004245."
      ],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 15
    },
    {
      "id": "question-how-long-did-you-exercise-today",
      "name": "question-how-long-did-you-exercise-today",
      "text": "How long did you exercise today?",
      "topic": "Exercise",
      "answerType": "choice",
      "options": [
        "None",
        "Under 30 minutes",
        "30 to 60 minutes",
        "1 to 2 hours",
        "More than 2 hours"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "None for 3 days: remind about the exercise plan",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Science in Space: May 2024, Exercise (2024), https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ (research handoff source S13, action A10). The page says the ISS routine is not a universal prescription",
      "sourceUrls": [
        "https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 16
    },
    {
      "id": "question-how-alert-and-energetic-did-you-feel-today",
      "name": "question-how-alert-and-energetic-did-you-feel-today",
      "text": "How alert and energetic did you feel today?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "Very poor",
        "Poor",
        "Fair",
        "Good",
        "Very good"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: check sleep and activity, suggest light exercise",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Cognition Test Battery: Alertness and Mood Survey",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 17
    },
    {
      "id": "question-how-connected-did-you-feel-to-your-crew-and-family",
      "name": "question-how-connected-did-you-feel-to-your-crew-and-family",
      "text": "How connected did you feel to your crew and family?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "Very poor",
        "Poor",
        "Fair",
        "Good",
        "Very good"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: suggest a social activity such as a game with a crewmate",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Spaceflight Standard Measures: team cohesion",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 18
    },
    {
      "id": "question-were-you-able-to-contact-family-or-friends-on-earth-today",
      "name": "question-were-you-able-to-contact-family-or-friends-on-earth-today",
      "text": "Were you able to contact family or friends on Earth today?",
      "topic": "Mental health",
      "answerType": "boolean",
      "options": [
        "Yes",
        "No"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "No for 3 days: schedule a message or call with family or friends; tell the flight surgeon if mood is also low",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Houston, Do You Copy? HERA Crew Navigates Communication Delays (2022), https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/; NASA, Hazard 3: Distance (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/ (research handoff action A03)",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/houston-do-you-copy-hera-crew-navigates-communication-delays/",
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 19
    },
    {
      "id": "question-how-well-could-you-concentrate-on-your-tasks",
      "name": "question-how-well-could-you-concentrate-on-your-tasks",
      "text": "How well could you concentrate on your tasks?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "Very poor",
        "Poor",
        "Fair",
        "Good",
        "Very good"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: check sleep, suggest a short break routine",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA Cognition Test Battery: Alertness and Mood Survey",
      "sourceUrls": [],
      "evidenceStatus": "needs-review",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 20
    },
    {
      "id": "question-how-stressed-did-you-feel-today",
      "name": "question-how-stressed-did-you-feel-today",
      "text": "How stressed did you feel today?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "Extremely stressed",
        "Very stressed",
        "Moderately stressed",
        "Slightly stressed",
        "Not stressed"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: coping resources and human review (doc A02)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Human Research Program BMed Evidence Report (2016); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 21
    },
    {
      "id": "question-how-manageable-was-your-workload-today",
      "name": "question-how-manageable-was-your-workload-today",
      "text": "How manageable was your workload today?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "Overwhelming",
        "Very heavy",
        "Heavy but fine",
        "Manageable",
        "Well balanced"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower: protect breaks, keep tasks clear (doc A06)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Human Research Program BMed Evidence Report (2016); NASA, Handle With Care: HERA Inspects Samples (2022), https://www.nasa.gov/humans-in-space/handle-with-care-hera-crew-member-inspects-samples/; NASA, HERA Crew Member Stores Swabs (2022), https://www.nasa.gov/humans-in-space/hera-crew-member-stores-swabs-for-analyzing-microbes/; NASA, Breathing Easy: HERA Mock Environment (2022), https://www.nasa.gov/humans-in-space/breathing-easy-hera-crew-member-checks-status-of-mock-environment/",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/handle-with-care-hera-crew-member-inspects-samples/",
        "https://www.nasa.gov/humans-in-space/hera-crew-member-stores-swabs-for-analyzing-microbes/",
        "https://www.nasa.gov/humans-in-space/breathing-easy-hera-crew-member-checks-status-of-mock-environment/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 22
    },
    {
      "id": "question-how-much-time-did-you-spend-on-something-you-enjoy-today",
      "name": "question-how-much-time-did-you-spend-on-something-you-enjoy-today",
      "text": "How much time did you spend on something you enjoy today?",
      "topic": "Mental health",
      "answerType": "integer-scale",
      "options": [
        "None",
        "Very little",
        "Some",
        "Quite a lot",
        "A lot"
      ],
      "scaleMin": 1,
      "scaleMax": 5,
      "step": 1,
      "direction": "as-labeled",
      "interpretation": "2 or lower for 3 days: suggest a recreation activity (doc A04)",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Human Research Program BMed Evidence Report (2016); NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/; NASA, space gardening and Veggie crew survey (2021)",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 23
    },
    {
      "id": "question-did-the-cabin-air-feel-stuffy-or-uncomfortable-to-breathe-today",
      "name": "question-did-the-cabin-air-feel-stuffy-or-uncomfortable-to-breathe-today",
      "text": "Did the cabin air feel stuffy or uncomfortable to breathe today?",
      "topic": "Other",
      "answerType": "boolean",
      "options": [
        "Yes",
        "No"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Yes: follow the mission procedure for cabin air; contact the flight surgeon if you have symptoms",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Breathing Easy: HERA Mock Environment (2022), https://www.nasa.gov/humans-in-space/breathing-easy-hera-crew-member-checks-status-of-mock-environment/; NASA, Spacecraft Air Quality (2023), https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/; NASA, Risk of Reduced Crew Health and Performance Due to Hypoxia, https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/ (research handoff actions A08 and ACT-02). This is how it felt to you, not a measurement of the air",
      "sourceUrls": [
        "https://www.nasa.gov/humans-in-space/breathing-easy-hera-crew-member-checks-status-of-mock-environment/",
        "https://www.nasa.gov/missions/station/iss-research/science-in-space-august-4-2023-spacecraft-air-quality/",
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-reduced-crew-health-and-performance-due-to-hypoxia/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 24
    },
    {
      "id": "question-did-your-vision-seem-blurred-or-different-today",
      "name": "question-did-your-vision-seem-blurred-or-different-today",
      "text": "Did your vision seem blurred or different today?",
      "topic": "Other",
      "answerType": "boolean",
      "options": [
        "Yes",
        "No"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "Yes: do the visual acuity test in the Laboratory; contact the flight surgeon if it is sudden or comes with a severe headache",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": true,
      "source": "NASA, Risk of Spaceflight Associated Neuro-ocular Syndrome (SANS), https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ (11 Mar 2025); NASA, SANS risk reference, https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/",
      "sourceUrls": [
        "https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/",
        "https://www.nasa.gov/reference/risk-of-spaceflight-associated-neuro-ocular-syndrome-sans/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 25
    },
    {
      "id": "question-did-anything-affect-your-routine",
      "name": "question-did-anything-affect-your-routine",
      "text": "Did anything affect your routine?",
      "topic": "Other",
      "answerType": "multi-choice",
      "options": [
        "Workload",
        "Schedule change",
        "Noise / light",
        "Limited privacy",
        "Social connection",
        "Unusual day"
      ],
      "scaleMin": null,
      "scaleMax": null,
      "step": null,
      "direction": "as-labeled",
      "interpretation": "",
      "version": "workbook-daily-v1",
      "instrument": "team-adapted",
      "alertThreshold": null,
      "requiresRuleImplementation": false,
      "source": "NASA, Hazard 2: Isolation (2018), https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/ (research handoff actions A01 and A06). The list of factors is the team's own",
      "sourceUrls": [
        "https://www.nasa.gov/podcasts/houston-we-have-a-podcast/hazard-2-isolation/"
      ],
      "evidenceStatus": "source-linked",
      "sourceSheet": "6 Daily questions",
      "sourceRow": 26
    }
  ],
  "meta": {
    "schemaVersion": 2,
    "workbook": "docs/amigos-data-request.xlsx",
    "sha256": "4973cf86bf992472f69993a07837ba76c44fe311e2f19bfb694d25381308b1f5",
    "coverage": {
      "systems": {
        "imported": 10,
        "excludedExamples": 0,
        "status": "imported"
      },
      "tests": {
        "imported": 32,
        "excludedExamples": 0,
        "status": "imported"
      },
      "symptoms": {
        "imported": 45,
        "excludedExamples": 0,
        "status": "imported"
      },
      "recommendations": {
        "imported": 31,
        "excludedExamples": 0,
        "status": "imported"
      },
      "activities": {
        "imported": 16,
        "excludedExamples": 0,
        "status": "imported"
      },
      "questions": {
        "imported": 23,
        "excludedExamples": 0,
        "status": "imported"
      }
    },
    "matchingBasis": "Activity tags are preference categories, not validated clinical triggers.",
    "warnings": [
      "1 Body systems!E10: source needs review or a direct link",
      "2 Tests!L23: source needs review or a direct link",
      "2 Tests!L24: source needs review or a direct link",
      "2 Tests!L25: source needs review or a direct link",
      "2 Tests!L26: source needs review or a direct link",
      "2 Tests!L27: source needs review or a direct link",
      "3 Signs and symptoms!G25: source needs review or a direct link",
      "3 Signs and symptoms!G31: source needs review or a direct link",
      "3 Signs and symptoms!G32: source needs review or a direct link",
      "3 Signs and symptoms!G33: source needs review or a direct link",
      "3 Signs and symptoms!G34: source needs review or a direct link",
      "3 Signs and symptoms!G39: source needs review or a direct link",
      "3 Signs and symptoms!G40: source needs review or a direct link",
      "3 Signs and symptoms!G41: source needs review or a direct link",
      "3 Signs and symptoms!G43: source needs review or a direct link",
      "4 Recommendations!G28: source needs review or a direct link",
      "4 Recommendations!G33: source needs review or a direct link",
      "6 Daily questions!F7: source needs review or a direct link",
      "6 Daily questions!F11: source needs review or a direct link",
      "6 Daily questions!F13: source needs review or a direct link",
      "6 Daily questions!F14: source needs review or a direct link",
      "6 Daily questions!F15: source needs review or a direct link",
      "6 Daily questions!F17: source needs review or a direct link",
      "6 Daily questions!F18: source needs review or a direct link",
      "6 Daily questions!F20: source needs review or a direct link",
      "Recommendation user-reports-insufficient-sleep-or-a-worsening-sleep-duration-trend-proposed-no-validated-numeric-trigger: unresolved activity Relaxation routine",
      "Recommendation user-reports-poor-sleep-quality-or-repeated-nighttime-interruptions-proposed: unresolved activity Relaxation routine",
      "Recommendation light-dark-schedule-changes-or-irregular-work-shifts-are-recorded-proposed: unresolved activity Relaxation routine",
      "Recommendation user-reports-low-mood-or-a-downward-personal-mood-trend-proposed: unresolved activity Creative hobby",
      "Recommendation user-reports-fatigue-or-declining-energy-proposed: unresolved activity Relaxation routine",
      "Recommendation user-reports-fatigue-or-declining-energy-proposed: unresolved activity Light leisure",
      "Recommendation user-reports-difficulty-focusing-after-poor-sleep-or-high-workload-proposed: unresolved activity Short rest",
      "Recommendation user-reports-boredom-or-low-engagement-with-daily-routines-proposed: unresolved activity Creative hobby",
      "Recommendation a-crewmember-wants-an-optional-hobby-or-plant-care-task-user-choice: unresolved activity Creative hobby",
      "Recommendation self-reported-excessive-workload-or-missed-scheduled-breaks-proposed: unresolved activity Short rest",
      "Recommendation user-reports-reduced-appetite-or-low-meal-acceptance-proposed: unresolved activity Meal reflection",
      "Recommendation repeated-low-ratings-for-the-same-meal-proposed: unresolved activity Meal reflection",
      "Recommendation user-misses-a-scheduled-approved-workout-schedule-event: unresolved activity Approved exercise session",
      "Recommendation user-completes-an-exercise-session-logging-event: unresolved activity Approved exercise session",
      "Recommendation user-reports-elevated-stress-with-disrupted-sleep-proposed: unresolved activity Relaxation routine",
      "Recommendation user-opts-to-log-symptoms-such-as-rash-or-signs-of-infection-reported-event: unresolved activity Symptom journaling",
      "Recommendation astronaut-reports-dizziness-during-post-flight-gravity-readaptation-reported-event: unresolved activity Symptom journaling",
      "Recommendation crew-member-opens-environmental-status-panel-or-an-approved-alert-is-active-operational-event: unresolved activity Safety checklist review",
      "Recommendation mission-control-issues-a-verified-space-weather-radiation-advisory-operational-event: unresolved activity Safety checklist review",
      "Recommendation new-validated-radiation-measurement-is-received-data-event: unresolved activity Radiation log review",
      "Recommendation assigned-cabin-water-quality-maintenance-check-becomes-due-schedule-event: unresolved activity Safety checklist review"
    ],
    "questionnaireIntegration": "Use dailyQuestions with each item's answerType and scale metadata; legacy questions are retained for the existing UI."
  }
};
  data.research = research;
  data.systems = research.systems;
  data.activities = research.activities;
  data.dailyQuestions = research.questions;
  // Legacy medical collections and 1-5 questions are still used by the current UI.
  // Their owners migrate against research.tests/symptoms/recommendations and dailyQuestions.
  data.legacyQuestionnaire = { version: 'amigos-routine-v1', scaleMin: 1, scaleMax: 5 };
  // END WORKBOOK RESEARCH

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
