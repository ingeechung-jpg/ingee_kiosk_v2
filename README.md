# ingee_kiosk_V2

Raw-content sync pipeline for the kiosk site.

Role labels:
- `[PUBLIC]` committed source that affects the deployed kiosk site
- `[LOCAL]` local-only tools used to edit or preview, excluded from deploy
- `[BUILD]` disposable output generated locally or in CI

Structure:
- `[PUBLIC] raw/docs` -> exported Google Docs as `.docx`
- `[PUBLIC] raw/sheets` -> exported Google Sheets as `.csv`
- `[PUBLIC] raw/md` -> committed note markdown generated from `raw/docs`
- `[PUBLIC] scripts` -> conversion scripts and Apps Script source
- `[PUBLIC] site/web` -> static site source
- `[BUILD] build` -> local build output only
- `.content-index.json` -> incremental build hashes

Background studio map:
- `[PUBLIC] site/web/data/background.json` -> live kiosk background + UI tone config
- `[PUBLIC] site/web/js/background-engine.js` -> shared renderer used by the kiosk
- `[PUBLIC] site/web/js/app.js` -> reads `background.json` and applies CSS variables
- `[LOCAL] site/web/background-studio.html` -> local-only editor page
- `[LOCAL] site/web/js/background-studio.js` -> studio UI logic
- `[LOCAL] site/web/css/background-studio.css` -> studio UI styles
- `[LOCAL] scripts/studio-server.js` -> local server that edits `background.json`

Workflow:
1. Apps Script pushes raw files only:
   - Docs -> `raw/docs`
   - Sheets -> `raw/sheets`
2. GitHub Action regenerates `raw/md` when `raw/docs` or `raw/sheets` changes.
3. Local or CI build runs:
   - `npm install`
   - `npm run build:ci`
4. Site reads JSON from `build/site/data/raw/*.json` and note markdown from `build/site/data/raw/md/*.md`.

Notes:
- `raw/` is the source of truth.
- `build/` is disposable and not committed.
- `raw/md` is committed because the static site reads markdown directly.
- No derived `dashboard.json` or `sections/*.json` files are generated anymore.
- Cloudflare deploy workflow was removed; only the raw markdown workflow remains.
- Background editing is done locally with `npm run studio`; commit only the resulting source changes you want to keep.
