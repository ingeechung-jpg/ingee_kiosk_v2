# ingee_kiosk_V2

Raw-content sync pipeline.

Structure:
- raw/
  - docs/        raw Google Docs (.docx)
  - sheets/      raw Google Sheets (.csv)
- scripts/       conversion + Apps Script
- site/web/      static site source
- build/         generated outputs (not committed)
- .content-index.json

Workflow:
1) Apps Script pushes raw files only:
   - Docs -> raw/docs
   - Sheets -> raw/sheets
2) Run local build:
   - `npm install`
   - `npm run build:content`
   - `npm run build:site`
   - CI/CD: `npm run build:ci` (build site, then remove build/content)
3) Build outputs:
   - Markdown: build/content/*.md
   - JSON: build/data/** (raw + sections + dashboard)
4) Site build consumes build/content + build/data and deploys static site.

Notes:
- `raw/` is the single source of truth.
- `.content-index.json` tracks hashes for incremental builds.
- Generated files live only under `build/` and are not committed.

CI/CD (GitHub Actions -> Cloudflare Pages):
- Set GitHub secrets:
  - `CF_PAGES_API_TOKEN`
  - `CF_ACCOUNT_ID`
  - `CF_PAGES_PROJECT`
- Workflow: `.github/workflows/pages-deploy.yml`
