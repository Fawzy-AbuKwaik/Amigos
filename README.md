# AMIGOS | Crew Wellbeing

**A little reflection. A clearer tomorrow.**

AMIGOS is a browser-based prototype that brings daily wellbeing check-ins,
laboratory measurements, and symptom logs into one place for a selected crew
member. Built by Team Amigos for the NASA Space Apps Challenge, it explores
how routines and health information can support conversations with the mission
medical team.

Built with **HTML, CSS, and vanilla JavaScript**. No backend, API keys, package
installation, or build step is required.

> Educational decision-support prototype. AMIGOS does not diagnose conditions,
> prescribe treatment, or replace the flight surgeon. Crew profiles are fictional,
> and recommendation rules are not a mission-approved medical protocol.

## Quick start

From the project folder, start a local server:

```powershell
cd C:\Amigos
python -m http.server 8000 --bind 127.0.0.1
```

Open **[http://127.0.0.1:8000](http://127.0.0.1:8000)** in a modern browser.
Keep the terminal running; press `Ctrl+C` to stop the server.

Use the same browser and address when returning to saved entries. Localhost
storage is separate from storage on the GitHub Pages site.

## Features

| View | What it provides |
| --- | --- |
| **Daily check-in** | Four steps covering sleep, food and water, mind and mood, and optional activity/context. Includes validation, a check-in streak, and activity suggestions. |
| **My journal** | One check-in per person per calendar date; review, edit, delete, and filter check-ins by mission phase; export the selected crew member's check-ins as JSON. |
| **Laboratory** | Select tests for automatic assessment, enter or edit measurements, import ECG/ultrasound files, and log symptoms with severity and time. |
| **Assessment** | Explore body systems and trends over 7, 30, or 90 days; view recommendations, related indicators, and a case summary for export as text. |

The shared crew selector applies across all views. Recommendations appear in
both the Daily check-in and Assessment.

### How answers and charts are presented

- **Sleep:** displays the selected duration category. Categories below 7 hours
  are labelled `Below`, 7-9 hours `Normal`, and more than 9 hours `Over`, relative
  to the app's adult reference. These labels are not diagnoses.
- **Water and exercise:** display the selected categories as `Recorded`.
  The app does not infer hydration status or exercise adequacy from them.
- **Mind & mood:** shows a descriptive mean of compatible 1-5 answers.
  It is not a validated clinical score or diagnostic cutoff.
- **Category answers:** appear as labels and history tables. Their numeric
  representatives are not plotted as exact measurements or averaged.
- **Measurement charts:** show values in their own units. Rings show position
  relative to an available reference, rather than a health percentage.
- **Recording activity:** counts laboratory measurements and daily check-ins.
  It does not combine unrelated measurements into an overall health score.
- **Demonstration mode:** is off by default. Enabling it shows sample measurements
  and symptoms separately from personal measurements. Routine check-ins remain
  personal, and an on-screen notice identifies this mode.

### Saving readings and choosing tests

In Laboratory, use **Tests** when you know which measurement to record, or
**Signs & symptoms** for suggested checks. Filter tests by Daily, Weekly,
Monthly, or All tests. These are display filters, not prescriptions.

- Save a new measurement with **Save reading**. The current measurement time is
  captured when saving unless a different time is explicitly entered.
- Correct a recorded numeric value using **Recent readings > Edit > Update reading**.
  This updates the same record. Assessment uses the most recent measurement time;
  entering an older measurement does not replace a newer one.
- A checked test participates in automatic assessment. Unticked tests remain
  recordable in Laboratory but are excluded from Assessment and recommendations.
- Tests without interpretation rules have a disabled checkbox and a **Record only**
  label. Their stored values/files are available for review without automatic interpretation.
- Demonstration mode shows sample results and blocks personal measurement saves.
  Switch it off before entering personal readings.
- Daily check-ins allow one entry per person per date across mission phases.
  Correct that entry from **My journal > Edit**.

### Additional clinical indicators

- **Heart:** echocardiogram file import, alongside ECG and existing measurements.
- **Kidneys:** serum creatinine (mg/dL), laboratory-reported eGFR
  (mL/min/1.73 m2), and urine albumin-to-creatinine ratio (mg/g).
- **Endocrine:** TSH (mIU/L), free T4 (ng/dL), and blood cortisol (ug/dL).
  Enter the actual collection time, especially for cortisol.
- **Brain and cerebrospinal fluid:** specialist MRI reports, OCT (also linked
  to the eye system), jugular venous ultrasound, and research-only CCFP reports.
  These are reviewed reports/indirect indicators, not direct CSF pressure
  measurements. Invasive pressure measurement and spinal fluid sampling are not
  offered through routine app flows.

New numeric indicators are recorded without automatic clinical reference bands.
Use the stated units and the laboratory's own reference interval; the app does
not diagnose kidney, endocrine, or neurological conditions from these entries.
Examination schedules must be confirmed by the medical
team; the new tests appear under **All tests**, rather than a fixed daily/monthly
schedule.

Report imports accept PNG, JPG/JPEG, PDF, MP4, and WebM unless a test's file picker
specifies a narrower list. Raw DICOM files are not supported. Export a supported
image/video or clinical report from the source system instead.

Reference context: [NIDDK kidney laboratory evaluation](https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation),
[MedlinePlus thyroid tests](https://medlineplus.gov/ency/article/003444.htm),
[MedlinePlus cortisol test](https://medlineplus.gov/lab-tests/cortisol-test/),
[NHLBI heart tests](https://www.nhlbi.nih.gov/health/heart-tests), and
[NASA Fluid Shifts](https://www.nasa.gov/humans-in-space/nasa-fluid-shifts-study-advances-journey-to-mars/).

## Research data and integration status

The consolidated workbook is
[`docs/amigos-data-request.xlsx`](docs/amigos-data-request.xlsx).
Imported content is stored in `AMIGOS.data.research` inside `js/data.js`.

**Workbook import and UI integration are separate steps.** The current mapping is:

| Collection | Workbook rows | Current use |
| --- | ---: | --- |
| Body systems | 10 | Applied through `data.systems`. |
| Activities | 16 | Applied through `data.activities`. |
| Daily questions | 23 | Available in `data.dailyQuestions`; the UI uses 20 questions in `data.questions`. |
| Tests | 32 | Available in `data.research.tests`; the UI uses 24 tests in `data.tests`, including the additional clinical-report indicators. |
| Symptoms | 45 | Available in `data.research.symptoms`; the UI uses 35 symptoms in `data.symptoms`. |
| Recommendations | 31 | Available as research source material; executable UI rules are implemented separately. |

Imported links do not establish clinical validation. Some research rows still
require source review or resolution of activity references. Inspect
`AMIGOS.data.research.meta.coverage` and `.warnings` for import details.
Ranges explicitly marked `PLACEHOLDER` are excluded from automatic classification.

After updating the workbook, validate it before regenerating the data block:

```powershell
python scripts/import_research.py --check
python scripts/import_research.py
```

The importer uses Python's standard library. It updates only the generated
workbook block in `js/data.js`; do not edit that block manually. Human-written
recommendation triggers are preserved as source material and are not
automatically converted into medical rules.

See [`docs/DATA_HANDOFF.md`](docs/DATA_HANDOFF.md) for schemas, shared integration
contracts, unresolved references, and migration responsibilities.

## Storage and privacy

Check-in records and measurement metadata are stored in the current browser's `localStorage`:

| Storage key | Contents |
| --- | --- |
| `amigos-routine-v1` | Daily check-in records. |
| `amigos-medical-v1` | Measurements, symptoms, test availability, and assessment period. |
| `amigos-crew-v1` | Selected crew member. |

ECG accepts PNG, JPG/JPEG, PDF, MP4, and WebM files; eye ultrasound accepts PNG,
JPG/JPEG, MP4, and WebM. Files are limited to 25 MB each, stored locally in the
`amigos-files-v1` IndexedDB database, and can be reopened from recent readings.
The text case summary lists file names but does not bundle the attached files.
Radiation dose has been removed from the active test catalog; original research
workbook content and any earlier stored records are preserved.

There is no account system, backend upload, or cross-device sync. Export creates
a file for the user to share separately; the app does not send it to a medical
team. External evidence links open their source websites.

People sharing a browser profile can access saved entries. Clearing site data
removes local records. Use fictional data for demonstrations and export a backup
before clearing data or changing the hosting address.

## Project structure

| Path | Responsibility |
| --- | --- |
| `index.html` | Shared layout, navigation, and view containers. |
| `css/style.css` | Main theme and responsive layout. |
| `css/medical.css` | Laboratory and Assessment styling. |
| `js/data.js` | Shared content, research import, reference sources, and crew selection. |
| `js/app.js` | Check-in form, validation, journal, activity suggestions, and JSON export. |
| `js/medical.js` | Measurements, symptoms, assessment, charts, recommendations, and case summary. |
| `scripts/import_research.py` | Workbook validation and import. |
| `scripts/test-app.cjs` | Check-in logic regression checks. |
| `scripts/test-medical.cjs` | Assessment and medical module regression checks. |
| `docs/DATA_HANDOFF.md` | Data contract and migration notes. |
| `docs/REVIEW_CHANGES.md` | Recent changes, validation results, and known limitations. |

## Checks

Node.js is needed for JavaScript regression checks; Python is needed for workbook
validation. Neither requires project package installation.

```powershell
node scripts/test-app.cjs
node scripts/test-medical.cjs
python scripts/import_research.py --check
git diff --check
```

Checks cover scale handling, category display, missing values, recommendations,
crew isolation, demo separation, rendering, and persistence. Medical checks use
an in-memory DOM and storage; they do not replace browser testing or clinical
review.

Before delivery, also check navigation, save/edit/delete, crew switching,
laboratory entry, symptom escalation, demo mode, exports, and mobile layouts in
the browser. Report download was not confirmed in the latest browser review
because download permission was denied.

## GitHub Pages

Host the static files from the repository root, with `index.html` as the entry
point. No build command is needed. Preserve the relative `css/` and `js/` paths
when deploying under the repository's project URL.

Repository: [Fawzy-AbuKwaik/Amigos](https://github.com/Fawzy-AbuKwaik/Amigos).

## Team integration notes

- Preserve script order: `data.js`, then `app.js`, then `medical.js`.
- Keep `AMIGOS.crewId()`, `AMIGOS.crew()`, `AMIGOS.setCrew(id)`, and the
  `amigos:crew` and `amigos:view` events consistent across modules.
- Coordinate changes to `records`, `showToast`, `localDate`, and `setView`:
  the medical module depends on these helpers from `app.js`.
- Preserve existing storage keys and saved-answer semantics when merging changes.
- Validate the workbook, run regression checks, and review affected views before
  merging a feature branch.
