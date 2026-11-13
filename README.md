# AMIGOS - Dark sky-blue check-in

HTML, CSS, and vanilla JavaScript. No build step or API keys.

## Run
From this folder: python -m http.server 8000
Open http://localhost:8000

## Files
- index.html: accessible three-step check-in and journal
- css/style.css: dark navy and sky-blue theme, responsive layouts
- js/app.js: step navigation, validation, browser storage, editing, and export

## Behavior
Sleep and mood are required. Habits and context are optional. Missing optional
measurements are stored as null, not zero. Stress and tiredness require an
intentional answer. The existing amigos-routine-v1 storage key is retained.
Entries stay in the browser for the same origin. They do not sync or diagnose
conditions. Export JSON for backup. No JSON import is implemented.

## Medical view
- css/medical.css and js/medical.js add the Medical view; index.html holds its markup.
- Crew profiles, device readings and tests are sample data defined in js/medical.js.
- Readings and symptoms you add are stored under the amigos-medical-v1 key.
- Statuses compare readings with general healthy-adult references (sources shown on
  each card). Mission-approved alert limits are not bundled: fill MISSION_LIMITS.
- Recommendations come from a prototype rule set that is not mission-approved.
- The routine journal is linked to the crew member marked journalOwner.
