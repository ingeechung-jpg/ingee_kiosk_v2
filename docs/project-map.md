# Project Map

Use these labels when deciding what to edit and what to commit.

## Labels
- `[PUBLIC]` shipped with the kiosk site
- `[LOCAL]` used only on your machine for editing or preview
- `[BUILD]` generated output, safe to delete and never commit

## Background workflow
- `[PUBLIC] site/web/data/background.json`
  - Single source of truth for the live background and kiosk tone controls
- `[PUBLIC] site/web/js/background-engine.js`
  - Shared renderer that the kiosk page uses in production
- `[PUBLIC] site/web/js/app.js`
  - Loads `background.json` and maps theme values into CSS variables
- `[PUBLIC] site/web/css/style.css`
  - Final kiosk styles
- `[LOCAL] site/web/background-studio.html`
  - Local editor UI
- `[LOCAL] site/web/js/background-studio.js`
  - Local editor logic
- `[LOCAL] site/web/css/background-studio.css`
  - Local editor styles
- `[LOCAL] scripts/studio-server.js`
  - Local server for saving `background.json`
- `[BUILD] build/site`
  - Local build output

## Commit rule of thumb
- Background look changes only: commit `background.json`
- Kiosk rendering logic changes: commit `background-engine.js`, `app.js`, and any related CSS
- Local studio UX changes: commit the studio files only if you want to keep the editor improvements
- Never commit `build/`
