# Shared data handoff

Run `python scripts/import_research.py` after replacing the workbook with the
consolidated version. Use `python scripts/import_research.py --check` to validate
without writing. No Python packages are required. Only the generated block in
`js/data.js` is updated. Do not edit that block manually.

## Ownership

| Owner | Files / responsibility |
| --- | --- |
| Fawzy | `js/data.js`, importer, shared shell and integration |
| Daily owner | `js/app.js`, `#checkin-view`, `#history-view` |
| Medical owner | `js/medical.js`, `#medical-view`, `css/medical.css` |
| Delivery owner | Demo, slides, video, acceptance checks |

Two integration fixes are already applied to the UI files: activity duration
displays `MISSION PLAN` when null, and body markers support metabolic/balance
systems without generating missing SVG paths. Keep these fixes when merging.

## Data available now

| Collection | API | Current workbook import |
| --- | --- | --- |
| Body systems | `AMIGOS.data.systems` | 10 rows, applied to current UI |
| Activities | `AMIGOS.data.activities` | 16 rows, applied to current UI |
| Workbook daily questions | `AMIGOS.data.dailyQuestions` | 23 rows, ready for Daily owner |
| Workbook tests | `AMIGOS.data.research.tests` | 32 rows, ready for Medical owner |
| Workbook symptoms | `AMIGOS.data.research.symptoms` | 45 rows, ready for Medical owner |
| Workbook recommendations | `AMIGOS.data.research.recommendations` | 31 rows, ready for Medical owner |

`AMIGOS.data.research.meta.coverage` is authoritative for imported counts and
excluded examples. Existing `data.tests`, `data.symptoms` and `data.questions`
remain legacy/demo collections for compatibility. `placeholder` remains true.
They must not be described as the completed workbook integration. Imported rows
are source material, not independently clinically validated rules. Check
`research.meta.warnings`, per-row `evidenceStatus`, `unresolvedTestNames` and
`unresolvedActivityNames`. `source-linked` means a URL exists, not that its claims
have been verified. Crew profiles
remain fictional demonstration profiles.

## Stable system IDs

| Workbook name | ID |
| --- | --- |
| Brain and behaviour | `brain` |
| Eyes | `eyes` |
| Lungs | `lungs` |
| Heart and circulation | `heart` |
| Blood and lymph (immune) | `blood` |
| Body fluids and kidneys | `fluids` |
| Muscle and bone | `muscle` |
| Metabolic and endocrine | `metabolic` |
| Balance and vestibular | `balance` |
| Brain and spinal fluid | `brain-and-spinal-fluid` |

Systems have `id`, `name`, `mark`, `hazards`, `routine`, `explain`, `risks`,
`source`, `sourceUrls`, `sourceSheet`, `sourceRow`. Hazards use the existing keys:
`radiation`, `isolation`, `distance`, `gravity`, `environment`.

Activities have `id`, `name`, `type`, `minutes`, `durationBasis`, `goodFor`,
`purpose`, `how` and provenance. `minutes: null` means mission-plan-defined,
never zero. `purpose` preserves workbook wording; `goodFor` is an explicit
app category mapping, not evidence for clinical thresholds.

## Daily questionnaire migration

Use `data.dailyQuestions`, not legacy `data.questions`. **The newly consolidated
workbook differs from the earlier seven-item 0–10 draft:** it currently contains
23 questions, including 1–5 scales, choices, Yes/No and a multiple-choice item.
The importer preserves that content and does not silently substitute scales or
activate thresholds written in prose. The Daily owner must resolve the final
questionnaire choice with the team before migration. Existing saved data stays
unchanged.

Questions lacking an explicit ID get `question-<slug-of-prompt>`. Preserve those
IDs if wording is edited later by adding an explicit identifier to the workbook
and extending the importer deliberately. The earlier eight-column schema, when
used, supports its explicit IDs:

`sleepHours`, `sleepQualityAMS`, `happinessAMS`, `stressAMS`,
`physicalExhaustionAMS`, `lonelinessAMS`, `mentalFatigueAMS`.

