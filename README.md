# AMIGOS - Dark sky-blue check-in

HTML, CSS, and vanilla JavaScript. No build step or API keys.

## Run
From this folder: python -m http.server 8000
Open http://localhost:8000

## Files
- index.html: markup for every view
- css/style.css: dark navy and sky-blue theme, responsive layouts
- css/medical.css: styles for the Laboratory, Assessment and shared additions
- js/data.js: all content (placeholder values) and the selected crew member
- js/app.js: Daily check-in steps, validation, journal, streak and export
- js/medical.js: Laboratory and Assessment views, charts and recommendations

## Views
- Daily check-in: sleep, food and water, a mental health questionnaire on 1-5
  scales, and activity. Shows a streak and suggested activities.
- My journal: saved check-ins for the selected crew member.
- Laboratory: every test, with a tick box for tests the vehicle does not carry,
  and a signs-and-symptoms checklist that decides between self-care, running
  tests, or contacting the flight surgeon now.
- Assessment: body systems figure, percent circles (below red, normal green,
  over orange), a chosen period of 7, 30 or 90 days, one chart combining daily
  routine and lab tests, recommendations, and a case summary export.
- The crew selector in the top bar applies to every view.

## Data
- js/data.js holds all content: hazards, body systems, tests, symptoms,
  activities, daily questions and sample crew. Its values are placeholders.
- docs/amigos-data-request.xlsx has the same structure for the research team.
- Check-ins use the amigos-routine-v1 key; lab results, symptoms, unticked tests
  and the period use amigos-medical-v1; the selected crew member uses
  amigos-crew-v1. Nothing leaves the browser.
- Statuses compare results with general references; they are not a diagnosis.
