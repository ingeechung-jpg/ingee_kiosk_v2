# ingee_kiosk_V2

Raw-content sync pipeline for the kiosk site.

Structure:
- `raw/docs` -> exported Google Docs as `.docx`
- `raw/sheets` -> exported Google Sheets as `.csv`
- `raw/md` -> committed note markdown generated from `raw/docs`
- `scripts` -> conversion scripts and Apps Script source
- `site/web` -> static site source
- `build` -> local build output only
- `.content-index.json` -> incremental build hashes

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
- Cloudflare deploy workflow was removed; only the raw markdown workflow remains.