Each question includes `id`, `name`, `text`, `topic`, `answerType`, `unit`,
`scaleMin`, `scaleMax`, `step`, `anchors`, `direction`, `recall`,
`interpretation`, `instrument`, `version`, `alertThreshold` and provenance.

- Render each item's `answerType`, `options`, `scaleMin` and `scaleMax`.
- `integer-scale`, `choice`, `multi-choice`, `boolean` and `number` are distinct.
- For the earlier 0–10 schema only: use its documented anchors at 0, 5 and 10,
  and its explicit direction. Do not apply those semantics to 1–5 workbook items.
- Accept 0 as answered. Do not validate with a truthiness check.
- Keep old 1–5 records separate. Save the new version and scale metadata.
- Do not apply the old low-score activity trigger to these new scales.
- Leave symptom-severity controls unchanged; they are a separate scale.
- Do not generate a composite mental-health percentage or alert thresholds.
- `data.questions` stays legacy until the Daily owner migrates form saving,
  editing, journal display and all downstream consumers together.

## Medical migration

Reviewed tests use `referenceLow`, `referenceHigh`, `rangeAppliesTo`, `unit`,
`steps`, `availableIn`, `frequency`, `inputType`, `system` and provenance.
Blank reference limits stay null, including one-sided ranges. Preserve the
population/measurement context. The importer does not certify device availability.

Symptoms have `system`, `urgency` (`self`/`tests`/`now`), `tests`,
`becomesUrgentWhen`, `hazards` and provenance. Linked tests must exist in the
imported workbook. Unresolved links remain in `unresolvedTestNames` and generate
warnings; they are never silently connected to an unrelated test. Unknown body
systems and invalid numeric ranges stop import before writing.

Recommendations have `triggerText`, `usesDataFrom`, `action`, `mentalApproach`,
`activityIds`, `escalation`, `rule: null`, `requiresRuleImplementation: true`
and provenance. Human-written triggers are not automatically executable rules.
The Medical owner must implement and verify documented rules, preserving their
conditions and duration. Do not infer thresholds from free text.

## Shared HTML and state contract

Keep navigation values `checkin`, `history`, `lab`, `assess`; section IDs
`checkin-view`, `history-view`, `medical-view`; shared `crew-select`,
`header-view`, `toast`. Keep script order: data.js, app.js, medical.js.

Keep `AMIGOS.crewId()`, `AMIGOS.crew()`, `AMIGOS.setCrew(id)` and events
`amigos:crew`, `amigos:view`. Existing storage keys remain unchanged.
Medical currently depends on `records`, `showToast`, `localDate`, `setView`
from app.js. Coordinate changes to those names.

## Merge / acceptance

Current import reports 46 review notes: 25 source-review notes and 21 references
to activity names not present verbatim in sheet 5. All symptom-to-test references
resolve. The nine distinct unmatched activity names are:

`Approved exercise session`, `Creative hobby`, `Light leisure`, `Meal reflection`,
`Radiation log review`, `Relaxation routine`, `Safety checklist review`,
`Short rest`, `Symptom journaling`.

Decide explicitly whether to add those activities, point the recommendation to
an existing equivalent, or keep it as an instruction rather than an activity.
The importer preserves the original wording. It does not invent new activity
records or hide missing links.

Validation completed: JavaScript syntax, collection IDs and cross-references,
typed/blank durations, repeated-import consistency, invalid range/system guards.
Browser smoke verification could not run in the current environment; the four
views still require a manual browser acceptance check.

Import twice: the second import should produce no further changes. Example rows
are excluded only when their name/source starts with EXAMPLE; a legitimate
activity mentioning an example duration is retained.
Check Daily, Journal, Laboratory and Assessment; switch crew; reload saved
entries; check null durations, 0 answers and missing medical results. Verify
coverage after importing the final consolidated workbook. Do not overwrite the
Excel file while another member is editing it.
